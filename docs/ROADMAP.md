# Roadmap

Deadlines: final submission Nov 15, 2026; code freeze Nov 14 morning, then tag and submit (decided Nov 11; before that, freeze Nov 13). Earlier: freeze Nov 7, final Nov 9. Done so far: M1 to M5, M7, M8, M9 and notifications Stage A (see `README.md` Status).

**Progress (Nov 11):** Done: MUI-0 to MUI-14 and UX-1 to UX-4 (Oct 31); F1 (built, published and checked live Nov 4); M6 automatic scanning (built, and every live check finished on Nov 11: delays, soak, dark frames, call limits, pause rules, the gap recheck, all six camera states in Chrome, pause end to end and the regression; five faults found that day were fixed, see `docs/TASKS.md`); M10 access control and Cancel Order (built, published and checked live Nov 11); simulated `zz_` parts for live testing (Nov 11); the Nov 12 Insights decisions and dashboard layout (gross profit, What To Do, a 90-day seed, a Products tab, the dashboard reordered and cut to about half its length; items 38 to 43 in `docs/TASKS.md`); Group 2 Insights core (Nov 11 evening, a day early: `seed_history`, the analytics, the four dashboard tiles, the Insights page and `insights_check.py`, all checked live). Nov 6 to 10 had no work. Left: the rest of the list in `docs/TASKS.md` ("Remaining work"). **The plan for the last days is "Plan to the freeze" in `docs/TASKS.md` (agreed Nov 11): Nov 12 Insights core; Nov 13 Hosting, a simple Stock Log and the M12 measurements; Nov 14 morning release.** The dated schedule below is the Nov 4 plan, kept for the record.

**Task checklist:** `docs/TASKS.md` breaks every remaining step into small actions, each with its script tests and live tests.

**Decided Nov 4 (from the shopkeeper review on Oct 31):** money in LKR (`VITE_CURRENCY`); the stock change log gets its own **Stock Log** tab; an alert waits `ALERT_DELAY_SECONDS` (a `.env` setting, default 180) before it is raised; frames that are too dark are skipped; the dashboard shows when the camera last scanned. Future work and limitations for the report are kept in `docs/FUTURE_WORK.md`.

Plan agreed on Oct 28 after the interim viva. It covers the supervisor's feedback (a history of past alerts, and business intelligence analytics on the dashboard) and the move to Material UI.

## Time budget
Planned Oct 28: about 80 working hours to Nov 6. Re-planned Nov 4 for the Nov 15 deadline: about 70 working hours to the Nov 13 freeze for about 45 hours of work, so nothing is cut and two days are kept for measurements and fixes. The report (M13) is written alongside and after the freeze.

