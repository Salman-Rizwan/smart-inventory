"""When a scan becomes a scan record. Automatic scans run every minute, so they are saved only when
the counts change, plus a heartbeat, which keeps the free-tier writes low and makes the scan history a
clean time series: each record holds until the next one, and a gap longer than the heartbeat means the
laptop was off (unknown), not that the shelf was unchanged."""

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

Trigger = Literal["manual", "auto"]
MANUAL: Trigger = "manual"
AUTO: Trigger = "auto"


@dataclass(frozen=True)
class SaveDecision:
    save: bool
    heartbeat: bool = False  # saved only because the heartbeat was due, with unchanged counts


def should_save_scan(
    trigger: Trigger,
    counts: dict[str, int],
    last_counts: dict[str, int] | None,
    last_saved_at: datetime | None,
    now: datetime,
    heartbeat_seconds: int,
) -> SaveDecision:
    """Manual scans are always saved (the user expects to see them). Automatic ones when they are the
    first since the backend started, when the counts differ (a part added or gone counts), or when the
    heartbeat is due."""
    if trigger == MANUAL or last_counts is None or last_saved_at is None or counts != last_counts:
        return SaveDecision(save=True)
    if (now - last_saved_at).total_seconds() >= heartbeat_seconds:
        return SaveDecision(save=True, heartbeat=True)
    return SaveDecision(save=False)
