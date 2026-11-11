from functools import lru_cache
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.simulation import parse_simulated_parts

BACKEND_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    """Application settings, read from environment variables or the root .env file."""

    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore")

    camera_index: int = Field(default=0, ge=0)
    detection_conf: float = Field(default=0.5, gt=0, lt=1)
    max_box_area_ratio: float = Field(default=0.25, gt=0, le=1)
    max_box_side_ratio: float = Field(default=0.6, gt=0, le=1)
    reorder_confirm_scans: int = Field(default=2, ge=1)
    # Automatic scanning (M6). Off unless switched on in .env.
    auto_scan_enabled: bool = False
    scan_interval_seconds: int = Field(default=60, ge=10)
    scan_heartbeat_seconds: int = Field(default=600, ge=10)
    alert_delay_seconds: int = Field(default=180, ge=0)
    reorder_delay_seconds: int = Field(default=300, ge=0)
    min_frame_brightness: float = Field(default=40, ge=0, le=255)
    # Live testing only: made-up parts added to every scan, e.g. "zz_part:0" (see app/simulation.py).
    # Must be empty in normal use and at release.
    simulated_parts: str = ""
    cors_origins: list[str] = ["http://localhost:5173"]
    model_path: Path = BACKEND_DIR / "models" / "best.pt"
    snapshot_path: Path = BACKEND_DIR / "snapshots" / "latest.jpg"
    firebase_key_path: Path = BACKEND_DIR / "serviceAccountKey.json"
    log_level: str = "INFO"

    @model_validator(mode="after")
    def heartbeat_not_shorter_than_interval(self) -> "Settings":
        if self.scan_heartbeat_seconds < self.scan_interval_seconds:
            raise ValueError(
                "SCAN_HEARTBEAT_SECONDS must be at least SCAN_INTERVAL_SECONDS "
                f"({self.scan_heartbeat_seconds} < {self.scan_interval_seconds})"
            )
        return self

    @model_validator(mode="after")
    def simulated_parts_are_valid(self) -> "Settings":
        parse_simulated_parts(self.simulated_parts)  # raises ValueError with a readable message
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
