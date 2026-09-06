import httpx
import pytest
from conftest import settings

from poma_api.main import create_app

VALID_TABLE = "c0ffee00-0000-4000-8000-000000000001"
ORDER = {
    "idempotency_id": "0123456789abcdef0123456789abcdef",
    "table_name": "Mesa 1",
    "guest_count": 2,
    "items": [{"external_item_id": "1001", "quantity": 1}],
}


@pytest.mark.asyncio
async def test_health_reports_dependencies_without_secrets(api_client):
    response = await api_client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "poma-api",
        "supabase": {"status": "ok"},
        "tpv": {"status": "ok"},
    }
    assert "token" not in response.text.casefold()


@pytest.mark.asyncio
async def test_catalog_returns_valid_table_context(api_client):
    response = await api_client.get(
        "/api/v1/restaurants/demo/catalog", params={"table": VALID_TABLE}
    )

    assert response.status_code == 200
    assert response.json()["table"] == {"id": 1, "name": "Mesa 1"}
    assert response.json()["categories"][0]["items"][0]["price_cents"] == 690
    assert response.json()["menuName"] == "Carta principal"


@pytest.mark.asyncio
async def test_catalog_maps_not_found_and_invalid_token(api_client):
    missing = await api_client.get(
        "/api/v1/restaurants/missing/catalog", params={"table": VALID_TABLE}
    )
    invalid = await api_client.get(
        "/api/v1/restaurants/demo/catalog", params={"table": "not-a-uuid"}
    )

    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "catalog_not_found"
    assert invalid.status_code == 403
    assert invalid.json()["error"]["code"] == "table_access_denied"


@pytest.mark.asyncio
async def test_lab_routes_use_tpv_adapter(api_client):
    status = await api_client.get("/api/v1/lab/tpv/status")
    catalog = await api_client.get("/api/v1/lab/tpv/catalog")
    calculated = await api_client.post("/api/v1/lab/tpv/orders/calculate", json=ORDER)
    created = await api_client.post("/api/v1/lab/tpv/orders", json=ORDER)
    fetched = await api_client.get("/api/v1/lab/tpv/orders/check-1")

    assert status.json() == {"connected": True}
    assert catalog.json()["external_menu_id"] == "100"
    assert calculated.json()["status"] == "calculated"
    assert created.json()["external_order_id"] == "check-1"
    assert fetched.json()["external_order_id"] == "check-1"


@pytest.mark.asyncio
async def test_lab_routes_are_absent_when_disabled(fake_repository, fake_tpv):
    app = create_app(
        settings(enable_lab_endpoints=False),
        repository=fake_repository,
        tpv_adapter=fake_tpv,
    )
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://poma.test"
        ) as client:
            response = await client.get("/api/v1/lab/tpv/status")

    assert response.status_code == 404
