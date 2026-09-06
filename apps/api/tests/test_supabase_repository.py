import json
from uuid import UUID

import httpx
import pytest

from poma_api.domain.exceptions import (
    CatalogNotFoundError,
    TableAccessDeniedError,
    TableTokenRequiredError,
)
from poma_api.repositories.supabase import SupabaseRepository

VALID_TOKEN = UUID("c0ffee00-0000-4000-8000-000000000001")


def json_response(status_code: int, value) -> httpx.Response:
    return httpx.Response(
        status_code,
        content=json.dumps(value).encode(),
        headers={"content-type": "application/json"},
    )


def handler(*, rpc_rows=None, restaurant_exists=True, requires_token=True):
    def respond(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("/restaurants"):
            if not restaurant_exists:
                return json_response(200, [])
            return json_response(
                200,
                [
                    {
                        "id": 1,
                        "slug": "demo",
                        "name": "DEMO",
                        "description": "Demo",
                        "currency_code": "EUR",
                        "locale": "es-ES",
                        "accent_color": "#936624",
                        "requires_table_token": requires_token,
                    }
                ],
            )
        if path.endswith("/rpc/resolve_table_context"):
            return json_response(200, rpc_rows if rpc_rows is not None else [])
        if path.endswith("/menus"):
            return json_response(200, [{"id": 2, "name": "Carta"}])
        if path.endswith("/menu_categories"):
            return json_response(
                200,
                [{"id": 3, "name": "Entrantes", "description": None, "sort_order": 10}],
            )
        if path.endswith("/menu_items"):
            return json_response(
                200,
                [
                    {
                        "id": 4,
                        "category_id": 3,
                        "name": "Bravas",
                        "description": None,
                        "price_cents": 690,
                        "emoji": "🥔",
                        "image_url": None,
                        "allergens": [],
                    }
                ],
            )
        return json_response(404, {})

    return respond


def repository(responder) -> SupabaseRepository:
    client = httpx.AsyncClient(
        transport=httpx.MockTransport(responder),
        base_url="http://supabase.test/rest/v1",
    )
    return SupabaseRepository(
        base_url="http://supabase.test",
        publishable_key="test-key",
        timeout=0.1,
        client=client,
    )


@pytest.mark.asyncio
async def test_repository_loads_catalog_after_valid_rpc():
    repo = repository(
        handler(rpc_rows=[{"restaurant_id": 1, "table_id": 5, "table_name": "Mesa 1"}])
    )

    catalog = await repo.get_restaurant_catalog("demo", VALID_TOKEN)

    assert catalog.table is not None
    assert catalog.table.name == "Mesa 1"
    assert catalog.categories[0].items[0].price_cents == 690


@pytest.mark.asyncio
async def test_repository_rejects_missing_token_invalid_token_and_disabled_table():
    repo = repository(handler(rpc_rows=[]))

    with pytest.raises(TableTokenRequiredError):
        await repo.get_restaurant_catalog("demo", None)
    with pytest.raises(TableAccessDeniedError):
        await repo.get_restaurant_catalog("demo", VALID_TOKEN)
    with pytest.raises(TableAccessDeniedError):
        await repo.get_restaurant_catalog("demo", VALID_TOKEN)


@pytest.mark.asyncio
async def test_repository_reports_unknown_restaurant():
    repo = repository(handler(restaurant_exists=False))

    with pytest.raises(CatalogNotFoundError):
        await repo.get_restaurant_catalog("missing", VALID_TOKEN)
