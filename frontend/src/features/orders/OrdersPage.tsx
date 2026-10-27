import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Notification from "../../shared/components/Notification";
import OrderFilterGroup from "./OrderFilter";
import OrderRowItem from "./OrderRowItem";
import OrderSummaryTiles from "./OrderSummaryTiles";
import { useOrders } from "./OrdersContext";
import { countByState, describePending, filterOrders, parseFilter, sortOrders, type OrderFilter } from "./orderWorkflow";

const EMPTY: Record<OrderFilter, { title: string; hint: string }> = {
  open: { title: "No open orders", hint: "An order appears here automatically when a part runs low on the shelf." },
  completed: { title: "No completed orders yet", hint: "Orders move here once the shop confirms they arrived." },
  all: { title: "No purchase orders yet", hint: "An order appears here automatically when a part runs low on the shelf." },
};

/** The dealer's workspace: what needs action, and every order's progress. */
export default function OrdersPage() {
  const { orders, pendingCount, loading, error } = useOrders();
  const [params, setParams] = useSearchParams();
  const filter = parseFilter(params.get("status"));

  const counts = useMemo(() => countByState(orders), [orders]);
  const filterCounts = useMemo(
    () => ({
      open: filterOrders(orders, "open").length,
      completed: filterOrders(orders, "completed").length,
      all: orders.length,
    }),
    [orders],
  );
  const rows = useMemo(() => sortOrders(filterOrders(orders, filter)), [orders, filter]);

  const showTable = !loading && !error && rows.length > 0;
  const announcement = loading || error ? "" : describePending(pendingCount);

  return (
    <div className="dashboard">
      <div className="dashboard__head">
        <div>
          <h1 id="orders-title" tabIndex={-1}>
            Purchase Orders
          </h1>
          <p className="muted">Restock requests raised by the shop. Pending orders need your action first.</p>
        </div>
      </div>

      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>

      {!loading && !error && <OrderSummaryTiles counts={counts} />}

      <section className="panel" aria-labelledby="orders-list-title">
        <div className="panel__header panel__header--split">
          <h2 id="orders-list-title">Orders</h2>
          <OrderFilterGroup
            value={filter}
            counts={filterCounts}
            onChange={(next) => setParams(next === "open" ? {} : { status: next }, { replace: true })}
          />
        </div>

        {error && (
          <div className="panel__body">
            <Notification kind="error">{error}</Notification>
          </div>
        )}
        {loading && (
          <p className="empty-state" role="status">
            Loading orders…
          </p>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="empty-state">
            <strong>{EMPTY[filter].title}</strong>
            {EMPTY[filter].hint}
          </div>
        )}
        {showTable && (
          <div className="table-scroll">
            <table className="table">
              <caption className="visually-hidden">Purchase orders, those needing action first</caption>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Part</th>
                  <th scope="col" className="num">Quantity</th>
                  <th scope="col">Requested At</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <OrderRowItem key={order.id} order={order} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
