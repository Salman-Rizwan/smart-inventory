from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    """Application settings, read from environment variables or the root .env file."""

    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore")

    camera_index: int = Field(default=0, ge=0)
    detection_conf: float = Field(default=0.5, gt=0, lt=1)
    max_box_area_ratio: float = Field(default=0.25, gt=0, le=1)
    max_box_side_ratio: float = Field(default=0.6, gt=0, le=1)
    cors_origins: list[str] = ["http://localhost:5173"]
    model_path: Path = BACKEND_DIR / "models" / "best.pt"
    snapshot_path: Path = BACKEND_DIR / "snapshots" / "latest.jpg"
    firebase_key_path: Path = BACKEND_DIR / "serviceAccountKey.json"
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
