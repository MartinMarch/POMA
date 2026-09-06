import os

import httpx
import pytest_asyncio
from pydantic import SecretStr

os.environ.setdefault("SIMPHONY_MOCK_TOKEN", "test-token")

from simphony_mock.config import Settings  # noqa: E402
from simphony_mock.main import create_app  # noqa: E402


@pytest_asyncio.fixture
async def client():
    settings = Settings(token=SecretStr("test-token"), lab_timeout_seconds=0.2)
    app = create_app(settings)
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://simphony.test",
            headers={"Authorization": "Bearer test-token"},
        ) as test_client:
            yield test_client
