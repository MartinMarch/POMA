import asyncio
from typing import Any
from uuid import UUID

import httpx
from pydantic import ValidationError

from poma_api.domain.exceptions import (
    CatalogNotFoundError,
    RepositoryUnavailableError,
    TableAccessDeniedError,
    TableTokenRequiredError,
)
from poma_api.domain.models import (
    CatalogCategory,
    CatalogItem,
    Restaurant,
    RestaurantCatalog,
    TableContext,
)


class SupabaseRepository:
    def __init__(
        self,
        *,
        base_url: str,
        publishable_key: str,
        timeout: float,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._publishable_key = publishable_key
        self._owns_client = client is None
        self._client = client or httpx.AsyncClient(
            base_url=f"{base_url.rstrip('/')}/rest/v1",
            timeout=httpx.Timeout(timeout),
        )

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    def _headers(self, authorization: str | None = None) -> dict[str, str]:
        headers = {"apikey": self._publishable_key}
        if authorization and authorization.casefold().startswith("bearer "):
            headers["Authorization"] = authorization
        else:
            headers["Authorization"] = f"Bearer {self._publishable_key}"
        return headers

    async def _request(
        self,
        method: str,
        path: str,
        *,
        authorization: str | None = None,
        **kwargs: Any,
    ) -> httpx.Response:
        try:
            response = await self._client.request(
                method,
                path,
                headers=self._headers(authorization),
                **kwargs,
            )
        except (httpx.TimeoutException, httpx.RequestError) as error:
            raise RepositoryUnavailableError("Supabase Data API is unavailable.") from error
        if response.status_code >= 500:
            raise RepositoryUnavailableError("Supabase Data API is unavailable.")
        return response

    async def healthcheck(self) -> bool:
        try:
            response = await self._request(
                "GET",
                "/restaurants",
                params={"select": "id", "limit": "1"},
            )
            return response.status_code == 200
        except RepositoryUnavailableError:
            return False

    async def get_restaurant_catalog(
        self,
        slug: str,
        table_token: UUID | None,
        authorization: str | None = None,
    ) -> RestaurantCatalog:
        restaurant_response = await self._request(
            "GET",
            "/restaurants",
            authorization=authorization,
            params={
                "select": (
                    "id,slug,name,description,currency_code,locale,accent_color,"
                    "requires_table_token"
                ),
                "slug": f"eq.{slug}",
                "is_published": "eq.true",
                "limit": "1",
            },
        )
        if restaurant_response.status_code != 200:
            raise RepositoryUnavailableError("Catalog query failed.")
        restaurants = restaurant_response.json()
        if not restaurants:
            raise CatalogNotFoundError("Restaurante no encontrado.")

        restaurant_row = restaurants[0]
        requires_token = bool(restaurant_row.pop("requires_table_token"))
        if requires_token and table_token is None:
            raise TableTokenRequiredError("Esta carta requiere el QR de una mesa válida.")

        table: TableContext | None = None
        if table_token is not None:
            table = await self._resolve_table(slug, table_token, authorization)

        restaurant = Restaurant.model_validate(restaurant_row)
        menu_response = await self._request(
            "GET",
            "/menus",
            authorization=authorization,
            params={
                "select": "id,name",
                "restaurant_id": f"eq.{restaurant.id}",
                "is_active": "eq.true",
                "limit": "1",
            },
        )
        menus = menu_response.json() if menu_response.status_code == 200 else []
        if not menus:
            raise CatalogNotFoundError("Este restaurante no tiene una carta activa.")
        menu = menus[0]

        category_request = self._request(
            "GET",
            "/menu_categories",
            authorization=authorization,
            params={
                "select": "id,name,description,sort_order",
                "restaurant_id": f"eq.{restaurant.id}",
                "menu_id": f"eq.{menu['id']}",
                "is_active": "eq.true",
                "order": "sort_order.asc,id.asc",
            },
        )
        item_request = self._request(
            "GET",
            "/menu_items",
            authorization=authorization,
            params={
                "select": (
                    "id,category_id,name,description,price_cents,emoji,image_url,allergens"
                ),
                "restaurant_id": f"eq.{restaurant.id}",
                "is_available": "eq.true",
                "order": "sort_order.asc,id.asc",
            },
        )
        category_response, item_response = await asyncio.gather(category_request, item_request)
        if category_response.status_code != 200 or item_response.status_code != 200:
            raise RepositoryUnavailableError("Catalog query failed.")

        try:
            items = [CatalogItem.model_validate(row) for row in item_response.json()]
            categories = [
                CatalogCategory(
                    **row,
                    items=[item for item in items if item.category_id == row["id"]],
                )
                for row in category_response.json()
            ]
        except (TypeError, ValidationError) as error:
            raise RepositoryUnavailableError("Supabase returned an invalid catalog.") from error

        return RestaurantCatalog(
            restaurant=restaurant,
            menu_name=menu["name"],
            categories=categories,
            table=table,
        )

    async def _resolve_table(
        self,
        slug: str,
        table_token: UUID,
        authorization: str | None,
    ) -> TableContext:
        response = await self._request(
            "POST",
            "/rpc/resolve_table_context",
            authorization=authorization,
            json={"restaurant_slug": slug, "public_token": str(table_token)},
        )
        if response.status_code != 200:
            raise RepositoryUnavailableError("Table validation failed.")
        rows = response.json()
        if not rows:
            raise TableAccessDeniedError("El QR no es válido o la mesa está desactivada.")
        return TableContext(id=rows[0]["table_id"], name=rows[0]["table_name"])
