from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer


def decimal_as_json_number(value: Decimal) -> float:
    return float(value)


SimphonyNumber = Annotated[
    Decimal,
    PlainSerializer(decimal_as_json_number, return_type=float, when_used="json"),
]


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class SimphonyModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class SimphonyLocation(SimphonyModel):
    org_short_name: str
    loc_ref: str
    name: str | None = None
    currency: str


class SimphonyLocationCollection(SimphonyModel):
    items: list[SimphonyLocation]


class SimphonyMenuSummary(SimphonyModel):
    org_short_name: str
    loc_ref: str
    rvc_ref: int
    menu_id: str
    name: str


class SimphonyMenuSummaryCollection(SimphonyModel):
    items: list[SimphonyMenuSummary]


class SimphonyMenuItemPrice(SimphonyModel):
    price: SimphonyNumber
    price_sequence: int
    level: int = 0


class SimphonyMenuItemDefinition(SimphonyModel):
    definition_sequence: int
    name: dict[str, str]
    prices: list[SimphonyMenuItemPrice] = Field(min_length=1)


class SimphonyMenuItem(SimphonyModel):
    menu_item_id: int
    family_group_ref: int
    name: dict[str, str]
    definitions: list[SimphonyMenuItemDefinition] = Field(min_length=1)


class SimphonyFamilyGroup(SimphonyModel):
    family_group_item_id: int
    name: dict[str, str]
    consumer_name: dict[str, str] = Field(default_factory=dict)


class SimphonyMenu(SimphonyModel):
    org_short_name: str
    loc_ref: str
    rvc_ref: int
    menu_id: str
    name: str
    menu_items: list[SimphonyMenuItem]
    family_groups: list[SimphonyFamilyGroup]


class SimphonyCheckHeader(SimphonyModel):
    org_short_name: str
    loc_ref: str
    rvc_ref: int
    idempotency_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    check_employee_ref: int
    order_type_ref: int
    check_name: str | None = None
    table_name: str | None = None
    guest_count: int = 1
    check_ref: str | None = None
    check_number: int | None = None
    open_time: datetime | None = None
    status: str | None = None
    preparation_status: str | None = None
    is_cached_response: bool | None = None


class SimphonyCheckMenuItem(SimphonyModel):
    menu_item_id: int
    quantity: SimphonyNumber = Decimal("1")
    definition_sequence: int = 1
    price_sequence: int = 1
    seat: int = 1
    name: str | None = None
    unit_price: SimphonyNumber | None = None
    total: SimphonyNumber | None = None


class SimphonyCheckRequest(SimphonyModel):
    header: SimphonyCheckHeader
    menu_items: list[SimphonyCheckMenuItem]


class SimphonyCheckTotals(SimphonyModel):
    subtotal: SimphonyNumber
    discount_total: SimphonyNumber = Decimal("0")
    auto_service_charge_total: SimphonyNumber = Decimal("0")
    service_charge_total: SimphonyNumber = Decimal("0")
    tax_total: SimphonyNumber = Decimal("0")
    payment_total: SimphonyNumber = Decimal("0")
    total_due: SimphonyNumber


class SimphonyCheckResponse(SimphonyModel):
    header: SimphonyCheckHeader
    menu_items: list[SimphonyCheckMenuItem]
    totals: SimphonyCheckTotals
