"""Automatic reordering: raise one purchase order when a part stays low on the shelf."""

from dataclasses import dataclass, field

from app.products import ProductRecord

PENDING = "Pending"
ACCEPTED = "Accepted"
DISPATCHED = "Dispatched"
RECEIVED = "Received"
OPEN_STATES = (PENDING, ACCEPTED, DISPATCHED)  # an order in any of these is still on its way


@dataclass(frozen=True)
class ActiveOrder:
    id: str
    product: str
    state: str


@dataclass(frozen=True)
class NewOrder:
    product: str
    qty: int


@dataclass(frozen=True)
class OrderPlan:
    create: tuple[NewOrder, ...] = ()
    streaks: dict[str, int] = field(default_factory=dict)  # new low-scan streak, only where it changed

    @property
    def is_empty(self) -> bool:
        return not (self.create or self.streaks)


def plan_orders(
    counts: dict[str, int],
    products: dict[str, ProductRecord],
    open_orders: list[ActiveOrder],
    confirm_scans: int,
) -> OrderPlan:
    """Decide which orders to raise after a scan. Pure: no I/O, so every case is unit-tested.

    A part is "low" when the camera count is at or below its reorder level. An order is raised only
    after `confirm_scans` low scans in a row (so one bad frame, such as a hand over the camera,
    cannot order stock) and only if the part has no open order, so a part never has two.
    While an order is open the streak is held at zero: after it is received, the part has to be
    low for `confirm_scans` fresh scans before another order, which leaves time to restock the shelf.
    """
    with_open_order = {order.product for order in open_orders}
    create: list[NewOrder] = []
    streaks: dict[str, int] = {}
    for part, visual in counts.items():
        product = products.get(part)
        if product is None:
            continue
        if part in with_open_order or visual > product.reorder_level:
            streak = 0
        else:
            streak = min(product.low_streak + 1, confirm_scans)
            if streak >= confirm_scans and product.reorder_qty >= 1:
                create.append(NewOrder(part, product.reorder_qty))
                streak = 0
        if streak != product.low_streak:
            streaks[part] = streak
    return OrderPlan(tuple(create), streaks)
