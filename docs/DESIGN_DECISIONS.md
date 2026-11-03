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
Decided Oct 28: move fully to Material UI; new files stay TypeScript. Why: a standard, well-documented component library suits an enterprise-style app, and the new History and Insights pages (tables, filters, charts) can use MUI and MUI X Charts directly. How the look is kept: the theme sets radius 0, no shadows or ripple, IBM Plex and the one teal accent, so MUI matches the existing Carbon style. How it stays safe: screens use the shared wrappers (`Button`, `StatusBadge`, `FormField`, `NotificationMenu`), so each wrapper is converted on its own with the same props, and each task passes tests, axe and a screenshot comparison. Design values live once, in `frontend/src/shared/theme/tokens.ts`; the theme is built from them, and the CSS variables the existing stylesheets use (`--color-*`, `--space-*`, ...) are generated from the theme at runtime (`cssVariables.ts`), with colours and spacing pointing at MUI's own variables. So there is one source of truth and a half-finished move still looks consistent. `tokens.css` was deleted in MUI-2 rather than kept as a second copy; a test fails if any stylesheet uses a variable that is not defined. Page layout moved in MUI-13 to shared parts (`Panel`, `EmptyState`, `Page`, `CardPage`, the table parts) and to each component's own `styled`/`sx`, so screens no longer depend on CSS class names; MUI-14 (Oct 31) then moved the page-wide rules (reset, headings, focus ring, reduced motion) into `globalStyles.ts`, applied through MUI's `GlobalStyles`, replaced the last two utility classes with `Muted` and `VisuallyHidden`, and deleted `base.css` and the generated variables. There are no stylesheets left. Not MUI's `CssBaseline`: its defaults (font smoothing, body text size) would change the look. Final bundle: JavaScript 1,064 KB (327 KB gzipped) against 881 KB (264 KB) before the move; CSS 8 KB (the fonts) against 23 KB. The extra 63 KB gzipped is MUI and Emotion; code-splitting the main chunk is in the backlog. `NotificationMenu` stays a disclosure because MUI's Menu is an ARIA menu, the wrong pattern for a list of links. Trade-offs: 2 to 4 days of work close to the freeze, and a larger bundle (measured in the trial). A trial converts `Button` first as a go/no-go, and an Oct 31 stop date keeps it from delaying the feedback work.

