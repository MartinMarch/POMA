import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import Settings, get_settings
from .fixtures import LOCATION, MENU, MENU_SUMMARY, ORGANIZATION, REVENUE_CENTER
from .schemas import (
    CheckRequest,
    CheckResponse,
    LocationCollection,
    Menu,
    MenuSummaryCollection,
    OrganizationCollection,
    ProblemDetails,
    RevenueCenterCollection,
)
from .state import SimphonyState, UnknownMenuItemError


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps(
            {
                "time": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
            },
            ensure_ascii=False,
        )


handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)
logging.getLogger("uvicorn.access").disabled = True
logger = logging.getLogger("simphony_mock")
security = HTTPBearer(auto_error=False)


def problem(status_code: int, title: str, detail: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail=ProblemDetails(title=title, status=status_code, detail=detail).model_dump(
            by_alias=True
        ),
    )


async def authenticate(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> None:
    expected = settings.token.get_secret_value()
    invalid = (
        credentials is None
        or credentials.scheme.lower() != "bearer"
        or credentials.credentials != expected
    )
    if invalid:
        raise problem(status.HTTP_401_UNAUTHORIZED, "Unauthorized", "Invalid bearer token.")


async def apply_lab_failure(
    request: Request,
    settings: Settings,
    state: SimphonyState,
) -> None:
    connection = request.headers.get("X-POMA-Lab-Connection")
    if connection == "disconnected":
        state.connected = False
    elif connection == "connected":
        state.connected = True

    failure = request.headers.get("X-POMA-Lab-Failure")
    if failure == "http-500":
        raise problem(500, "Lab failure", "Simulated STSG2 server error.")
    if failure == "timeout":
        await asyncio.sleep(settings.lab_timeout_seconds)


def validate_context(org_short_name: str, loc_ref: str, rvc_ref: int) -> None:
    if (
        org_short_name.casefold() != ORGANIZATION.org_short_name.casefold()
        or loc_ref.casefold() != LOCATION.loc_ref.casefold()
        or rvc_ref != REVENUE_CENTER.rvc_ref
    ):
        raise problem(404, "Not Found", "Organization, location, or revenue center not found.")


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.simphony = SimphonyState(connected=resolved_settings.connected)
        logger.info("simphony_mock_started")
        yield
        logger.info("simphony_mock_stopped")

    application = FastAPI(
        title="POMA Simphony STSG2 Lab",
        version="0.1.0",
        lifespan=lifespan,
    )
    application.dependency_overrides[get_settings] = lambda: resolved_settings

    @application.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exception: HTTPException) -> JSONResponse:
        content = exception.detail if isinstance(exception.detail, dict) else {
            "title": "HTTP error",
            "status": exception.status_code,
            "detail": str(exception.detail),
        }
        return JSONResponse(status_code=exception.status_code, content=content)

    @application.get("/health", include_in_schema=False)
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @application.get(
        "/api/v1/organizations",
        response_model=OrganizationCollection,
        dependencies=[Depends(authenticate)],
    )
    async def organizations(request: Request) -> OrganizationCollection:
        await apply_lab_failure(request, resolved_settings, request.app.state.simphony)
        return OrganizationCollection(items=[ORGANIZATION], count=1)

    @application.get(
        "/api/v1/organizations/{org_short_name}/locations",
        response_model=LocationCollection,
        dependencies=[Depends(authenticate)],
    )
    async def locations(org_short_name: str, request: Request) -> LocationCollection:
        await apply_lab_failure(request, resolved_settings, request.app.state.simphony)
        if org_short_name.casefold() != ORGANIZATION.org_short_name.casefold():
            raise problem(404, "Not Found", "Organization not found.")
        return LocationCollection(items=[LOCATION], count=1)

    @application.get(
        "/api/v1/organizations/{org_short_name}/locations/{loc_ref}/revenueCenters",
        response_model=RevenueCenterCollection,
        dependencies=[Depends(authenticate)],
    )
    async def revenue_centers(
        org_short_name: str,
        loc_ref: str,
        request: Request,
    ) -> RevenueCenterCollection:
        await apply_lab_failure(request, resolved_settings, request.app.state.simphony)
        validate_context(org_short_name, loc_ref, REVENUE_CENTER.rvc_ref)
        return RevenueCenterCollection(items=[REVENUE_CENTER], count=1)

    @application.get(
        "/api/v1/menus/summary",
        response_model=MenuSummaryCollection,
        dependencies=[Depends(authenticate)],
    )
    async def menu_summary(
        request: Request,
        org_short_name: str = Query(alias="orgShortName"),
        loc_ref: str = Query(default=LOCATION.loc_ref, alias="locRef"),
        rvc_ref: int = Query(default=REVENUE_CENTER.rvc_ref, alias="rvcRef"),
    ) -> MenuSummaryCollection:
        await apply_lab_failure(request, resolved_settings, request.app.state.simphony)
        validate_context(org_short_name, loc_ref, rvc_ref)
        return MenuSummaryCollection(items=[MENU_SUMMARY])

    @application.get(
        "/api/v1/menus/{menu_id}",
        response_model=Menu,
        dependencies=[Depends(authenticate)],
    )
    async def menu(
        menu_id: str,
        request: Request,
        simphony_org_short_name: str = Header(alias="Simphony-OrgShortName"),
        simphony_loc_ref: str = Header(alias="Simphony-LocRef"),
        simphony_rvc_ref: int = Header(alias="Simphony-RvcRef"),
    ) -> Menu:
        await apply_lab_failure(request, resolved_settings, request.app.state.simphony)
        validate_context(simphony_org_short_name, simphony_loc_ref, simphony_rvc_ref)
        if menu_id != MENU.menu_id:
            raise problem(404, "Not Found", "Menu not found.")
        return MENU

    @application.head(
        "/api/v1/checks/connectionStatus",
        dependencies=[Depends(authenticate)],
    )
    async def connection_status(
        request: Request,
        simphony_org_short_name: str = Header(alias="Simphony-OrgShortName"),
        simphony_loc_ref: str = Header(alias="Simphony-LocRef"),
        simphony_rvc_ref: int = Header(alias="Simphony-RvcRef"),
    ) -> Response:
        await apply_lab_failure(request, resolved_settings, request.app.state.simphony)
        validate_context(simphony_org_short_name, simphony_loc_ref, simphony_rvc_ref)
        connected = request.app.state.simphony.connected
        return Response(headers={"Simphony-POS-Connected": str(connected).lower()})

    async def prepare_check(request: Request, check: CheckRequest) -> SimphonyState:
        await apply_lab_failure(request, resolved_settings, request.app.state.simphony)
        validate_context(check.header.org_short_name, check.header.loc_ref, check.header.rvc_ref)
        if not request.app.state.simphony.connected:
            raise problem(521, "Service Timeout", "POS workstation is disconnected.")
        return request.app.state.simphony

    @application.post(
        "/api/v1/checks/calculator",
        response_model=CheckResponse,
        dependencies=[Depends(authenticate)],
    )
    async def calculate(check: CheckRequest, request: Request) -> CheckResponse:
        state = await prepare_check(request, check)
        try:
            return state.calculate(check)
        except UnknownMenuItemError as error:
            raise problem(400, "Invalid menu item", f"Menu item {error} does not exist.") from error

    @application.post(
        "/api/v1/checks",
        response_model=CheckResponse,
        dependencies=[Depends(authenticate)],
    )
    async def create_check(
        check: CheckRequest,
        request: Request,
        simphony_features: str | None = Header(default=None, alias="Simphony-Features"),
    ) -> CheckResponse:
        state = await prepare_check(request, check)
        detect_duplicates = bool(
            simphony_features
            and "detect-duplicate-request"
            in {feature.strip() for feature in simphony_features.split(",")}
        )
        try:
            return state.create(check, detect_duplicates=detect_duplicates)
        except UnknownMenuItemError as error:
            raise problem(400, "Invalid menu item", f"Menu item {error} does not exist.") from error

    @application.get(
        "/api/v1/checks/{check_ref}",
        response_model=CheckResponse,
        dependencies=[Depends(authenticate)],
    )
    async def get_check(
        check_ref: str,
        request: Request,
        simphony_org_short_name: str = Header(alias="Simphony-OrgShortName"),
        simphony_loc_ref: str = Header(alias="Simphony-LocRef"),
        simphony_rvc_ref: int = Header(alias="Simphony-RvcRef"),
    ) -> CheckResponse:
        await apply_lab_failure(request, resolved_settings, request.app.state.simphony)
        validate_context(simphony_org_short_name, simphony_loc_ref, simphony_rvc_ref)
        check = request.app.state.simphony.get(check_ref)
        if check is None:
            raise problem(404, "Not Found", "Check not found.")
        return check

    return application


app = create_app()
