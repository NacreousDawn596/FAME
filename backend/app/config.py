"""FAME backend application configuration."""

from __future__ import annotations

import base64
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Environment ---
    environment: str = "development"

    # --- Infrastructure ---
    database_url: str = "postgresql+asyncpg://fame:fame@localhost:5432/fame"
    redis_url: str = "redis://localhost:6379/0"

    # --- SchoolApp ---
    schoolapp_worker_url: str = ""
    schoolapp_public_key: str = ""  # base64-encoded Ed25519 public key
    schoolapp_issuer: str = "fame-schoolapp"
    schoolapp_audience: str = "fame-api"
    schoolapp_assertion_max_age_seconds: int = 300

    # --- Organizer ---
    organizer_initial_emails: str = ""  # comma-separated
    # Optional fixed password for bootstrap organizers. When empty, a random
    # temporary password is generated per account (and only logged, not stored).
    organizer_initial_password: str = ""

    # --- Session / security ---
    session_secret: str = "insecure-dev-secret"
    allowed_origins: str = "http://localhost:5173,http://localhost:8080"

    # --- VAPID ---
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:fame@gadzarts.xyz"
    # Web Push message TTL (seconds). FCM drops messages with TTL=0 if the
    # device is momentarily unreachable (doze/background); a short TTL lets the
    # push service queue and deliver it when the device reconnects.
    push_ttl_seconds: int = 300

    # --- Additional notification channels ---
    # Email notifications (FormSubmit) are delivered to this address.
    notification_email: str = "fame@gadzarts.xyz"
    # WhatsApp notifications go through a local whatsapp-web.js bridge.
    whatsapp_bridge_url: str = "http://localhost:3000"
    email_notifications_enabled: bool = True
    whatsapp_notifications_enabled: bool = True

    # --- URLs ---
    frontend_url: str = "http://localhost:5173"
    api_url: str = "http://localhost:8000"

    # --- Queue ---
    default_company_name: str = "FAME Recruitment"
    notification_approaching_threshold: int = 5
    notification_urgent_threshold: int = 2

    # --- Regulators / rooms ---
    # Comma-separated names. regulator[i] is paired with rooms[i] (by index).
    regulators: str = ""
    rooms: str = ""

    # --- Activity log ---
    # Path of the append-only activity log file (candidates + organizer actions).
    activity_log_path: str = "logs/activity.log"

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return v
        if isinstance(v, (list, tuple)):
            return ",".join(v)
        return v

    @property
    def allowed_origin_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def regulator_list(self) -> list[str]:
        return [r.strip() for r in self.regulators.split(",") if r.strip()]

    @property
    def room_list(self) -> list[str]:
        return [r.strip() for r in self.rooms.split(",") if r.strip()]

    def room_for_regulator(self, regulator: str) -> str | None:
        """Room paired with a regulator by index, or None."""
        try:
            idx = self.regulator_list.index(regulator)
        except ValueError:
            return None
        rooms = self.room_list
        return rooms[idx] if 0 <= idx < len(rooms) else None

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def schoolapp_public_key_bytes(self) -> bytes:
        if not self.schoolapp_public_key:
            raise RuntimeError("SCHOOLAPP_PUBLIC_KEY is not configured")
        return base64.urlsafe_b64decode(
            self.schoolapp_public_key + "=" * (-len(self.schoolapp_public_key) % 4)
        )

    @property
    def vapid_private_key_bytes(self) -> bytes:
        if not self.vapid_private_key:
            raise RuntimeError("VAPID_PRIVATE_KEY is not configured")
        return base64.urlsafe_b64decode(
            self.vapid_private_key + "=" * (-len(self.vapid_private_key) % 4)
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
