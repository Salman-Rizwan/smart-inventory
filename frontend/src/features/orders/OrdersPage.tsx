import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmptyState from "../../shared/components/EmptyState";
import Notification from "../../shared/components/Notification";
import { Page, PageHead } from "../../shared/components/Page";
import { Panel, PanelBody, PanelHeader } from "../../shared/components/Panel";
import TableScroll from "../../shared/components/TableScroll";
import { DataTable, HeadCell } from "../../shared/components/table";
import OrderFilterGroup from "./OrderFilter";
import OrderRowItem from "./OrderRowItem";
import OrderSummaryTiles from "./OrderSummaryTiles";
import { useOrders } from "./OrdersContext";
import { countByState, describeAttention, filterOrders, parseFilter, sortOrders, type OrderFilter } from "./orderWorkflow";
import type { OrderRole } from "./types";
import { Muted, VisuallyHidden } from "../../shared/components/text";

const EMPTY: Record<OrderFilter, { title: string; hint: string }> = {
  open: { title: "No open orders", hint: "An order appears here automatically when a part stays low on the shelf." },
  completed: { title: "No completed orders yet", hint: "Orders move here once the shop confirms they arrived." },
  all: { title: "No purchase orders yet", hint: "An order appears here automatically when a part stays low on the shelf." },
};

const COPY: Record<OrderRole, { title: string; subtitle: string }> = {
  dealer: {
    title: "Purchase Orders",
    subtitle: "Restock requests raised by the shop. Pending orders need your action first.",
  },
  shopkeeper: {
    title: "Orders",
    subtitle: "Restock orders raised for your shop. Mark an order received when the goods arrive.",
  },
};

/** The orders workspace for the dealer (fulfil) and the shopkeeper (confirm receipt): what needs action, and every order's progress. */
export default function OrdersPage() {
  const { orders, role, attentionCount, loading, error } = useOrders();
  const [outcome, setOutcome] = useState("");
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
  const rows = useMemo(() => sortOrders(filterOrders(orders, filter), role), [orders, filter, role]);

  const showTable = !loading && !error && rows.length > 0;
  const announcement = loading || error ? "" : describeAttention(role, attentionCount);

  return (
    <Page>
      <PageHead>
        <div>
          <h1 id="orders-title" tabIndex={-1}>
            {COPY[role].title}
          </h1>
          <Muted>{COPY[role].subtitle}</Muted>
        </div>
      </PageHead>

      <VisuallyHidden component="p" role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>

      {outcome && <Notification kind="success">{outcome}</Notification>}

      {!loading && !error && <OrderSummaryTiles counts={counts} role={role} />}

      <Panel aria-labelledby="orders-list-title">
        <PanelHeader split>
          <h2 id="orders-list-title">Order List</h2>
          <OrderFilterGroup
            value={filter}
            counts={filterCounts}
            onChange={(next) => setParams(next === "open" ? {} : { status: next }, { replace: true })}
          />
        </PanelHeader>

        {error && (
          <PanelBody>
            <Notification kind="error">{error}</Notification>
          </PanelBody>
        )}
        {loading && (
          <EmptyState component="p" role="status">
            Loading orders…
          </EmptyState>
        )}
        {!loading && !error && rows.length === 0 && (
          <EmptyState title={EMPTY[filter].title}>{EMPTY[filter].hint}</EmptyState>
        )}
        {showTable && (
          <TableScroll label="Order list table">
            <DataTable
              caption="Orders, those needing action first"
              head={
                <>
                  <HeadCell>Order</HeadCell>
                  <HeadCell>Part</HeadCell>
                  <HeadCell numeric>Quantity</HeadCell>
                  <HeadCell>Requested At</HeadCell>
                  <HeadCell>Status</HeadCell>
                  <HeadCell>Action</HeadCell>
                </>
              }
            >
              {rows.map((order) => (
                <OrderRowItem key={order.id} order={order} role={role} onDone={setOutcome} />
              ))}
            </DataTable>
          </TableScroll>
        )}
      </Panel>
    </Page>
  );
}
