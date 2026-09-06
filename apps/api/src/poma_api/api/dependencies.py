from fastapi import Request

from poma_api.integrations.tpv.base import TPVAdapter
from poma_api.repositories.supabase import SupabaseRepository


def get_repository(request: Request) -> SupabaseRepository:
    return request.app.state.repository


def get_tpv_adapter(request: Request) -> TPVAdapter:
    return request.app.state.tpv_adapter
