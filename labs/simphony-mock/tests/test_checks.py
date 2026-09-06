import asyncio

import pytest

CONTEXT_HEADERS = {
    "Simphony-OrgShortName": "POMALAB",
    "Simphony-LocRef": "barcelona01",
    "Simphony-RvcRef": "1",
}


def check_payload(idempotency_id: str = "0123456789abcdef0123456789abcdef") -> dict:
    return {
        "header": {
            "orgShortName": "POMALAB",
            "locRef": "barcelona01",
            "rvcRef": 1,
            "idempotencyId": idempotency_id,
            "checkEmployeeRef": 1,
            "orderTypeRef": 1,
            "checkName": "POMA LAB",
            "tableName": "Mesa 1",
            "guestCount": 2,
        },
        "menuItems": [
            {"menuItemId": 1001, "quantity": 2},
            {"menuItemId": 3001, "quantity": 1},
        ],
    }


@pytest.mark.asyncio
async def test_connection_status(client):
    response = await client.head("/api/v1/checks/connectionStatus", headers=CONTEXT_HEADERS)

    assert response.status_code == 200
    assert response.headers["Simphony-POS-Connected"] == "true"


@pytest.mark.asyncio
async def test_calculates_creates_and_gets_a_check(client):
    calculated = await client.post("/api/v1/checks/calculator", json=check_payload())
    created = await client.post(
        "/api/v1/checks",
        json=check_payload(),
        headers={**CONTEXT_HEADERS, "Simphony-Features": "detect-duplicate-request"},
    )
    check_ref = created.json()["header"]["checkRef"]
    fetched = await client.get(f"/api/v1/checks/{check_ref}", headers=CONTEXT_HEADERS)

    assert calculated.status_code == 200
    assert calculated.json()["totals"]["totalDue"] == 17.0
    assert created.status_code == 200
    assert created.json()["header"]["preparationStatus"] == "Submitted"
    assert fetched.status_code == 200
    assert fetched.json()["header"]["checkRef"] == check_ref


@pytest.mark.asyncio
async def test_duplicate_request_returns_original_check(client):
    headers = {**CONTEXT_HEADERS, "Simphony-Features": "detect-duplicate-request"}
    first = await client.post("/api/v1/checks", json=check_payload(), headers=headers)
    duplicate = await client.post("/api/v1/checks", json=check_payload(), headers=headers)

    assert first.json()["header"]["checkRef"] == duplicate.json()["header"]["checkRef"]
    assert duplicate.json()["header"]["isCachedResponse"] is True


@pytest.mark.asyncio
async def test_disconnected_pos_rejects_check_operations(client):
    status = await client.head(
        "/api/v1/checks/connectionStatus",
        headers={**CONTEXT_HEADERS, "X-POMA-Lab-Connection": "disconnected"},
    )
    order = await client.post("/api/v1/checks", json=check_payload())

    assert status.headers["Simphony-POS-Connected"] == "false"
    assert order.status_code == 521


@pytest.mark.asyncio
async def test_lab_can_simulate_server_error(client):
    response = await client.get(
        "/api/v1/organizations",
        headers={"X-POMA-Lab-Failure": "http-500"},
    )

    assert response.status_code == 500
    assert response.json()["title"] == "Lab failure"


@pytest.mark.asyncio
async def test_lab_can_simulate_timeout(client):
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(
            client.get(
                "/api/v1/organizations",
                headers={"X-POMA-Lab-Failure": "timeout"},
            ),
            timeout=0.05,
        )
