import logging
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

from app.core.exceptions import StorageError

logger = logging.getLogger(__name__)


def init_firebase(key_path: Path) -> None:
    """Initialise the Firebase Admin app once (safe to call repeatedly)."""
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(credentials.Certificate(str(key_path)))


class ScanRepository:
    """Firestore reads and writes for scans. The only place that knows the schema."""

    def __init__(self):
        self.db = firestore.client()

    def save_scan(self, counts: dict[str, int], inference_ms: int) -> None:
        now = firestore.SERVER_TIMESTAMP
        try:
            self.db.collection("scans").add({"counts": counts, "scannedAt": now, "inferenceMs": inference_ms})
            self.db.collection("status").document("latest").set({"counts": counts, "scannedAt": now})
        except Exception as exc:
            logger.exception("Firestore write failed")
            raise StorageError() from exc