## Stock changes are logged with the POS change
The supervisor asked for analytics on sales and received stock, but the POS buttons only overwrote `posCount`, so nothing recorded what sold or arrived. Every POS change now writes a `stock_movements` entry in the same transaction (Record Sale, Receive Stock, Adjust Stock, Mark Received). Why one write: a log that can drift from the POS would make the analytics wrong. How the rules enforce it: the product stores `lastMovementId`, the id of the entry created in the same write. A `posCount` change is refused unless that entry is new and its before and after counts match the change, and an entry is refused unless the product changes to match it. Entries record who (`by`, the signed-in user) and when (the server's time), and can never be edited or deleted, so the history is trustworthy. Each entry copies the part's cost and price at that moment, so a later price change never rewrites past revenue. The scripts that set counts directly (`demo_reset`, `seed_products --reset`) write a `Reset` entry the browser cannot write, which the analytics leave out. Trade-off: one more document per POS change, which is small on the free plan, and more rule checks (about 10 document reads per Mark Received, under Firestore's limit of 20).

## Adjust Stock instead of fake sales
Decided Oct 31. When the shelf and the POS disagree because stock was damaged, stolen or miscounted, the only way to make them match was Record Sale or Receive Stock, which would log sales that never happened and distort every sales figure. Adjust Stock sets the POS record to a count the shopkeeper made, with a required reason: Damaged, Lost or Stolen, or Miscount for fewer units; Found, Customer Return, or Miscount for more. The reasons feed the shrinkage figures in Insights, and a customer return counts against sales. The dialog starts at the camera's count but says the camera can miss parts facing away: if the camera is wrong, the right action is to rearrange the shelf, not to adjust. Customer Return is an adjustment rather than a separate button because returns are rare in this shop and the reason list keeps the screen simple. Trade-off: an adjustment is trusted; there is no approval step (owner and staff roles are future work).

## Part Settings: cost, price and reorder settings
The money figures (sales value, shrinkage value, stock value) need each part's cost and selling price, and the shopkeeper could not see or change the reorder settings that drive automatic orders. A Part Settings panel on the dashboard lists them, with the margin, and edits them in a dialog; the rules allow only those four fields plus who changed them and when. Cost and price may stay blank until known; anything that needs them then says "Not set" instead of showing 0. The currency is LKR, set once in `VITE_CURRENCY`. A reorder quantity of 0 turns automatic orders off for that part. Selling below cost is allowed (clearance) but warned about. Trade-off: the dealer can still read product documents, including prices, until M10 narrows the read rule.

## A delivery is counted once
A dealer delivery should be entered with Mark Received, which adds it to the POS and closes the order. If the shopkeeper also used Receive Stock for the same box, it would be counted twice. When a dispatched order exists for the part, Receive Stock now stops and says so, with a link to the Orders page and a Receive Anyway button for a genuine separate delivery. A warning rather than a block, because the shop can also buy stock elsewhere.

## Alerts have their own page
Decided Oct 31. The dashboard's full alerts table repeated what Stock Check already shows (the same part, the same two counts), and acknowledged or resolved alerts disappeared from view, so there was no history to check. The Alerts tab now holds the work (open alerts, Acknowledge) and the history (when each alert was raised, acknowledged and resolved); the dashboard keeps a short summary of up to 5 active alerts, still acknowledgeable in one click. The page reads the alerts themselves, so there is no second copy that could go stale, and notifications stay derived. Open and acknowledged alerts come from the shared live listener, which is always complete; resolved ones come from a second, paged query (newest 50 by `createdAt`, Load More adds 50) that runs only while the Alerts page is open. Ordering by `createdAt` alone needs no Firestore index. When Load More widens the query, Firestore first answers from its local cache, which holds only the alerts already shown and would wrongly say "all loaded"; until the server has answered, a cached page that is not full is skipped. Counts that depend on unloaded history show "50+". A notification opens its alert's row (`/alerts?alert=ID`), highlighted and focused. Order history stays on the Orders page, and stock history becomes part of Insights, so the header stays at four tabs. Trade-off: one more page and query, and the dashboard shows at most 5 alerts.

## Two-row header below 960 px
Four tabs with count badges (Dashboard, Alerts, Orders, and Insights to come) do not fit beside the logo, bell, name and Log Out on a phone or tablet: at 390 px Orders was cut off. Below 960 px the tabs move to a full-width second row (measured: four tabs need 377 px of nav, which one row has from about 932 px); at 320 px all four fit. The nav scrolls rather than widening the page if it ever overflows, so a tab's focus ring is drawn inside the tab. Keyboard focus keeps the page order (home, tabs, bell, Log Out) at every width. Trade-off: the header is 45 px taller on phones and tablets. Every page also names itself in the browser tab title, after the unread count: "(2) Alerts · Smart Inventory".

## Business intelligence in the browser
Analytics (sales trend, stock flow, shelf stock, days of cover, discrepancies, reorder recommendations) are pure, tested functions run in the browser over the last 7, 30 or 90 days. Why the browser: the data is already in Firestore and the hosted app must work without the shop laptop; Cloud Functions are not on the free plan. Medians, not averages, because with few records one slow order would skew an average. The suggested reorder level (average daily sales x dealer lead time + safety margin) turns the data into a decision. Each chart has a table alternative. The Insights page is lazy-loaded so the main bundle does not grow.

## Seeded demo history
Sales were never logged before F1, so the charts would start empty. `seed_history` writes about 30 days of demo data, every document marked `seeded: true`, and removes only its own data with `--clear`. `demo_reset` keeps it, and all seeded orders and alerts are closed, so they never block automatic ordering. The Insights page shows "Includes demo data" when seeded records are in the period, and the report says the demo history is synthetic.

## Layers and errors
Routes, services, adapters; pure planners for decisions; typed `AppError`s in one envelope. After a scan is saved, reconciliation, alerts and orders each fail softly so a scan is never lost.
