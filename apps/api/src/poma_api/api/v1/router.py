from fastapi import APIRouter

from poma_api.api.v1 import catalog, health, lab


def build_v1_router(*, enable_lab_endpoints: bool) -> APIRouter:
    router = APIRouter(prefix="/api/v1")
    router.include_router(health.router)
    router.include_router(catalog.router)
    if enable_lab_endpoints:
        router.include_router(lab.router)
    return router
