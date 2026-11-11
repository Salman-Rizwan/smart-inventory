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
    name: str | None = None  # the shop's display name for the part, if one is set


def part_name(part: str, name: str | None = None) -> str:
    """The part's display name: the shop's own name when set, otherwise the class name made readable
    (spark_plug -> Spark Plug), so a new class from the model always has a name (NFR7)."""
    if name and name.strip():
        return name.strip()
    return " ".join(word.capitalize() for word in part.split("_") if word)
