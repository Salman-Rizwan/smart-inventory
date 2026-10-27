from dataclasses import dataclass


@dataclass(frozen=True)
class ProductRecord:
    """What the backend reads from products/{class name}."""

    pos_count: int
    reorder_level: int = 0
    reorder_qty: int = 0
    low_streak: int = 0  # consecutive scans at or below the reorder level (written by the backend)
