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

    def get_pos_counts(self) -> dict[str, int]:
        """POS stock figure per product id. Products with an invalid posCount are skipped."""
        try:
            docs = list(self.db.collection("products").stream())
        except Exception as exc:
            logger.exception("Firestore read of products failed")
            raise StorageError() from exc
        pos_counts: dict[str, int] = {}
        for doc in docs:
            pos = (doc.to_dict() or {}).get("posCount")
            if isinstance(pos, int) and not isinstance(pos, bool) and pos >= 0:
                pos_counts[doc.id] = pos
            else:
                logger.warning("Ignoring product %s: invalid posCount %r", doc.id, pos)
        return pos_counts

    def save_product_statuses(self, statuses: dict[str, str]) -> None:
        """Store Matched or Mismatch on each product in one batch."""
        if not statuses:
            return
        try:
            batch = self.db.batch()
            for product_id, status in statuses.items():
                batch.update(self.db.collection("products").document(product_id), {"status": status})
            batch.commit()
        except Exception as exc:
            logger.exception("Firestore write of product statuses failed")
            raise StorageError() from exc
