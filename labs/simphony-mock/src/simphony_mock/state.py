from copy import deepcopy
from datetime import datetime, timezone
from decimal import Decimal
from uuid import NAMESPACE_URL, uuid5

from .fixtures import MENU_ITEM_BY_ID
from .schemas import CheckMenuItem, CheckRequest, CheckResponse, CheckTotals


class UnknownMenuItemError(ValueError):
    pass


class SimphonyState:
    def __init__(self, *, connected: bool = True) -> None:
        self.connected = connected
        self.checks: dict[str, CheckResponse] = {}
        self.idempotent_responses: dict[str, CheckResponse] = {}
        self.next_check_number = 1000

    def reset(self, *, connected: bool = True) -> None:
        self.connected = connected
        self.checks.clear()
        self.idempotent_responses.clear()
        self.next_check_number = 1000

    def calculate(self, request: CheckRequest) -> CheckResponse:
        response_items: list[CheckMenuItem] = []
        subtotal = Decimal("0.00")

        for requested in request.menu_items:
            configured = MENU_ITEM_BY_ID.get(requested.menu_item_id)
            if configured is None:
                raise UnknownMenuItemError(str(requested.menu_item_id))

            definition = configured.definitions[0]
            unit_price = definition.prices[0].price
            total = (unit_price * requested.quantity).quantize(Decimal("0.01"))
            subtotal += total
            response_items.append(
                requested.model_copy(
                    update={
                        "name": configured.name["es-ES"],
                        "unit_price": unit_price,
                        "total": total,
                    }
                )
            )

        subtotal = subtotal.quantize(Decimal("0.01"))
        return CheckResponse(
            header=request.header.model_copy(update={"status": "open"}),
            menu_items=response_items,
            totals=CheckTotals(subtotal=subtotal, total_due=subtotal),
        )

    def create(self, request: CheckRequest, *, detect_duplicates: bool) -> CheckResponse:
        idempotency_id = request.header.idempotency_id
        if detect_duplicates and idempotency_id in self.idempotent_responses:
            cached = deepcopy(self.idempotent_responses[idempotency_id])
            cached.header.is_cached_response = True
            return cached

        calculated = self.calculate(request)
        check_ref = uuid5(NAMESPACE_URL, f"poma-simphony:{idempotency_id}").hex
        created = calculated.model_copy(
            update={
                "header": calculated.header.model_copy(
                    update={
                        "check_ref": check_ref,
                        "check_number": self.next_check_number,
                        "open_time": datetime.now(timezone.utc),
                        "status": "open",
                        "preparation_status": "Submitted",
                    }
                )
            }
        )
        self.next_check_number += 1
        self.checks[check_ref] = deepcopy(created)
        if detect_duplicates:
            self.idempotent_responses[idempotency_id] = deepcopy(created)
        return created

    def get(self, check_ref: str) -> CheckResponse | None:
        check = self.checks.get(check_ref)
        return deepcopy(check) if check else None
