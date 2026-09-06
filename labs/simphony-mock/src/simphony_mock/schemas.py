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


class OracleModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Organization(OracleModel):
    org_short_name: str
    name: str


class OrganizationCollection(OracleModel):
    items: list[Organization]
    count: int
    offset: int = 0
    limit: int = 0


class PosPlatform(OracleModel):
    name: str = "Oracle.Simphony"
    version: str = "2"


class Location(OracleModel):
    org_short_name: str
    loc_ref: str
    name: str
    currency: str
    languages: list[str]
    pos_platform: PosPlatform = Field(default_factory=PosPlatform)


class LocationCollection(OracleModel):
    items: list[Location]
    count: int
    offset: int = 0
    limit: int = 0


class OrderType(OracleModel):
    order_type_ref: int
    name: str


class RevenueCenter(OracleModel):
    org_short_name: str
    loc_ref: str
    rvc_ref: int
    name: str
    tables: list[str]
    order_types: list[OrderType]


class RevenueCenterCollection(OracleModel):
    items: list[RevenueCenter]
    count: int
    offset: int = 0
    limit: int = 0


class MenuSummary(OracleModel):
    org_short_name: str
    loc_ref: str
    rvc_ref: int
    menu_id: str
    name: str
    description: str | None = None


class MenuSummaryCollection(OracleModel):
    items: list[MenuSummary]


class MenuItemPrice(OracleModel):
    price: SimphonyNumber
    price_sequence: int = 1
    level: int = 0
    name: str | None = None


class MenuItemDefinition(OracleModel):
    definition_sequence: int = 1
    name: dict[str, str]
    name2: dict[str, str]
    prices: list[MenuItemPrice]


class MenuItem(OracleModel):
    menu_item_id: int
    family_group_ref: int
    name: dict[str, str]
    definitions: list[MenuItemDefinition]
    dietary_information: list[str] = Field(default_factory=list)


class FamilyGroup(OracleModel):
    family_group_item_id: int
    name: dict[str, str]
    consumer_name: dict[str, str]
    consumer_description: dict[str, str] = Field(default_factory=dict)


class Menu(OracleModel):
    org_short_name: str
    loc_ref: str
    rvc_ref: int
    menu_id: str
    name: str
    description: str | None = None
    menu_items: list[MenuItem]
    family_groups: list[FamilyGroup]
    combo_meals: list[dict] = Field(default_factory=list)
    condiment_items: list[dict] = Field(default_factory=list)
    condiment_groups: list[dict] = Field(default_factory=list)
    allergens: list[dict] = Field(default_factory=list)


class CheckHeader(OracleModel):
    org_short_name: str
    loc_ref: str
    rvc_ref: int
    idempotency_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    check_employee_ref: int
    order_type_ref: int
    check_name: str | None = Field(default=None, max_length=20)
    table_name: str | None = None
    guest_count: int = Field(default=1, ge=1)
    check_ref: str | None = None
    check_number: int | None = None
    open_time: datetime | None = None
    status: str | None = None
    preparation_status: str | None = None
    is_cached_response: bool | None = None


class CheckMenuItem(OracleModel):
    menu_item_id: int
    quantity: SimphonyNumber = Field(default=Decimal("1"), ge=1)
    definition_sequence: int = 1
    price_sequence: int = 1
    seat: int = 1
    name: str | None = None
    unit_price: SimphonyNumber | None = None
    total: SimphonyNumber | None = None


class CheckRequest(OracleModel):
    header: CheckHeader
    menu_items: list[CheckMenuItem] = Field(default_factory=list)


class CheckTotals(OracleModel):
    subtotal: SimphonyNumber
    discount_total: SimphonyNumber = Decimal("0.00")
    auto_service_charge_total: SimphonyNumber = Decimal("0.00")
    service_charge_total: SimphonyNumber = Decimal("0.00")
    tax_total: SimphonyNumber = Decimal("0.00")
    payment_total: SimphonyNumber = Decimal("0.00")
    total_due: SimphonyNumber


class CheckResponse(OracleModel):
    header: CheckHeader
    menu_items: list[CheckMenuItem]
    totals: CheckTotals
    discounts: list[dict] = Field(default_factory=list)
    service_charges: list[dict] = Field(default_factory=list)
    taxes: list[dict] = Field(default_factory=list)
    tenders: list[dict] = Field(default_factory=list)


class ProblemDetails(OracleModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str
