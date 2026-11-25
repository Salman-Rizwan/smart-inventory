"""Time as the backend sees it. Injected, so tests control it exactly."""

from collections.abc import Callable
from datetime import UTC, datetime

Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(UTC)


def started_at(since: object, now: datetime) -> datetime | None:
    """A stored start time made safe to compare: None if missing or malformed, never later than now."""
    if not isinstance(since, datetime) or since.tzinfo is None:
        return None
    return min(since, now)


def has_lasted(since: datetime, now: datetime, seconds: int) -> bool:
    return (now - since).total_seconds() >= seconds
