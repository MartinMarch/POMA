import os
import sys
from pathlib import Path

import httpx
import pytest
import pytest_asyncio
from pydantic import SecretStr

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPOSITORY_ROOT / "labs" / "simphony-mock" / "src"))

os.environ.setdefault("SUPABASE_URL", "http://supabase.test")
os.environ.setdefault("SUPABASE_PUBLISHABLE_KEY", "test-publishable-key")
os.environ.setdefault("SIMPHONY_BASE_URL", "http://simphony.test")
os.environ.setdefault("SIMPHONY_TOKEN", "test-token")
os.environ.setdefault("SIMPHONY_ORG_SHORT_NAME", "POMALAB")
os.environ.setdefault("SIMPHONY_LOC_REF", "barcelona01")
os.environ.setdefault("SIMPHONY_RVC_REF", "1")
os.environ.setdefault("SIMPHONY_MOCK_TOKEN", "test-token")

from poma_api.config import Settings  # noqa: E402
from poma_api.domain.exceptions import CatalogNotFoundError, TableAccessDeniedError  # noqa: E402
from poma_api.domain.models import (  # noqa: E402
    CatalogCategory,
    CatalogItem,
    ExternalOrder,
    OrderDraft,
    OrderTotals,
    Restaurant,
    RestaurantCatalog,
    TableContext,
    TpvCatalog,
)
from poma_api.main import create_app  # noqa: E402


def settings(*, enable_lab_endpoints: bool = True) -> Settings:
    return Settings(
        supabase_url="http://supabase.test",
        supabase_publishable_key=SecretStr("test-publishable-key"),
        simphony_base_url="http://simphony.test",
        simphony_token=SecretStr("test-token"),
        simphony_org_short_name="POMALAB",
        simphony_loc_ref="barcelona01",
        simphony_rvc_ref=1,
        enable_lab_endpoints=enable_lab_endpoints,
        cors_origins=["http://127.0.0.1:4173"],
        request_timeout_seconds=0.1,
    )


def sample_catalog() -> RestaurantCatalog:
    return RestaurantCatalog(
        restaurant=Restaurant(
            id=1,
            slug="demo",
            name="DEMO",
            description="Demo",
            currency_code="EUR",
            locale="es-ES",
            accent_color="#936624",
        ),
        menu_name="Carta principal",
        table=TableContext(id=1, name="Mesa 1"),
        categories=[
            CatalogCategory(
                id=10,
                name="Para compartir",
                description=None,
                sort_order=10,
                items=[
                    CatalogItem(
                        id=1001,
                        category_id=10,
                        name="Bravas POMA",
                        description="Patata crujiente",
                        price_cents=690,
                        emoji="🥔",
                        image_url=None,
                        allergens=[],
                    )
                ],
            )
        ],
    )


class FakeRepository:
    def __init__(self, *, healthy: bool = True) -> None:
        self.healthy = healthy

    async def healthcheck(self) -> bool:
        return self.healthy

    async def get_restaurant_catalog(self, slug, table_token, authorization=None):
        if slug == "missing":
            raise CatalogNotFoundError("Restaurante no encontrado.")
        if table_token is None:
            raise TableAccessDeniedError("El QR no es válido o la mesa está desactivada.")
        return sample_catalog()


class FakeTpv:
    def __init__(self, *, healthy: bool = True) -> None:
        self.healthy = healthy

    async def healthcheck(self) -> bool:
        return self.healthy

    async def get_catalog(self) -> TpvCatalog:
        return TpvCatalog(
            external_menu_id="100",
            name="Carta POMA Lab",
            currency_code="EUR",
            items=[],
        )

    async def calculate_order(self, order: OrderDraft) -> ExternalOrder:
        return self._order(order, external_order_id=None, status="calculated")

    async def create_order(self, order: OrderDraft) -> ExternalOrder:
        return self._order(order, external_order_id="check-1", status="open")

    async def get_order(self, external_order_id: str) -> ExternalOrder:
        draft = OrderDraft(
            idempotency_id="0123456789abcdef0123456789abcdef",
            table_name="Mesa 1",
            items=[{"external_item_id": "1001", "quantity": 1}],
        )
        return self._order(draft, external_order_id=external_order_id, status="open")

    @staticmethod
    def _order(order: OrderDraft, *, external_order_id: str | None, status: str) -> ExternalOrder:
        return ExternalOrder(
            external_order_id=external_order_id,
            idempotency_id=order.idempotency_id,
            status=status,
            preparation_status=None,
            table_name=order.table_name,
            items=order.items,
            totals=OrderTotals(
                subtotal_cents=690,
                discount_cents=0,
                service_charge_cents=0,
                tax_cents=0,
                paid_cents=0,
                total_due_cents=690,
                currency_code="EUR",
            ),
        )


@pytest.fixture
def fake_repository() -> FakeRepository:
    return FakeRepository()


@pytest.fixture
def fake_tpv() -> FakeTpv:
    return FakeTpv()


@pytest_asyncio.fixture
async def api_client(fake_repository, fake_tpv):
    app = create_app(settings(), repository=fake_repository, tpv_adapter=fake_tpv)
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://poma.test",
        ) as client:
            yield client
