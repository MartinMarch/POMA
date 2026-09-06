from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_publishable_key: SecretStr

    simphony_base_url: str
    simphony_auth_mode: Literal["static"] = "static"
    simphony_token: SecretStr
    simphony_org_short_name: str
    simphony_loc_ref: str
    simphony_rvc_ref: int
    simphony_check_employee_ref: int = 1
    simphony_order_type_ref: int = 1

    enable_lab_endpoints: bool = False
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)
    request_timeout_seconds: float = Field(default=5.0, gt=0, le=60)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
