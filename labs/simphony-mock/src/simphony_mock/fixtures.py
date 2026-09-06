from decimal import Decimal

from .schemas import (
    FamilyGroup,
    Location,
    Menu,
    MenuItem,
    MenuItemDefinition,
    MenuItemPrice,
    MenuSummary,
    OrderType,
    Organization,
    RevenueCenter,
)

ORGANIZATION = Organization(org_short_name="POMALAB", name="POMA Laboratory")

LOCATION = Location(
    org_short_name="POMALAB",
    loc_ref="barcelona01",
    name="POMA Lab Barcelona",
    currency="EUR",
    languages=["es-ES", "ca-ES", "en-GB"],
)

REVENUE_CENTER = RevenueCenter(
    org_short_name="POMALAB",
    loc_ref="barcelona01",
    rvc_ref=1,
    name="Sala principal",
    tables=["Mesa 1", "Mesa 2", "Barra"],
    order_types=[OrderType(order_type_ref=1, name="Comer en mesa")],
)

FAMILY_GROUPS = [
    FamilyGroup(
        family_group_item_id=10,
        name={"es-ES": "Para compartir", "en-GB": "To share"},
        consumer_name={"es-ES": "Para compartir", "en-GB": "To share"},
        consumer_description={"es-ES": "Entrantes para el centro de la mesa."},
    ),
    FamilyGroup(
        family_group_item_id=20,
        name={"es-ES": "Principales", "en-GB": "Mains"},
        consumer_name={"es-ES": "Principales", "en-GB": "Mains"},
        consumer_description={"es-ES": "Platos preparados al momento."},
    ),
    FamilyGroup(
        family_group_item_id=30,
        name={"es-ES": "Bebidas", "en-GB": "Drinks"},
        consumer_name={"es-ES": "Bebidas", "en-GB": "Drinks"},
        consumer_description={"es-ES": "Refrescos, cerveza y agua."},
    ),
]


def menu_item(item_id: int, family_id: int, name: str, price: str) -> MenuItem:
    translated_name = {"es-ES": name, "en-GB": name}
    return MenuItem(
        menu_item_id=item_id,
        family_group_ref=family_id,
        name=translated_name,
        definitions=[
            MenuItemDefinition(
                definition_sequence=1,
                name=translated_name,
                name2=translated_name,
                prices=[MenuItemPrice(price=Decimal(price), price_sequence=1, level=0)],
            )
        ],
    )


MENU_ITEMS = [
    menu_item(1001, 10, "Bravas POMA", "6.90"),
    menu_item(1002, 10, "Croquetas de jamón", "8.50"),
    menu_item(1003, 10, "Pan con tomate", "4.20"),
    menu_item(2001, 20, "Hamburguesa POMA", "13.90"),
    menu_item(2002, 20, "Arroz de temporada", "15.50"),
    menu_item(2003, 20, "Ensalada del huerto", "10.90"),
    menu_item(3001, 30, "Cerveza", "3.20"),
    menu_item(3002, 30, "Agua mineral", "2.40"),
    menu_item(3003, 30, "Refresco", "2.90"),
]

MENU_SUMMARY = MenuSummary(
    org_short_name="POMALAB",
    loc_ref="barcelona01",
    rvc_ref=1,
    menu_id="100",
    name="Carta POMA Lab",
    description="Catálogo determinista del laboratorio STSG2.",
)

MENU = Menu(
    **MENU_SUMMARY.model_dump(),
    menu_items=MENU_ITEMS,
    family_groups=FAMILY_GROUPS,
)

MENU_ITEM_BY_ID = {item.menu_item_id: item for item in MENU_ITEMS}
