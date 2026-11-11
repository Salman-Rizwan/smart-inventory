from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class ProductRecord:
    """What the backend reads from products/{class name}."""

    pos_count: int
    reorder_level: int = 0
    reorder_qty: int = 0
    low_streak: int = 0  # consecutive scans at or below the reorder level (written by the backend)
    status: str | None = None  # Matched or Mismatch as last stored, so unchanged statuses are not rewritten
    mismatch_since: datetime | None = None  # when the current mismatch began (alert delay)
    low_since: datetime | None = None  # when the part went low (reorder delay)
