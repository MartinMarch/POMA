import json
import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from poma_api.api.v1.router import build_v1_router
from poma_api.config import Settings, get_settings
from poma_api.domain.exceptions import PomaError
from poma_api.integrations.tpv.base import TPVAdapter
from poma_api.integrations.tpv.simphony.adapter import OracleSimphonyAdapter
from poma_api.integrations.tpv.simphony.auth import StaticTokenAuthProvider
from poma_api.integrations.tpv.simphony.client import SimphonyClient
from poma_api.repositories.supabase import SupabaseRepository


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "time": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").disabled = True
logger = logging.getLogger("poma_api")


def create_app(
    settings: Settings | None = None,
    *,
    repository: SupabaseRepository | None = None,
    tpv_adapter: TPVAdapter | None = None,
) -> FastAPI:
    resolved_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        owns_repository = repository is None
        owns_tpv = tpv_adapter is None
        application.state.repository = repository or SupabaseRepository(
            base_url=resolved_settings.supabase_url,
            publishable_key=resolved_settings.supabase_publishable_key.get_secret_value(),
            timeout=resolved_settings.request_timeout_seconds,
        )

        if tpv_adapter is None:
            auth = StaticTokenAuthProvider(resolved_settings.simphony_token)
            simphony_client = SimphonyClient(
                base_url=resolved_settings.simphony_base_url,
                auth=auth,
                org_short_name=resolved_settings.simphony_org_short_name,
                loc_ref=resolved_settings.simphony_loc_ref,
                rvc_ref=resolved_settings.simphony_rvc_ref,
                timeout=resolved_settings.request_timeout_seconds,
            )
            application.state.tpv_adapter = OracleSimphonyAdapter(
                client=simphony_client,
                check_employee_ref=resolved_settings.simphony_check_employee_ref,
                order_type_ref=resolved_settings.simphony_order_type_ref,
            )
        else:
            application.state.tpv_adapter = tpv_adapter

        logger.info("api_started lab_endpoints=%s", resolved_settings.enable_lab_endpoints)
        yield
        if owns_repository:
            await application.state.repository.aclose()
        if owns_tpv:
            await application.state.tpv_adapter.aclose()
        logger.info("api_stopped")

    application = FastAPI(title="POMA API", version="0.1.0", lifespan=lifespan)

    @application.middleware("http")
    async def sanitized_access_log(request: Request, call_next):
        started_at = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)
        logger.info(
            "http_request method=%s path=%s status=%s duration_ms=%s",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        return response

    if resolved_settings.cors_origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=resolved_settings.cors_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type"],
        )

    @application.exception_handler(PomaError)
    async def poma_error_handler(_: Request, error: PomaError) -> JSONResponse:
        logger.warning("request_failed code=%s", error.code)
        return JSONResponse(
            status_code=error.status_code,
            content={"error": {"code": error.code, "message": str(error)}},
        )

    application.include_router(
        build_v1_router(enable_lab_endpoints=resolved_settings.enable_lab_endpoints)
    )
    return application


app = create_app()
