import asyncio

import httpx
import pytest
from pydantic import SecretStr
from simphony_mock.config import Settings as MockSettings
from simphony_mock.main import create_app as create_mock_app

from poma_api.domain.exceptions import TpvTimeoutError, TpvUnavailableError
from poma_api.domain.models import OrderDraft
from poma_api.integrations.tpv.simphony.adapter import OracleSimphonyAdapter
from poma_api.integrations.tpv.simphony.auth import StaticTokenAuthProvider
from poma_api.integrations.tpv.simphony.client import SimphonyClient


def order() -> OrderDraft:
    return OrderDraft(
        idempotency_id="0123456789abcdef0123456789abcdef",
        table_name="Mesa 1",
        guest_count=2,
        items=[
            {"external_item_id": "1001", "quantity": 2},
            {"external_item_id": "3001", "quantity": 1},
        ],
    )


def adapter(http_client: httpx.AsyncClient, timeout: float = 0.1) -> OracleSimphonyAdapter:
    client = SimphonyClient(
        base_url="http://simphony.test",
        auth=StaticTokenAuthProvider(SecretStr("test-token")),
        org_short_name="POMALAB",
        loc_ref="barcelona01",
        rvc_ref=1,
        timeout=timeout,
        client=http_client,
    )
    return OracleSimphonyAdapter(client=client, check_employee_ref=1, order_type_ref=1)


@pytest.mark.asyncio
async def test_adapter_translates_catalog_and_full_order_lifecycle():
    mock_app = create_mock_app(
        MockSettings(token=SecretStr("test-token"), lab_timeout_seconds=0.2)
    )
    async with mock_app.router.lifespan_context(mock_app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=mock_app), base_url="http://simphony.test"
        ) as client:
            simphony = adapter(client)
            catalog = await simphony.get_catalog()
            quote = await simphony.calculate_order(order())
            created = await simphony.create_order(order())
            duplicate = await simphony.create_order(order())
            fetched = await simphony.get_order(created.external_order_id or "")

    assert catalog.currency_code == "EUR"
    assert catalog.items[0].external_item_id == "1001"
    assert catalog.items[0].price_cents == 690
    assert quote.totals.total_due_cents == 1700
    assert created.external_order_id == fetched.external_order_id
    assert duplicate.external_order_id == created.external_order_id
    assert duplicate.cached_response is True


@pytest.mark.asyncio
async def test_adapter_reports_disconnected_mock():
    mock_app = create_mock_app(MockSettings(token=SecretStr("test-token"), connected=False))
    async with mock_app.router.lifespan_context(mock_app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=mock_app), base_url="http://simphony.test"
        ) as client:
            assert await adapter(client).healthcheck() is False


@pytest.mark.asyncio
async def test_client_maps_server_error_and_timeout_to_domain_errors():
    error_client = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(500)),
        base_url="http://simphony.test",
    )

    def timeout(_: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow POS")

    timeout_client = httpx.AsyncClient(
        transport=httpx.MockTransport(timeout),
        base_url="http://simphony.test",
    )
    try:
        with pytest.raises(TpvUnavailableError):
            await adapter(error_client).get_catalog()
        with pytest.raises(TpvTimeoutError):
            await adapter(timeout_client).calculate_order(order())
    finally:
        await asyncio.gather(error_client.aclose(), timeout_client.aclose())