| Date | Work | Kind |
|---|---|---|
| Oct 28 to 31 | MUI-0 to MUI-14; UX-1 to UX-4 (done) | Must |
| Nov 1 to 3 | Lost | |
| Nov 4 | F1: stock change log, Adjust Stock, Part Settings, delivery guard, who-did-it stamps (built); user publishes the rules; live check | Must |
| Nov 5 | M6 backend: loop and settings, time rules for alerts and orders, dark-frame skip, change-only writes and heartbeat, scan timings | Must |
| Nov 6 | M6 browser and live: camera status, Pause Scanning (user publishes the rules), camera kept open if measured worthwhile, brightness calibration, live run | Must |
| Nov 7 | Stock Log tab; undo on Record Sale; one name per part | Must |
| Nov 8 | `seed_history`; F3 analytics functions (pure, tested) | Must |
| Nov 9 | F3 dashboard tiles; Insights core sections (sales, shrinkage, days of cover, recommendations) | Must |
| Nov 10 | Insights: stock flow, stock value, stockouts, Apply, response and dealer | Must |
| Nov 11 | M10 final rules (user publishes) and backend role check; M11 Hosting and thumbnail | Must |
| Nov 12 | M12 measurements (the user's lighting and accuracy trials run from Nov 7 alongside), full regression, demo rehearsal | Must |
| Nov 13 | Code freeze. `package.json` 1.0.0, PR dev to main (merge commit), tag `v1.0.0`, deploy Hosting from it | Must |
| Nov 14 | Submit | |
| Nov 15 | Final submission | |

## Checkpoints
- **Nov 6 evening:** M6 done and checked live (F1 was checked live on Nov 4).
- **Nov 10 evening:** Stock Log and all of F3 done. Anything left moves to Nov 12, never past the freeze.
- **Nov 11 evening:** M10 and M11 done, so M12 measures the hosted app.
- **If late, cut in this order** (each cut goes into `docs/FUTURE_WORK.md`): the Response and dealer section; stockouts and lost sales; stock value; Apply on recommendations; undo on Record Sale. **Never cut:** the alert delay, the dark-frame skip, Adjust Stock, camera status, the Stock Log, M6, M10, M11 deployment, M12.
- M6 does not depend on anything else; move it earlier whenever there is a gap.

## Definition of done (every task)
1. `npm run typecheck && npm test && npx oxlint && npm run build` (frontend) or `python -m pytest` and `ruff check . && ruff format --check .` (backend).
2. New or updated tests for what changed.
3. axe shows 0 violations on the affected pages, in both roles.
4. Screenshots compared with the MUI-0 baseline at desktop and 390, 375, 360 and 320 px (UI tasks).
5. The real flow checked in Chrome; live tests use `zz-*` data, snapshot and restore.
6. One commit per task, made by the user.

## 1. Front-end move to Material UI
Decision: move fully to MUI. The MUI theme becomes the single source of colours, fonts and spacing, themed to keep the Carbon look (square, hairline borders, no shadows or ripple, one teal accent, IBM Plex). Design values live once in `shared/theme/tokens.ts`; the theme is built from them and generates the CSS variables the remaining stylesheets use (`tokens.css` was deleted in MUI-2). Screens use the shared wrappers, so each wrapper keeps its props and call sites do not change. See `docs/DESIGN_DECISIONS.md`.

| Task | Work | Task-specific tests | Time |
|---|---|---|---|
| MUI-0 | Baseline: screenshots of every page, role and width; axe results; bundle size. Fix paths in `.handoff/live-tests`. | Reference for all later comparisons | 1–2 h |
| MUI-0b | Fix found by MUI-0: the phone-width table scroll boxes cannot be reached by keyboard (axe `scrollable-region-focusable` at 390 px). Shared `TableScroll` wrapper (focusable, labelled region) used by all four tables; correct `docs/TESTING.md`. | axe 0 at 390 px; wrapper unit tests | 0.5 h |
| MUI-1 | Trial: install exact versions of `@mui/material`, `@emotion/react`, `@emotion/styled`; minimal theme; convert `Button`. | Bundle growth, axe, screenshots. Go/no-go. | 2 h |
| MUI-2 | Theme: radius 0, no shadows, 4px spacing, status colours and tints, Plex, teal accent; `cssVariables` on. Values move to `tokens.ts`; the stylesheet variables are generated from the theme and `tokens.css` is deleted. Reduced motion stays with the global rule in `base.css` until MUI-14. | Theme unit tests; contrast check of every colour pair; every `var()` in the stylesheets is defined | 3 h |
| MUI-3 | `Button`, all variants: done inside MUI-1 (three variants, both sizes, loading and disabled states, with tests) | Covered by `Button.test.tsx` | 0 h |
| MUI-4 | `StatusBadge` to `Chip` | Icon plus text for every status | 1–2 h |
| MUI-5 | `FormField` on MUI form parts (label above, never floating) with a Show Password toggle and placeholders on Sign In (added at the user's request); the Receive Stock Qty box becomes a shared `CompactInput` | Label association, error text linked to its field, focus to the first error, toggle by keyboard with `aria-pressed`, toggle never submits | 3–4 h |
| MUI-6 | `Spinner`, `Notification`, `Avatar`, `ErrorBoundary` | `aria-live` kept; loading, empty, error states | 2 h |
| MUI-7 | Bell dropdown: the bell becomes an MUI `IconButton` and the footer actions use the shared `Button`, which retires all `.btn` CSS. Stays a disclosure, not an ARIA menu. The panel surface and item rows stay HTML with CSS until MUI-13 (MUI's base styles load after ours and would override their layout) | `aria-expanded`, Escape closes, focus returns to the bell, unread announced; keyboard walk in Chrome for both roles | 1–2 h |
| MUI-8 | App shell on MUI `Box`/`styled` (header, brand, `PrimaryNav` with real links, user block, skip link, main); header CSS and the last button bridge removed. Fixes the clipped tabs on narrow phones: the avatar hides below 390 px and the logo link below 360 px (measured per role, with and without an Orders count badge) | Tabs fit at 320 to 1360 px for both roles, with a badge; skip link and tab order by keyboard; `PrimaryNav` tests; full regression | 3–4 h |
| MUI-9 to 12 | Tables, one per task: Alerts, Stock Check, Orders, Scan History, on shared parts in `shared/components/table.tsx`. All four done; the old `.table` CSS is deleted | Table semantics, header scope, monospace numbers, phone widths, each table's inline error row in Chrome | 1–2 h each |
| MUI-13 | Page layout CSS (Login, Dashboard, Orders, the Stock Check action cell, and the bell dropdown's panel and item rows) to `sx`. Also fix a phone issue found in MUI-10: at 390 px a row's error message sits at the left of a table scrolled to the right, so it is off-screen; keep it pinned to the visible part of the scroll box. Done: shared `Panel`, `EmptyState`, `Page`, `CardPage`; only `base.css` is left | Screenshots at every width; the error message visible at 390 px | 3–4 h |
| MUI-14 | Delete the generated CSS variables, `base.css` rules MUI now covers (reduced motion moves into the theme) and dead CSS; update UI rules in `CLAUDE.md`, `README.md`, `docs/DESIGN_DECISIONS.md` | No references left; full regression; bundle compared with MUI-0. Done: page-wide rules in `globalStyles.ts`, `Muted` and `VisuallyHidden` replace the utility classes, no stylesheets left; JS 1,064 KB (327 KB gz) vs 881 KB (264 KB) at MUI-0, CSS 8 KB vs 23 KB | 2–3 h |

New pages (Alerts, Insights) are built in MUI from the start.

## 1b. UI and usability phase (Oct 31, done)
Agreed Oct 31 before F1. Alerts get their own tab so acknowledged and resolved alerts keep a history, and the dashboard stops repeating the Stock Check mismatches as a full table.

| Task | Change | Status |
|---|---|---|
| UX-1 | Alerts tab `/alerts` (shopkeeper): Open, Acknowledged and Resolved tiles; filter in the URL; raised, acknowledged and resolved times; Acknowledge; past alerts 50 at a time with Load More; open-count badge on the tab. No backend or rules change (`resolvedAt` was already stored, and the rules already allowed the read) | Done |
| UX-2 | Dashboard: compact Active Alerts summary (up to 5, open first, one-click Acknowledge, View All Alerts) instead of the full table | Done |
| UX-3 | A notification opens its alert's row on the Alerts page, highlighted and focused; the bell's View Alerts opens the page | Done |
| UX-4 | Header: tabs move to a full-width second row below 960 px, so four tabs with counts fit at 320 px (measured); every page names itself in the browser tab title | Done |

Not taken (offered, optional): scan-age warning, Receive Stock renamed Receive Delivery, smaller shelf image.

## 2. Supervisor feedback: history and business intelligence
The analytics decides what history is needed. Alerts, orders and scans are already stored; sales and receipts are not (Record Sale, Receive Stock and Mark Received only overwrite `posCount`), so F1 adds a log.

### F1. Stock change log, Adjust Stock, Part Settings (built Nov 4)
- `stock_movements/{id}`: `product`, `type` (Sale, Receipt, OrderReceived, Adjustment, Reset), `change` (signed), `posBefore`, `posAfter`, `unitCost` and `unitPrice` as at the change, `reason` (Adjustment), `orderId` (OrderReceived), `at`, `by`.
- Written in the same transaction as the `posCount` change: Record Sale, Receive Stock, Adjust Stock and `receiveOrder`. The product names the entry in `lastMovementId`; the rules refuse a POS change without its matching new entry, an entry the product does not match, a faked cost or price, a reason that does not fit the direction, an Order Received entry for an order not moving from Dispatched to Received in the same write, and any edit or delete. Shopkeeper only, including reads.
- **Adjust Stock** (Stock Check row): new count (starts at the camera count), reason (Damaged, Lost or Stolen, Miscount; Found, Customer Return, Miscount), the change and its write-off value at cost.
- **Part Settings** panel and dialog: cost, selling price, margin, reorder level and quantity (0 turns automatic orders off), with `updatedBy` and `updatedAt`.
- **Delivery guard:** Receive Stock warns when a dealer order for the part has been dispatched and points to Mark Received; Receive Anyway still works.
- `acknowledgedBy` on alerts and `receivedBy` on orders.
- `demo_reset` and `seed_products --reset` write a `Reset` entry when they change a POS count (backend only), so the log stays in step.
- Tests: 598 frontend (100 new: planner, validation, repository writes, dialogs, guard, provider), 111 backend. Live (Nov 4): `f1_rest.py`, 31/31 rule checks over REST with real sign-ins on the first publish; `f1.mjs` in Chrome found that a second Part Settings save by the same person was refused (the rule wanted `updatedBy` to change; fixed, republish needed) and that MUI moved focus to the dialog box instead of the first field (fixed in the shared `Dialog`). The rules check script (`.handoff/live-tests/rules_test.py`, 65 cases through the Rules API test endpoint, nothing deployed) needs the service account to have the Firebase Rules permission to test; until then, live REST attack checks after publishing.
- Still to do: live check in Chrome after the user publishes the rules; `seed_history` moves to F3.

### Stock Log tab and undo (Nov 6; Nov 12: now a second view inside the Products tab)
Shopkeeper only; the Stock Log lives inside the Products tab (which holds Part Settings) so the header keeps five tabs, which fit from 375 px. Today by default; filters by part, type and period; 50 at a time with Load More (as alert history). Columns: time, part, type, change, POS before and after, reason, who. Stock Check rows and the Insights stock-flow section link to it filtered to the part. The dealer never sees it. Five tabs are measured at 320 px; if they do not fit, the tab row scrolls (it already can).
One name per part: the Orders and Alerts pages name a part from its id (`partLabel`), Stock Check from the product document; use the product name from `ProductsProvider` everywhere, with `partLabel` only as the fallback (found in the F1 live test, where `zz_part` showed as "ZZ Part" and "Zz Part").
Undo on Record Sale: a few seconds of "Sale recorded. Undo" that writes a reversing entry (never a delete); the analytics leave out both entries.

### F2. History (done by UX-1 and the Stock Log)
- Alert history: the Alerts tab. Order history: the Orders page. Stock changes: the Stock Log (inside Products).
- Notifications stay derived and are never stored; history reads the source records.

### F3. Business intelligence: dashboard summary and Insights page (Nov 7 to 9; built Nov 11 to 12)
**Outcome:** built as the Insights tab and four dashboard tiles (Sales, Gross Profit, Shrinkage, Lowest Days of Cover). Sections built: What To Do, Sales and Profit (with a part ranking and weekly bars over 90 days), Shrinkage, Days of Cover, Reorder Recommendations (with the dealer's lead time). The recommendation uses an average of daily sales, not a median, and What To Do and the recommendations always use the last 30 days. Not built, and listed in `docs/FUTURE_WORK.md`: stock flow, stock value, stockouts and lost sales, Apply, and response and dealer. The definitions as built are in `docs/DESIGN_DECISIONS.md` and `docs/REPORT_NOTES.md`; the plan below is kept as it was.
Shopkeeper only. Calculations are pure, tested functions in `features/insights/analytics.ts`, run in the browser so they also work on the hosted app. Medians, not averages (small numbers). Every chart has a table alternative. The Insights page is lazy-loaded so the main bundle does not grow. A visible "Includes demo data" label appears when the period contains seeded records. Money in LKR from each entry's own cost and price.

Dashboard summary (four tiles, each linking to its Insights section): sales value for the period with the change from the previous one; shrinkage value (Damaged plus Lost or Stolen, at cost); lowest days of cover; typical dealer lead time.

| Section | Shows | Kind |
|---|---|---|
| Sales trend | Units and value per day and part, net of customer returns | Core |
| Shrinkage | Write-offs by reason and part, and as a share of sales | Core |
| Days of cover | Shelf count / median daily sales, against the reorder level | Core |
| Recommendations | Suggested reorder level = median daily sales x lead time + safety margin, next to the current one | Core |
| Stock flow | Sold compared with received per part, linking to the Stock Log | Core (Nov 9) |
| Stock value | POS and shelf counts at cost; the gap is unexplained loss | Core (Nov 9) |
| Stockouts | Hours at zero from the scans (laptop-off gaps counted as unknown) and the estimated lost sales | Core (Nov 9) |
| Apply | Applies a recommended reorder level through Part Settings | Core (Nov 9) |
| Response and dealer | Time to acknowledge and resolve alerts; time per order stage | Core (Nov 9) |

Edge cases each function handles and tests: no sales in the period ("No sales", not 0%); previous period zero ("New", not infinity); under 14 days of sales or 2 received orders ("Not enough history yet", no recommendation); a part with no cost or price ("Set a price in Part Settings", never 0); a part added later (no history, nothing breaks); a price change mid-period (each entry's own price); Reset entries left out; days in the shop's local time.

`seed_history` (moved from F1): about 30 days of sales, receipts, adjustments with reasons, customer returns, Resolved alerts and Received orders, all `seeded: true`; `--clear` removes only seeded documents; `demo_reset` keeps them.

Read cost: at most 90 days of records for two parts, a few thousand reads per visit, well inside the Spark plan's 50,000 per day.

## 3. M6: automatic scanning (Nov 5 to 6, agreed Nov 4)
Why now: Insights reads the scan history, so its shape is decided here first; it is the riskiest piece left (camera, a background thread, free-tier limits); M12 trials need it; FR1 is the only requirement still partly done.

**Settings** (`.env`, validated in `core/config.py`): `AUTO_SCAN_ENABLED` (default false: the master switch), `SCAN_INTERVAL_SECONDS` (60, at least 10), `SCAN_HEARTBEAT_SECONDS` (600), `ALERT_DELAY_SECONDS` (180; 0 alerts at once, for demos), `REORDER_DELAY_SECONDS` (300; `REORDER_CONFIRM_SCANS` low scans in a row are still needed), `MIN_FRAME_BRIGHTNESS` (40, provisional until calibrated on real frames).

**Nov 5, backend (unit tests on fakes, no webcam):**
- The loop: one background thread started and stopped with the app, sharing the scan lock with Scan Now, carrying on after camera errors. One worker only (documented).
- Alerts: an alert opens only when a mismatch has lasted `ALERT_DELAY_SECONDS` (`mismatchSince` on the product); a match clears it and resolves at once. Why time and not scans: a Scan Now right after an automatic scan would otherwise confirm a customer walking to the till.
- Orders: low must last `REORDER_DELAY_SECONDS` (`lowSince`) as well as the low-scan streak, so restocking or a person in front of the shelf cannot order stock. With both at 0 and two presses, the demo works as before.
- Dark frames: a frame darker than `MIN_FRAME_BRIGHTNESS` changes nothing; an automatic scan records the skip in `status/latest`; Scan Now returns a typed error ("Too dark to count..."), shown by the Scan Now button.
- Change-only writes: a scan record only when counts change, plus a heartbeat every `SCAN_HEARTBEAT_SECONDS` (manual scans always save); product status, alert counts, `mismatchSince` and `lowSince` only when they change. `status/latest` every scan, with `lastAttemptAt`, `lastError` and the auto-scan settings. Budget: about 1,500 writes and 7,000 reads a day from the backend plus about 1,440 reads a day per open dashboard, inside the Spark plan's 20,000 and 50,000.
- Scan records gain `trigger` (manual or auto), `brightness`, `captureMs`, `detectMs`, `saveMs` (for M12 and the Scan Now timing question).
- Time comes from an injected clock, so tests control it. `demo_reset` clears `mismatchSince` and `lowSince`.

**Nov 6, browser and live:**
- Camera status on the dashboard: "Last scan 14:02 (40 s ago)"; "Automatic scanning is off"; "Paused until 14:20"; amber "camera not responding" or "no scan for N minutes, check the shop laptop" past twice the interval. Stock Check says its counts are "as of" that time.
- **Pause Scanning** (for restocking): `settings/scanning.pausedUntil`, at most 30 minutes ahead, resumes by itself; shopkeeper only (rules change, the user publishes); the loop checks it before each scan.
- Keep the camera open while automatic scanning is on, only if the step timings show opening the camera dominates; reopen after a failure; release when paused or off.
- Calibrate `MIN_FRAME_BRIGHTNESS` from real frames, lights on and off.
- Live run: the user restarts the backend from VS Code's terminal (macOS camera permission); 1 to 2 hours at 30 s, counting real reads and writes; Chrome checks of the status line and Pause.
- Demo settings documented: `AUTO_SCAN_ENABLED=false` or the delays at 0 for a live demonstration.

## 4. M10: full role-based security
- Final rules: keep every current rule, including `stock_movements` from F1 and the dealer's read of order history. Narrow `products` reads so the dealer no longer sees the shop's costs and selling prices (the dealer's order list needs only the part name, which comes from the order). The user publishes them.
- Backend role check: today any signed-in user, including a dealer, can call `/scan` and `/snapshot`. Add a shopkeeper-only dependency.
- Rules attack tests (see `docs/TESTING.md`).

## 5. M11: Firebase Hosting
- Deploy the React build. Add the hosted origin to `CORS_ORIGINS`. "Scan Now" still only works on the shop laptop.
- Planned (Nov 10): a small thumbnail in `status/latest` (no Cloud Storage), so the hosted app can show the shelf image.
- Check on a phone.

## 6. Model retraining (in parallel, user-run)
- Add background and webcam photos with no parts (`python -m scripts.capture_dataset negatives --count 150`) so the model learns "not a part". Then re-validate; only then consider loosening the box guards.
- Include filters end-on and near the frame edge.

## 7. M12: evaluation (needed for the report)
- 20 shelf arrangements under 3 lighting conditions; average of 50 scans for inference time and for Scan Now click-to-result (live runs on Oct 30 measured 2.8 to 5.4 s against the 3 s target, with model inference under 40 ms, so the time is in camera capture or the Firestore writes; if the average is over, find which step is slow before changing anything); 10 sync-latency trials; free-tier usage; functional test cases for FR1 to FR9 plus History and Insights; usability test with 3 people.
- The detection and lighting trials do not depend on the new UI; the user can start them earlier.

## 8. M13: report
- Implementation and Evaluation chapters, including the business intelligence features and the MUI decision. Replace ESP32 with webcam and Realtime Database with Firestore everywhere. Include the licence note (Ultralytics is AGPL). State that demo history is synthetic and marked `seeded`. Any AI-use disclosure follows the university policy; that decision is the user's.

## After submission (backlog)
Future work and known limitations, kept for the report, are in `docs/FUTURE_WORK.md`. Anything cut at a checkpoint above goes there too.
- Small clean-ups: remove the dead `Detector.warmup`.
- Known, not actionable: `npm audit` reports `@grpc/grpc-js` (not in the browser bundle; do not downgrade firebase); Python 3.11 end-of-life warnings from Google libraries.
