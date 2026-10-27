"""Alert lifecycle: one alert per mismatch, closed automatically when the counts agree again."""

from dataclasses import dataclass

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

    @property
    def is_empty(self) -> bool:
        return not (self.create or self.update or self.resolve)


def plan_alerts(results: dict[str, Reconciliation], active: list[ActiveAlert]) -> AlertPlan:
    """Decide what to change after a scan. Pure: no I/O, so every case is unit-tested.

    - first mismatch for a part -> create one alert
    - still mismatched -> keep the existing alert (refreshing its counts), never add another
    - matched again -> resolve it
    Parts missing from `results` (no POS record, not reported) are left untouched.
    `active` must be oldest first, so the oldest alert is the one kept if duplicates ever exist.
    """
    by_product: dict[str, list[ActiveAlert]] = {}
    for alert in active:
        by_product.setdefault(alert.product, []).append(alert)

    create: list[NewAlert] = []
    update: list[AlertCountUpdate] = []
    resolve: list[str] = []
    for product, result in results.items():
        current = by_product.get(product, [])
        if result.status != MISMATCH:
            resolve.extend(a.id for a in current)
            continue
        if not current:
            create.append(NewAlert(product, result.visual, result.pos))
            continue
        keep, *duplicates = current
        resolve.extend(a.id for a in duplicates)
        if (keep.visual, keep.pos) != (result.visual, result.pos):
            update.append(AlertCountUpdate(keep.id, result.visual, result.pos))
    return AlertPlan(tuple(create), tuple(update), tuple(resolve))
