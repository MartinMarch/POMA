from typing import Annotated

from fastapi import APIRouter, Depends

from poma_api.api.dependencies import get_tpv_adapter
from poma_api.domain.models import ExternalOrder, OrderDraft, TpvCatalog
from poma_api.integrations.tpv.base import TPVAdapter

router = APIRouter(prefix="/lab/tpv", tags=["lab-tpv"])


@router.get("/status")
async def status(tpv: Annotated[TPVAdapter, Depends(get_tpv_adapter)]) -> dict[str, bool]:
    return {"connected": await tpv.healthcheck()}


@router.get("/catalog", response_model=TpvCatalog)
async def catalog(tpv: Annotated[TPVAdapter, Depends(get_tpv_adapter)]) -> TpvCatalog:
    return await tpv.get_catalog()


@router.post("/orders/calculate", response_model=ExternalOrder)
async def calculate_order(
    order: OrderDraft,
    tpv: Annotated[TPVAdapter, Depends(get_tpv_adapter)],
) -> ExternalOrder:
    return await tpv.calculate_order(order)


@router.post("/orders", response_model=ExternalOrder)
async def create_order(
    order: OrderDraft,
    tpv: Annotated[TPVAdapter, Depends(get_tpv_adapter)],
) -> ExternalOrder:
    return await tpv.create_order(order)


@router.get("/orders/{external_order_id}", response_model=ExternalOrder)
async def get_order(
    external_order_id: str,
    tpv: Annotated[TPVAdapter, Depends(get_tpv_adapter)],
) -> ExternalOrder:
    return await tpv.get_order(external_order_id)
