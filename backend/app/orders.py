"""Automatic reordering: raise one purchase order when a part stays low on the shelf."""

from dataclasses import dataclass, field
from datetime import datetime

from app.clock import has_lasted, started_at
from app.products import ProductRecord, part_name

PENDING = "Pending"
ACCEPTED = "Accepted"
DISPATCHED = "Dispatched"
RECEIVED = "Received"
CANCELLED = "Cancelled"  # set by the shopkeeper from the browser while Pending or Accepted
# An order in any of these is still on its way; a received or cancelled one is not.
OPEN_STATES = (PENDING, ACCEPTED, DISPATCHED)


@dataclass(frozen=True)
class ActiveOrder:
    id: str
    product: str
    state: str


@dataclass(frozen=True)
class NewOrder:
    product: str
    qty: int
    product_name: str  # stored on the order, so the dealer sees names without reading products


@dataclass(frozen=True)
class OrderPlan:
    create: tuple[NewOrder, ...] = ()
    streaks: dict[str, int] = field(default_factory=dict)  # new low-scan streak, only where it changed
    low_since: dict[str, datetime | None] = field(default_factory=dict)  # only where it changed; None clears

    @property
    def is_empty(self) -> bool:
        return not (self.create or self.streaks or self.low_since)


def plan_orders(
    counts: dict[str, int],
    products: dict[str, ProductRecord],
    open_orders: list[ActiveOrder],
    confirm_scans: int,
    *,
    now: datetime,
    delay_seconds: int = 0,
    restart_timers: bool = False,
) -> OrderPlan:
    """Decide which orders to raise after a scan. Pure: no I/O, so every case is unit-tested.

    A part is "low" when the camera count is at or below its reorder level. An order is raised only
    after `confirm_scans` low scans in a row AND once the part has been low for `delay_seconds`
    (`low_since`), and only if the part has no open order, so a part never has two. The scan rule
    stops one bad frame ordering stock; the time rule stops automatic scanning turning a restock or a
    person in front of the shelf into an order. With a delay of 0, two Scan Now presses order, as before.
    While an order is open, both are held at zero: after it is received, the part has to be low again
    for fresh scans and a fresh delay, which leaves time to restock the shelf. A reorder quantity of 0
    turns automatic orders off for the part, so nothing is tracked for it.
    `restart_timers` (first scan after a start or after a gap in scanning) starts the streak and the timer
    again from this scan: "low for 2 scans and 5 minutes" must have been watched, not assumed across a gap.
    """
    with_open_order = {order.product for order in open_orders}
    create: list[NewOrder] = []
    streaks: dict[str, int] = {}
    low_since: dict[str, datetime | None] = {}
    for part, visual in counts.items():
        product = products.get(part)
        if product is None:
            continue
        since: datetime | None = None
        if part in with_open_order or visual > product.reorder_level or product.reorder_qty < 1:
            streak = 0
        else:
            previous = 0 if restart_timers else product.low_streak
            streak = min(previous + 1, confirm_scans)
            since = (None if restart_timers else started_at(product.low_since, now)) or now
            if streak >= confirm_scans and has_lasted(since, now, delay_seconds):
                create.append(NewOrder(part, product.reorder_qty, part_name(part, product.name)))
                streak = 0
                since = None
        if streak != product.low_streak:
            streaks[part] = streak
        if since != product.low_since:
            low_since[part] = since
    return OrderPlan(tuple(create), streaks, low_since)
