from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    token: SecretStr
    connected: bool = True
    lab_timeout_seconds: float = Field(default=2.0, ge=0, le=30)

    model_config = SettingsConfigDict(
        env_prefix="SIMPHONY_MOCK_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
