import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, scan
from app.camera import Camera
from app.core.config import Settings, get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.detector import Detector
from app.firebase_db import ScanRepository, init_firebase
from app.services.scan_service import ScanService
from app.services.snapshot_store import SnapshotStore

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    setup_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # build the heavy objects once at startup, not on every request
        init_firebase(settings.firebase_key_path)
        app.state.snapshot_store = SnapshotStore(settings.snapshot_path)
        app.state.scan_service = ScanService(
            camera=Camera(settings.camera_index),
            detector=Detector(settings.model_path, settings.detection_conf),
            repository=ScanRepository(),
            snapshots=app.state.snapshot_store,
        )
        logger.info("Backend ready")
        yield

    app = FastAPI(title="Smart Inventory API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def request_id(request: Request, call_next):
        rid = request.headers.get("X-Request-ID", uuid.uuid4().hex[:12])
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response

    register_exception_handlers(app)
    app.include_router(health.router)
    app.include_router(scan.router)
    return app


app = create_app()
