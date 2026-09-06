from typing import Protocol

from pydantic import SecretStr


class SimphonyAuthProvider(Protocol):
    async def authorization_header(self) -> str: ...


class StaticTokenAuthProvider:
    """Static bearer tokens are only intended for the local POMA laboratory."""

    def __init__(self, token: SecretStr) -> None:
        self._token = token

    async def authorization_header(self) -> str:
        return f"Bearer {self._token.get_secret_value()}"
