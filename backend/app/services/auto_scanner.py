import logging
import threading
from collections.abc import Callable

from app.clock import Clock
from app.core.exceptions import AppError, StorageError
from app.scan_policy import AUTO
from app.services.scan_service import ScanService

logger = logging.getLogger(__name__)


def pause_check(repository, clock: Clock) -> Callable[[], bool]:
    """Pause Scanning, read before each automatic scan. Unreadable counts as not paused (logged): a
    missed pause is safer than scanning silently stopping."""

    def is_paused() -> bool:
        try:
            until = repository.get_paused_until()
        except StorageError:
            logger.warning("Pause setting unreadable; scanning as normal")
            return False
        return until is not None and until > clock()

    return is_paused


class AutoScanner:
    """Runs an automatic scan every `interval_seconds` on a background thread (FR1, M6).

    The scan service's lock keeps it from overlapping with Scan Now. Expected failures (camera, storage)
    are logged and the loop carries on; nothing may stop the thread except stop(). `is_paused` is
    checked before each scan (Pause Scanning). The backend must run as one worker, or each worker would
    run its own loop.
    """

    def __init__(
        self,
        service: ScanService,
        interval_seconds: int,
        is_paused: Callable[[], bool] = lambda: False,
        on_pause: Callable[[], None] = lambda: None,
    ):
        self.service = service
        self.interval_seconds = interval_seconds
        self.is_paused = is_paused
        self.on_pause = on_pause  # e.g. release the camera while paused
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    @property
    def running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self) -> None:
        if self.running:
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="auto-scanner", daemon=True)
        self._thread.start()
        logger.info("Automatic scanning started: every %d s", self.interval_seconds)

    def stop(self, timeout: float = 5.0) -> None:
        """Ask the loop to stop and wait for it. A scan in progress is allowed to finish."""
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout)
            if self._thread.is_alive():
                logger.warning("Automatic scanning did not stop within %.0f s", timeout)
            else:
                logger.info("Automatic scanning stopped")
        self._thread = None

    def run_once(self) -> None:
        """One tick: skip while paused, otherwise scan. Never raises."""
        try:
            if self.is_paused():
                logger.info("Automatic scan skipped: scanning is paused")
                self.on_pause()
                return
            self.service.scan(AUTO)
        except AppError as exc:
            logger.warning("Automatic scan failed (%s): %s", exc.code, exc.message)
        except Exception:
            logger.exception("Automatic scan failed unexpectedly; the loop carries on")

    def _run(self) -> None:
        while not self._stop.is_set():
            self.run_once()
            self._stop.wait(self.interval_seconds)
