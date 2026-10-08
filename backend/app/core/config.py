from pathlib import Path
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# ==========================================================
# PATHS
# ==========================================================

BASE_DIR = Path(__file__).resolve().parents[2]


# ==========================================================
# SETTINGS
# ==========================================================

class Settings(BaseSettings):

    # Aplicación
    APP_NAME: str = "Linen House API"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "API backend para Linen House"
    APP_ENV: str = "development"
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = False


    # Base de datos
    DB_HOST: str
    DB_PORT: int = 3306
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str


    # Google
    GOOGLE_CLIENT_ID: str = ""

    # Sesión
    SESSION_SECRET_KEY: str
    SESSION_EXPIRE_MINUTES: int = 10080
    SESSION_COOKIE_NAME: str = "linen_house_session"
    SESSION_COOKIE_SECURE: bool = False
    SESSION_COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    SESSION_COOKIE_DOMAIN: str | None = None
    ORDER_RESERVATION_MINUTES: int = 30
    ORDER_RESERVATION_SWEEP_SECONDS: int = 60
    TEST_ORDER_MODE_ENABLED: bool = True
    PAYMENT_GATEWAY_ENABLED: bool = False
    LOGIN_RATE_LIMIT: int = 10
    LOGIN_RATE_WINDOW_SECONDS: int = 60

    # Frontends
    STOREFRONT_URL: str = "http://localhost:5173"
    ADMIN_URL: str = "http://localhost:5174"
    API_URL: str = "http://localhost:8000"

    # Infraestructura HTTP
    TRUSTED_HOSTS: str = "localhost,127.0.0.1"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.strip().lower() == "production"

    @property
    def allowed_origins(self) -> tuple[str, ...]:
        origins = [
            self.STOREFRONT_URL,
            self.ADMIN_URL,
            self.API_URL,
        ]
        if not self.is_production:
            origins.extend(
                (
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://localhost:5174",
                    "http://127.0.0.1:5174",
                )
            )
        return tuple(dict.fromkeys(origin.rstrip("/") for origin in origins if origin))

    @property
    def allowed_admin_origins(self) -> tuple[str, ...]:
        origins = [self.ADMIN_URL]
        if not self.is_production:
            origins.extend(
                (
                    "http://localhost:5174",
                    "http://127.0.0.1:5174",
                )
            )
        return tuple(dict.fromkeys(origin.rstrip("/") for origin in origins if origin))

    @property
    def test_order_mode_enabled(self) -> bool:
        return self.TEST_ORDER_MODE_ENABLED and not self.is_production

    @property
    def trusted_hosts(self) -> list[str]:
        return [
            host.strip()
            for host in self.TRUSTED_HOSTS.split(",")
            if host.strip()
        ]

    @field_validator("SESSION_COOKIE_DOMAIN", mode="before")
    @classmethod
    def empty_domain_is_none(cls, value):
        return value or None

    @model_validator(mode="after")
    def validate_security_settings(self):
        if self.SESSION_EXPIRE_MINUTES <= 0:
            raise ValueError("SESSION_EXPIRE_MINUTES debe ser positivo.")
        if self.ORDER_RESERVATION_MINUTES <= 0:
            raise ValueError("ORDER_RESERVATION_MINUTES debe ser positivo.")
        if self.ORDER_RESERVATION_SWEEP_SECONDS <= 0:
            raise ValueError("ORDER_RESERVATION_SWEEP_SECONDS debe ser positivo.")
        if self.LOGIN_RATE_LIMIT <= 0 or self.LOGIN_RATE_WINDOW_SECONDS <= 0:
            raise ValueError("La configuración del límite de login debe ser positiva.")

        if self.SESSION_COOKIE_SAMESITE == "none" and not self.SESSION_COOKIE_SECURE:
            raise ValueError(
                "SESSION_COOKIE_SECURE debe ser true cuando "
                "SESSION_COOKIE_SAMESITE es none."
            )

        if self.is_production:
            if not self.SESSION_COOKIE_SECURE:
                raise ValueError(
                    "SESSION_COOKIE_SECURE debe ser true en producción."
                )

            weak_secrets = {
                "change-me",
                "change-me-with-a-long-random-secret",
                "secret",
            }

            if (
                len(self.SESSION_SECRET_KEY) < 32
                or self.SESSION_SECRET_KEY.lower() in weak_secrets
            ):
                raise ValueError(
                    "SESSION_SECRET_KEY debe ser aleatoria y tener al menos "
                    "32 caracteres en producción."
                )

        return self


settings = Settings()
