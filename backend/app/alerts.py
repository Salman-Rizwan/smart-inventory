"""Alert lifecycle: one alert per mismatch, closed automatically when the counts agree again."""

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime

from app.clock import has_lasted, started_at
from app.reconcile import MISMATCH, Reconciliation

OPEN = "Open"
ACKNOWLEDGED = "Acknowledged"
RESOLVED = "Resolved"
ACTIVE_STATES = (OPEN, ACKNOWLEDGED)


@dataclass(frozen=True)
class ActiveAlert:
    id: str
    product: str
    state: str
    visual: int
    pos: int


@dataclass(frozen=True)
class NewAlert:
    product: str
    visual: int
    pos: int


@dataclass(frozen=True)
class AlertCountUpdate:
    id: str
    visual: int
    pos: int


@dataclass(frozen=True)
class AlertPlan:
    create: tuple[NewAlert, ...] = ()
    update: tuple[AlertCountUpdate, ...] = ()
    resolve: tuple[str, ...] = ()
    # when each part's mismatch began, only where it changed; None clears it
    mismatch_since: dict[str, datetime | None] = field(default_factory=dict)

    @property
    def is_empty(self) -> bool:
        return not (self.create or self.update or self.resolve or self.mismatch_since)


def plan_alerts(
    results: dict[str, Reconciliation],
    active: list[ActiveAlert],
    *,
    now: datetime,
    delay_seconds: int = 0,
    mismatch_since: Mapping[str, object] | None = None,
    restart_timers: bool = False,
) -> AlertPlan:
    """Decide what to change after a scan. Pure: no I/O, so every case is unit-tested.

    - a mismatch with no active alert starts a timer (`mismatch_since`); the alert opens only once the
      mismatch has lasted `delay_seconds` (0 opens it at once), so a customer walking to the till with a
      part, or a hand in front of the camera, raises nothing
    - still mismatched with an active alert -> keep it (refreshing its counts), never add another
    - matched again -> resolve it at once and clear the timer
    - `restart_timers` (first scan after a start or after a gap in scanning): a stored start time is not
      trusted, because nobody watched the shelf in between; the timer starts again from now
    Parts missing from `results` (no POS record, not reported) are left untouched.
    `active` must be oldest first, so the oldest alert is the one kept if duplicates ever exist.
    """
    stored = mismatch_since or {}
    by_product: dict[str, list[ActiveAlert]] = {}
    for alert in active:
        by_product.setdefault(alert.product, []).append(alert)

    create: list[NewAlert] = []
    update: list[AlertCountUpdate] = []
    resolve: list[str] = []
    since_changes: dict[str, datetime | None] = {}
    for product, result in results.items():
        current = by_product.get(product, [])
        raw = stored.get(product)
        since = None if restart_timers else started_at(raw, now)
        if result.status != MISMATCH:
            resolve.extend(a.id for a in current)
            if raw is not None:
                since_changes[product] = None
            continue
        if not current:
            if since is None:
                since = now
            if since != raw:
                since_changes[product] = since
            if has_lasted(since, now, delay_seconds):
                create.append(NewAlert(product, result.visual, result.pos))
            continue
        keep, *duplicates = current
        resolve.extend(a.id for a in duplicates)
        if (keep.visual, keep.pos) != (result.visual, result.pos):
            update.append(AlertCountUpdate(keep.id, result.visual, result.pos))
    return AlertPlan(tuple(create), tuple(update), tuple(resolve), since_changes)
