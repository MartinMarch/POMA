from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query

from poma_api.api.dependencies import get_repository
from poma_api.domain.exceptions import TableAccessDeniedError
from poma_api.domain.models import RestaurantCatalog
from poma_api.repositories.supabase import SupabaseRepository

router = APIRouter(tags=["catalog"])


@router.get(
    "/restaurants/{slug}/catalog",
    response_model=RestaurantCatalog,
    response_model_by_alias=True,
)
async def restaurant_catalog(
    slug: str,
    repository: Annotated[SupabaseRepository, Depends(get_repository)],
    table: str | None = Query(default=None),
    authorization: str | None = Header(default=None),
) -> RestaurantCatalog:
    table_token: UUID | None = None
    if table is not None:
        try:
            table_token = UUID(table)
        except ValueError as error:
            raise TableAccessDeniedError("El QR no contiene un token de mesa válido.") from error
    return await repository.get_restaurant_catalog(slug, table_token, authorization)
