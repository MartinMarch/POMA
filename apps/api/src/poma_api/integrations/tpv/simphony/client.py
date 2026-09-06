import logging
from typing import Any, TypeVar
from urllib.parse import quote

import httpx
from pydantic import BaseModel, ValidationError

from .auth import SimphonyAuthProvider
from .exceptions import (
    TpvAuthenticationError,
    TpvContractError,
    TpvNotFoundError,
    TpvTimeoutError,
    TpvUnavailableError,
)
from .schemas import (
    SimphonyCheckRequest,
    SimphonyCheckResponse,
    SimphonyLocationCollection,
    SimphonyMenu,
    SimphonyMenuSummaryCollection,
)

logger = logging.getLogger("poma_api.simphony")
ModelT = TypeVar("ModelT", bound=BaseModel)


class SimphonyClient:
    def __init__(
        self,
        *,
        base_url: str,
        auth: SimphonyAuthProvider,
        org_short_name: str,
        loc_ref: str,
        rvc_ref: int,
        timeout: float,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.org_short_name = org_short_name
        self.loc_ref = loc_ref
        self.rvc_ref = rvc_ref
        self._auth = auth
        self._owns_client = client is None
        self._client = client or httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            timeout=httpx.Timeout(timeout),
        )

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    def _context_headers(self) -> dict[str, str]:
        return {
            "Simphony-OrgShortName": self.org_short_name,
            "Simphony-LocRef": self.loc_ref,
            "Simphony-RvcRef": str(self.rvc_ref),
        }

    async def _request(
        self,
        method: str,
        path: str,
        *,
        context_headers: bool = False,
        headers: dict[str, str] | None = None,
        **kwargs: Any,
    ) -> httpx.Response:
        request_headers = {"Authorization": await self._auth.authorization_header()}
        if context_headers:
            request_headers.update(self._context_headers())
        if headers:
            request_headers.update(headers)
        try:
            response = await self._client.request(
                method,
                path,
                headers=request_headers,
                **kwargs,
            )
        except httpx.TimeoutException as error:
            logger.warning("simphony_timeout method=%s path=%s", method, path)
            raise TpvTimeoutError("Simphony request timed out.") from error
        except httpx.RequestError as error:
            logger.warning("simphony_unreachable method=%s path=%s", method, path)
            raise TpvUnavailableError("Simphony is unreachable.") from error

        logger.info(
            "simphony_response method=%s path=%s status=%s",
            method,
            path,
            response.status_code,
        )
        if response.status_code in (401, 403):
            raise TpvAuthenticationError("Simphony rejected the configured credentials.")
        if response.status_code == 404:
            raise TpvNotFoundError("Simphony resource was not found.")
        if response.status_code == 521:
            raise TpvUnavailableError("Simphony POS workstation is disconnected.")
        if response.status_code >= 500:
            raise TpvUnavailableError("Simphony returned a server error.")
        if response.status_code >= 400:
            raise TpvContractError("Simphony rejected the request.")
        return response

    @staticmethod
    def _parse(response: httpx.Response, model: type[ModelT]) -> ModelT:
        try:
            return model.model_validate(response.json())
        except (ValueError, ValidationError) as error:
            raise TpvContractError("Simphony returned an invalid response.") from error

    async def connection_status(self) -> bool:
        response = await self._request(
            "HEAD",
            "/api/v1/checks/connectionStatus",
            context_headers=True,
        )
        value = response.headers.get("Simphony-POS-Connected")
        if value not in {"true", "false"}:
            raise TpvContractError("Simphony omitted its connection status.")
        return value == "true"

    async def locations(self) -> SimphonyLocationCollection:
        org = quote(self.org_short_name, safe="")
        response = await self._request("GET", f"/api/v1/organizations/{org}/locations")
        return self._parse(response, SimphonyLocationCollection)

    async def menu_summary(self) -> SimphonyMenuSummaryCollection:
        response = await self._request(
            "GET",
            "/api/v1/menus/summary",
            params={
                "orgShortName": self.org_short_name,
                "locRef": self.loc_ref,
                "rvcRef": self.rvc_ref,
            },
        )
        return self._parse(response, SimphonyMenuSummaryCollection)

    async def menu(self, menu_id: str) -> SimphonyMenu:
        response = await self._request(
            "GET",
            f"/api/v1/menus/{quote(menu_id, safe='')}",
            context_headers=True,
        )
        return self._parse(response, SimphonyMenu)

    async def calculate(self, check: SimphonyCheckRequest) -> SimphonyCheckResponse:
        response = await self._request(
            "POST",
            "/api/v1/checks/calculator",
            context_headers=True,
            json=check.model_dump(mode="json", by_alias=True, exclude_none=True),
        )
        return self._parse(response, SimphonyCheckResponse)

    async def create(self, check: SimphonyCheckRequest) -> SimphonyCheckResponse:
        response = await self._request(
            "POST",
            "/api/v1/checks",
            context_headers=True,
            headers={"Simphony-Features": "detect-duplicate-request"},
            json=check.model_dump(mode="json", by_alias=True, exclude_none=True),
        )
        return self._parse(response, SimphonyCheckResponse)

    async def get_check(self, check_ref: str) -> SimphonyCheckResponse:
        response = await self._request(
            "GET",
            f"/api/v1/checks/{quote(check_ref, safe='')}",
            context_headers=True,
        )
        return self._parse(response, SimphonyCheckResponse)
