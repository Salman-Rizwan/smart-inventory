# Design Decisions

Short answers to "why is it like this?".

## Laptop backend, Firebase only stores
The webcam and the model live on the shop laptop, so the laptop does all processing. Firebase (free Spark plan) stores, authenticates and hosts. Cloud Functions and Cloud Storage need a paid plan, so they are not used. Trade-off: Scan Now works only on the shop laptop.

## Orders come from the camera, not the POS
Record Sale and Receive Stock only change the mock POS. An order is raised when the camera sees the shelf at or below `reorderLevel` for `REORDER_CONFIRM_SCANS` (2) scans in a row and no order is open for that part. Why: the shelf count is the verified truth; the POS can be wrong (that is what the mismatch alert is for). Two scans in a row stop one bad frame (a hand, a shadow) from ordering stock. Demo order: remove the part, scan twice, the order appears; then record the sale to match the POS.

## One order per part at a time
While an order is open, `lowScanStreak` is held at 0. After Received, the shelf must be low for fresh scans before the next order. This leaves time to restock.

## Mark Received is one transaction
`receiveOrder` changes the order state and adds the quantity to `posCount` together. A half-done receipt would leave stock and orders disagreeing. Receiving twice is refused.

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
Carbon-style tokens in `tokens.css`, IBM Plex, one teal accent, status never colour-only. Tailwind and a dark theme were considered and dropped. TypeScript plus Material UI is undecided (see ROADMAP).

## Layers and errors
Routes, services, adapters; pure planners for decisions; typed `AppError`s in one envelope. After a scan is saved, reconciliation, alerts and orders each fail softly so a scan is never lost.
