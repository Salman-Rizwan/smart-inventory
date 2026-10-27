export default function OrdersPage() {
  return (
    <div className="dashboard">
      <div className="dashboard__head">
        <div>
          <h1>Purchase Orders</h1>
          <p className="muted">Restock requests raised by the shop, newest first.</p>
        </div>
      </div>
      <section className="panel" aria-labelledby="orders-title">
        <div className="panel__header">
          <h2 id="orders-title">Open Orders</h2>
        </div>
        <div className="empty-state">
          <strong>No purchase orders yet</strong>
          An order appears here automatically when a part runs low on the shelf.
        </div>
      </section>
    </div>
  );
}
