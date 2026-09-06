import pytest


@pytest.mark.asyncio
async def test_lists_organization_location_and_revenue_center(client):
    organizations = await client.get("/api/v1/organizations")
    locations = await client.get("/api/v1/organizations/POMALAB/locations")
    revenue_centers = await client.get(
        "/api/v1/organizations/POMALAB/locations/barcelona01/revenueCenters"
    )

    assert organizations.status_code == 200
    assert organizations.json()["items"][0]["orgShortName"] == "POMALAB"
    assert locations.status_code == 200
    assert locations.json()["items"][0]["locRef"] == "barcelona01"
    assert revenue_centers.status_code == 200
    assert revenue_centers.json()["items"][0]["rvcRef"] == 1


@pytest.mark.asyncio
async def test_lists_and_reads_menu(client):
    summary = await client.get(
        "/api/v1/menus/summary",
        params={"orgShortName": "POMALAB", "locRef": "barcelona01", "rvcRef": 1},
    )
    menu = await client.get(
        "/api/v1/menus/100",
        headers={
            "Simphony-OrgShortName": "POMALAB",
            "Simphony-LocRef": "barcelona01",
            "Simphony-RvcRef": "1",
        },
    )

    assert summary.status_code == 200
    assert summary.json()["items"][0]["menuId"] == "100"
    assert menu.status_code == 200
    assert len(menu.json()["menuItems"]) >= 6
    assert menu.json()["menuItems"][0]["definitions"][0]["prices"][0]["price"] == 6.9


@pytest.mark.asyncio
async def test_rejects_bad_bearer(client):
    response = await client.get(
        "/api/v1/organizations",
        headers={"Authorization": "Bearer incorrect"},
    )

    assert response.status_code == 401
    assert response.json()["title"] == "Unauthorized"
