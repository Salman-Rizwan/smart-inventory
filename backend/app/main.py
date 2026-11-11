import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, scan
from app.camera import Camera
from app.clock import utc_now
from app.core.config import Settings, get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.detector import Detector
from app.firebase_db import ScanRepository, UserRepository, init_firebase
from app.services.auto_scanner import AutoScanner, pause_check
from app.services.role_checker import RoleChecker
from app.services.scan_service import ScanPolicy, ScanService
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
        repository = ScanRepository()
        app.state.role_checker = RoleChecker(UserRepository(), utc_now)
        app.state.scan_service = ScanService(
            camera=Camera(settings.camera_index, keep_open=settings.auto_scan_enabled),
            detector=Detector.from_path(
                settings.model_path,
                settings.detection_conf,
                settings.max_box_area_ratio,
                settings.max_box_side_ratio,
            ),
            repository=repository,
            snapshots=app.state.snapshot_store,
            policy=ScanPolicy.from_settings(settings),
        )
        app.state.scan_service.publish_settings()
        app.state.auto_scanner = None
        logger.info(
            "Scanning rules: alert delay %d s, reorder delay %d s after %d low scans, min brightness %.0f",
            settings.alert_delay_seconds,
            settings.reorder_delay_seconds,
            settings.reorder_confirm_scans,
            settings.min_frame_brightness,
        )
        if settings.simulated_parts:
            logger.warning(
                "TEST MODE: simulated parts %s are added to every scan (SIMULATED_PARTS). "
                "Empty it in .env for normal use.",
                settings.simulated_parts,
            )
        if settings.auto_scan_enabled:
            app.state.auto_scanner = AutoScanner(
                app.state.scan_service,
                settings.scan_interval_seconds,
                is_paused=pause_check(repository, utc_now),
                on_pause=app.state.scan_service.camera.release,
            )
            app.state.auto_scanner.start()
        else:
            logger.info("Automatic scanning is off (AUTO_SCAN_ENABLED=false); Scan Now still works")
        logger.info("Backend ready")
        yield
        if app.state.auto_scanner is not None:
            app.state.auto_scanner.stop()
        app.state.scan_service.camera.release()

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
