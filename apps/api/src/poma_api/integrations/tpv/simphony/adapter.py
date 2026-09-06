from decimal import ROUND_HALF_UP, Decimal

from poma_api.domain.exceptions import TpvContractError
from poma_api.domain.models import (
    ExternalOrder,
    OrderDraft,
    OrderLine,
    OrderTotals,
    TpvCatalog,
    TpvCatalogItem,
)
from poma_api.integrations.tpv.base import TPVAdapter

from .client import SimphonyClient
from .schemas import SimphonyCheckHeader, SimphonyCheckMenuItem, SimphonyCheckRequest


def translated(values: dict[str, str], locale: str = "es-ES") -> str:
    if locale in values:
        return values[locale]
    if values:
        return next(iter(values.values()))
    return ""


def to_cents(value: Decimal) -> int:
    return int((value * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


class OracleSimphonyAdapter(TPVAdapter):
    def __init__(
        self,
        *,
        client: SimphonyClient,
        check_employee_ref: int,
        order_type_ref: int,
    ) -> None:
        self._client = client
        self._check_employee_ref = check_employee_ref
        self._order_type_ref = order_type_ref

    async def aclose(self) -> None:
        await self._client.aclose()

    async def healthcheck(self) -> bool:
        try:
            return await self._client.connection_status()
        except Exception:
            return False

    async def _currency(self) -> str:
        locations = await self._client.locations()
        location = next(
            (item for item in locations.items if item.loc_ref == self._client.loc_ref),
            None,
        )
        if location is None:
            raise TpvContractError("Configured Simphony location is missing.")
        return location.currency

    async def get_catalog(self) -> TpvCatalog:
        summaries = await self._client.menu_summary()
        if not summaries.items:
            raise TpvContractError("Simphony has no menus for the configured revenue center.")
        menu = await self._client.menu(summaries.items[0].menu_id)
        currency = await self._currency()
        group_names = {
            group.family_group_item_id: translated(group.consumer_name or group.name)
            for group in menu.family_groups
        }
        return TpvCatalog(
            external_menu_id=menu.menu_id,
            name=menu.name,
            currency_code=currency,
            items=[
                TpvCatalogItem(
                    external_item_id=str(item.menu_item_id),
                    name=translated(item.name),
                    category=group_names.get(item.family_group_ref, "Sin categoría"),
                    price_cents=to_cents(item.definitions[0].prices[0].price),
                )
                for item in menu.menu_items
            ],
        )

    def _request(self, order: OrderDraft) -> SimphonyCheckRequest:
        try:
            menu_items = [
                SimphonyCheckMenuItem(
                    menu_item_id=int(item.external_item_id),
                    quantity=Decimal(item.quantity),
                )
                for item in order.items
            ]
        except ValueError as error:
            raise TpvContractError("Simphony item identifiers must be numeric.") from error
        return SimphonyCheckRequest(
            header=SimphonyCheckHeader(
                org_short_name=self._client.org_short_name,
                loc_ref=self._client.loc_ref,
                rvc_ref=self._client.rvc_ref,
                idempotency_id=order.idempotency_id,
                check_employee_ref=self._check_employee_ref,
                order_type_ref=self._order_type_ref,
                check_name=f"POMA {order.table_name}"[:20],
                table_name=order.table_name,
                guest_count=order.guest_count,
            ),
            menu_items=menu_items,
        )

    async def calculate_order(self, order: OrderDraft) -> ExternalOrder:
        response = await self._client.calculate(self._request(order))
        return await self._translate_order(response)

    async def create_order(self, order: OrderDraft) -> ExternalOrder:
        response = await self._client.create(self._request(order))
        return await self._translate_order(response)

    async def get_order(self, external_order_id: str) -> ExternalOrder:
        response = await self._client.get_check(external_order_id)
        return await self._translate_order(response)

    async def _translate_order(self, response) -> ExternalOrder:
        totals = response.totals
        return ExternalOrder(
            external_order_id=response.header.check_ref,
            idempotency_id=response.header.idempotency_id,
            status=response.header.status or "calculated",
            preparation_status=response.header.preparation_status,
            table_name=response.header.table_name,
            items=[
                OrderLine(
                    external_item_id=str(item.menu_item_id),
                    quantity=int(item.quantity),
                )
                for item in response.menu_items
            ],
            totals=OrderTotals(
                subtotal_cents=to_cents(totals.subtotal),
                discount_cents=to_cents(totals.discount_total),
                service_charge_cents=to_cents(
                    totals.auto_service_charge_total + totals.service_charge_total
                ),
                tax_cents=to_cents(totals.tax_total),
                paid_cents=to_cents(totals.payment_total),
                total_due_cents=to_cents(totals.total_due),
                currency_code=await self._currency(),
            ),
            cached_response=bool(response.header.is_cached_response),
        )
