"""What a scan writes: a scan record (history) and the status of the latest attempt (status/latest)."""

from dataclasses import dataclass, field
from typing import Literal

from app.scan_policy import Trigger

Outcome = Literal["counted", "skipped", "failed"]


@dataclass(frozen=True)
class ScanRecord:
    """One scans/{id} document. Saved for every manual scan; automatic ones only on change or heartbeat."""

    counts: dict[str, int]
    inference_ms: int
    trigger: Trigger
    brightness: float
    capture_ms: int
    detect_ms: int
    heartbeat: bool = False
    simulated: tuple[str, ...] = ()  # simulated parts included in `counts` (live testing only)


@dataclass(frozen=True)
class AutoScanState:
    enabled: bool
    interval_seconds: int


@dataclass(frozen=True)
class ScanStatus:
    """status/latest after every attempt, so the dashboard can tell scanning, skipped, failed and off apart.

    `counted` also carries the counts and timings (captureMs, detectMs, saveMs, processMs); `skipped`
    and `failed` keep the last counts and only record why.
    """

    trigger: Trigger
    outcome: Outcome
    auto_scan: AutoScanState
    counts: dict[str, int] | None = None
    brightness: float | None = None
    timings: dict[str, int] = field(default_factory=dict)
    skip_reason: str | None = None
    error: str | None = None
