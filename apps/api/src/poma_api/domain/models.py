from typing import Literal

from pydantic import BaseModel, Field


class HealthComponent(BaseModel):
    status: Literal["ok", "unavailable"]


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str = "poma-api"
    supabase: HealthComponent
    tpv: HealthComponent


class Restaurant(BaseModel):
    id: int
    slug: str
    name: str
    description: str | None
    currency_code: str
    locale: str
    accent_color: str


class TableContext(BaseModel):
    id: int
    name: str


class CatalogItem(BaseModel):
    id: int
    category_id: int
    name: str
    description: str | None
    price_cents: int = Field(ge=0)
    emoji: str | None
    image_url: str | None
    allergens: list[str]


class CatalogCategory(BaseModel):
    id: int
    name: str
    description: str | None
    sort_order: int
    items: list[CatalogItem]


class RestaurantCatalog(BaseModel):
    restaurant: Restaurant
    menu_name: str = Field(serialization_alias="menuName")
    categories: list[CatalogCategory]
    table: TableContext | None = None


class TpvCatalogItem(BaseModel):
    external_item_id: str
    name: str
    category: str
    price_cents: int = Field(ge=0)


class TpvCatalog(BaseModel):
    external_menu_id: str
    name: str
    currency_code: str
    items: list[TpvCatalogItem]


class OrderLine(BaseModel):
    external_item_id: str
    quantity: int = Field(ge=1, le=99)


class OrderDraft(BaseModel):
    idempotency_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    table_name: str = Field(min_length=1, max_length=80)
    guest_count: int = Field(default=1, ge=1, le=99)
    items: list[OrderLine] = Field(min_length=1)


class OrderTotals(BaseModel):
    subtotal_cents: int
    discount_cents: int
    service_charge_cents: int
    tax_cents: int
    paid_cents: int
    total_due_cents: int
    currency_code: str


class ExternalOrder(BaseModel):
    external_order_id: str | None
    idempotency_id: str
    status: str
    preparation_status: str | None
    table_name: str | None
    items: list[OrderLine]
    totals: OrderTotals
    cached_response: bool = False
