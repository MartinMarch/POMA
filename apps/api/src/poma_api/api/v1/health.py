import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends

from poma_api.api.dependencies import get_repository, get_tpv_adapter
from poma_api.domain.models import HealthComponent, HealthResponse
from poma_api.integrations.tpv.base import TPVAdapter
from poma_api.repositories.supabase import SupabaseRepository

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(
    repository: Annotated[SupabaseRepository, Depends(get_repository)],
    tpv: Annotated[TPVAdapter, Depends(get_tpv_adapter)],
) -> HealthResponse:
    supabase_ok, tpv_ok = await asyncio.gather(repository.healthcheck(), tpv.healthcheck())
    return HealthResponse(
        status="ok" if supabase_ok and tpv_ok else "degraded",
        supabase=HealthComponent(status="ok" if supabase_ok else "unavailable"),
        tpv=HealthComponent(status="ok" if tpv_ok else "unavailable"),
    )
