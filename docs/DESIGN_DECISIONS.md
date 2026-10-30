# Design Decisions

Short answers to "why is it like this?".

## Laptop backend, Firebase only stores
The webcam and the model live on the shop laptop, so the laptop does all processing. Firebase (free Spark plan) stores, authenticates and hosts. Cloud Functions and Cloud Storage need a paid plan, so they are not used. Trade-off: Scan Now works only on the shop laptop.

## Orders come from the camera, not the POS
Record Sale and Receive Stock only change the mock POS. An order is raised when the camera sees the shelf at or below `reorderLevel` for `REORDER_CONFIRM_SCANS` (2) scans in a row and no order is open for that part. Why: the shelf count is the verified truth; the POS can be wrong (that is what the mismatch alert is for). Two scans in a row stop one bad frame (a hand, a shadow) from ordering stock. Demo order: remove the part, scan twice, the order appears; then record the sale to match the POS.

## One order per part at a time
While an order is open, `lowScanStreak` is held at 0. After Received, the shelf must be low for fresh scans before the next order. This leaves time to restock.

## Mark Received is one transaction
`receiveOrder` changes the order state and adds the quantity to `posCount` together. A half-done receipt would leave stock and orders disagreeing. Receiving twice is refused. When two people act on the same order at once, the rules refuse the second write; the app then reads the order once to say what happened ("has already been received", "no longer exists") instead of a vague "could not be updated". Only an order that has not moved is reported as a permission problem.

## Reconciliation lives in two places
`backend/app/reconcile.py` persists status on every scan; `frontend/src/features/inventory/reconcile.ts` shows it live as the shopkeeper edits the POS. The rule is trivial (equal means Matched), and a live display needs it in the browser. Both have tests; change them together.

## Alerts: backend creates, browser acknowledges
One alert per mismatch, counts refreshed while active, Resolved automatically when the counts match. The browser may only do Open to Acknowledged with a server timestamp, so history cannot be rewritten from a browser.

## Notifications are derived, never stored
A notification exists while its alert or order needs attention, so nothing can go stale. Only the personal read keys are stored (`notification_reads/{uid}`). Unread (personal) and Acknowledged (shared) are different things. Reading never hides work counters.

## Part names come from the data
Product ids equal the model's class names. A new part is a retrain plus one document (NFR7).

## Detection guards
The model has no background class, so a person or room can score as a part. Boxes over 25% of the frame area or 60% of a side are dropped, and confidence is 0.5. The real fix is retraining with negatives.

## UI
Carbon-style look: IBM Plex, one teal accent, square hairline surfaces, status never colour-only. Tailwind and a dark theme were considered and dropped.

## Material UI, with the theme as the only source
Decided Oct 28: move fully to Material UI; new files stay TypeScript. Why: a standard, well-documented component library suits an enterprise-style app, and the new History and Insights pages (tables, filters, charts) can use MUI and MUI X Charts directly. How the look is kept: the theme sets radius 0, no shadows or ripple, IBM Plex and the one teal accent, so MUI matches the existing Carbon style. How it stays safe: screens use the shared wrappers (`Button`, `StatusBadge`, `FormField`, `NotificationMenu`), so each wrapper is converted on its own with the same props, and each task passes tests, axe and a screenshot comparison. Design values live once, in `frontend/src/shared/theme/tokens.ts`; the theme is built from them, and the CSS variables the existing stylesheets use (`--color-*`, `--space-*`, ...) are generated from the theme at runtime (`cssVariables.ts`), with colours and spacing pointing at MUI's own variables. So there is one source of truth and a half-finished move still looks consistent. `tokens.css` was deleted in MUI-2 rather than kept as a second copy; a test fails if any stylesheet uses a variable that is not defined. The generated variables go when MUI-14 removes the last stylesheet that uses them. `NotificationMenu` stays a disclosure because MUI's Menu is an ARIA menu, the wrong pattern for a list of links. Trade-offs: 2 to 4 days of work close to the freeze, and a larger bundle (measured in the trial). A trial converts `Button` first as a go/no-go, and an Oct 31 stop date keeps it from delaying the feedback work.

## Stock changes are logged with the POS change
The supervisor asked for analytics on sales and received stock, but the POS buttons only overwrote `posCount`, so nothing recorded what sold or arrived. Every POS change now writes a `stock_movements` entry in the same transaction (Record Sale, Receive Stock, Mark Received), and the rules refuse a `posCount` change without its entry. Why one transaction: a log that can drift from the POS would make the analytics wrong. Entries can never be edited or deleted, so the history is trustworthy. Trade-off: one more document per POS change, which is small on the free plan.

## History reads the source records
The History page lists alerts in every state, orders with each step's time, and stock changes. Notifications stay derived and are never stored; History reads the alerts, orders and stock changes themselves, so there is no second copy that could go stale. The dealer sees only order history.

## Business intelligence in the browser
Analytics (sales trend, stock flow, shelf stock, days of cover, discrepancies, reorder recommendations) are pure, tested functions run in the browser over the last 7, 30 or 90 days. Why the browser: the data is already in Firestore and the hosted app must work without the shop laptop; Cloud Functions are not on the free plan. Medians, not averages, because with few records one slow order would skew an average. The suggested reorder level (average daily sales x dealer lead time + safety margin) turns the data into a decision. Each chart has a table alternative. The Insights page is lazy-loaded so the main bundle does not grow.

## Seeded demo history
Sales were never logged before F1, so the charts would start empty. `seed_history` writes about 30 days of demo data, every document marked `seeded: true`, and removes only its own data with `--clear`. `demo_reset` keeps it, and all seeded orders and alerts are closed, so they never block automatic ordering. The Insights page shows "Includes demo data" when seeded records are in the period, and the report says the demo history is synthetic.

## Layers and errors
Routes, services, adapters; pure planners for decisions; typed `AppError`s in one envelope. After a scan is saved, reconciliation, alerts and orders each fail softly so a scan is never lost.
