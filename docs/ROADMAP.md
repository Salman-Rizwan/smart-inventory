# Roadmap

Deadlines: code freeze Nov 7, 2026; submit Nov 8; final submission Nov 9. Done so far: M1 to M5, M7, M8, M9 and notifications Stage A (see `README.md` Status).

Plan agreed on Oct 28 after the interim viva. It covers the supervisor's feedback (a history of past alerts, and business intelligence analytics on the dashboard) and the move to Material UI.

## Time budget
About 80 working hours from Oct 28 to Nov 6. Must-have work is about 57 to 77 hours; stretch work is about 15 to 20 hours and is done only when ahead of schedule. The report (M13) is written alongside from about Nov 3.

| Date | Work | Kind |
|---|---|---|
| Oct 28 | MUI-0 baseline, MUI-1 trial (go/no-go), MUI-2 theme | Must |
| Oct 29 | MUI-3 Button, MUI-4 StatusBadge, MUI-5 FormField | Must |
| Oct 30 | MUI-6 feedback components, MUI-7 NotificationMenu, MUI-8 app shell | Must |
| Oct 31 | MUI-9 to MUI-12 tables, MUI-13 page layout, MUI-14 remove tokens | Stretch |
| Nov 1 | F1 stock change log, seed script, `demo_reset` change (user publishes the rules) | Must |
| Nov 2 | F2 History page; F3 pure analytics functions | Must |
| Nov 3 | F3 dashboard summary and Insights page | Must (extra sections stretch) |
| Nov 4 | M6 automatic scanning | Must |
| Nov 5 | M10 final rules and role checks; M11 Hosting (thumbnail stretch) | Must |
| Nov 6 | M12 measurements and screenshots, full regression, demo rehearsal | Must |
| Nov 7 | Code freeze | |

## Checkpoints
- **Oct 28, MUI trial:** the user decides go or stop after MUI-1. Stop means keep the token CSS; the rest of the plan is unchanged. Decided: go (Oct 29).
- **Oct 30 evening:** MUI-0 to MUI-8 done. If not, finish them by noon Oct 31 and skip the stretch block.
- **Oct 31 evening, MUI stop:** whatever is not converted keeps its stylesheet, which reads the CSS variables generated from the theme, so the look stays consistent, and is finished after submission.
- **Nov 3 evening:** F3 core done. The extra Insights sections are dropped if not.
- **If late, cut in this order:** MUI-9 to MUI-14; the M11 thumbnail; the Insights response and dealer section. Never cut M6, M10, M11 deployment or M12.
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
| MUI-7 | `NotificationMenu` panel styling; stays a disclosure, not an ARIA menu | `aria-expanded`, Escape closes, focus returns to the bell, unread announced | 1–2 h |
| MUI-8 | App shell: header, nav (links stay `a`), skip link | Phone header overflow (fixed in `544615c`) does not return | 3–4 h |
| MUI-9 to 12 | Tables, one per task: Alerts, Stock Check, Orders, Scan History | Table semantics, header scope, monospace numbers, phone widths | 1–2 h each |
| MUI-13 | Page layout CSS (Login, Dashboard, Orders) to `sx` | Screenshots at every width | 3–4 h |
| MUI-14 | Delete the generated CSS variables, `base.css` rules MUI now covers (reduced motion moves into the theme) and dead CSS; update UI rules in `CLAUDE.md`, `README.md`, `docs/DESIGN_DECISIONS.md` | No references left; full regression; bundle compared with MUI-0 | 2–3 h |

New pages (History, Insights) are built in MUI from the start.

## 2. Supervisor feedback: history and business intelligence
The analytics decides what history is needed. Alerts, orders and scans are already stored; sales and receipts are not (Record Sale, Receive Stock and Mark Received only overwrite `posCount`), so F1 adds a log.

### F1. Stock change log (about 1 day)
- New collection `stock_movements/{id}`: `product`, `type` (Sale, Receipt, OrderReceived), `qty`, `posBefore`, `posAfter`, `at`, `by`, `orderId` (OrderReceived only), `seeded` (demo data only).
- Written in the same transaction as the `posCount` change: Record Sale, Receive Stock, and the `receiveOrder` transaction. The log can never disagree with the POS.
- Rules: shopkeeper only; fields validated; `posBefore` and `posAfter` must match the product before and after; `by` is the signed-in user and `at` the request time; no update or delete; a `posCount` change without a matching log entry is refused. The user publishes the rules; compare the deployed ruleset first.
- Seed script `python -m scripts.seed_history [--clear]`: about 30 days of sales, receipts, Resolved alerts and Received orders, all marked `seeded: true`. `--clear` removes only seeded documents.
- `demo_reset` keeps seeded documents (they are all closed, so they never block automatic ordering).
- Tests: transaction logic, parsers, seed planning, rules attack checks (dealer writes, edits, deletes, mismatched counts, unlogged POS change).

### F2. History page `/history` (about 0.5 to 1 day)
- Alerts in every state, purchase orders with each step's time, and stock changes. Filters by part, type and date; 50 at a time with Load More.
- Shopkeeper sees everything; the dealer sees order history only (read-only).
- Clicking a notification opens its row here, highlighted. This replaces Notifications Stage B.
- Notifications stay derived and are never stored; History reads the source records.
- Tests: queries and parsers, filters, paging, empty and error states, axe.

### F3. Business intelligence: dashboard summary and Insights page (about 2 days)
Shopkeeper only. Calculations are pure, tested functions in `features/insights/analytics.ts`, run in the browser so they also work on the hosted app. Medians, not averages (small numbers). Every chart has a table alternative. The Insights page is lazy-loaded so the main bundle does not grow. Charts use MUI X Charts (free MIT version). A visible "Includes demo data" label appears when the period contains seeded records.

Dashboard summary (period selectable), each linking to its Insights section:
1. Units sold, with the change against the previous period.
2. Lowest days of cover: the part closest to running out.
3. Discrepancy units: stock the POS claims but the shelf does not have.
4. Typical dealer lead time (created to received).

Insights page (7, 30 or 90 days; all parts or one):

| Section | Shows | Decision it supports | Kind |
|---|---|---|---|
| Sales trend | Daily sales per part | What sells; is demand rising | Core |
| Stock flow | Sold compared with received per part | Over- or under-stocking | Core |
| Shelf stock over time | Camera count per part (from scans) | When the shelf actually runs low | Core |
| Days of cover | Per part, against its reorder level | Which part to reorder first | Core |
| Discrepancies | Alerts and missing units per part | Where stock goes missing | Core |
| Recommendations | Suggested reorder level = average daily sales x dealer lead time + safety margin, next to the current level | Turns data into an action | Core |
| Response and dealer performance | Time to acknowledge and resolve alerts; time per order stage | Shop responsiveness; dealer reliability | Stretch |

Read cost: at most 90 days of records for two parts, a few hundred reads per visit, well inside the Spark plan's 50,000 per day.

## 3. M6: automatic scanning every 60 s
- A background loop in the backend calls the same scan service every `SCAN_INTERVAL` seconds (new `.env` setting, validated in `core/config.py`).
- Free-tier budget: write a `scans` document only when the counts change, plus a heartbeat every 10 minutes. `status/latest` is updated every scan.
- Must not overlap with a manual Scan Now (one scan at a time); camera errors are logged and the loop carries on.
- No rule change (the backend uses `firebase-admin`).
- Tests with the fake camera and fake repository; no real webcam.

## 4. M10: full role-based security
- Final rules: keep every current rule, including `stock_movements` from F1 and the dealer's read of order history. The user publishes them.
- Backend role check: today any signed-in user, including a dealer, can call `/scan` and `/snapshot`. Add a shopkeeper-only dependency.
- Rules attack tests (see `docs/TESTING.md`).

## 5. M11: Firebase Hosting
- Deploy the React build. Add the hosted origin to `CORS_ORIGINS`. "Scan Now" still only works on the shop laptop.
- Stretch: a small thumbnail in `status/latest` (no Cloud Storage), so the hosted app can show the shelf image.
- Check on a phone.

## 6. Model retraining (in parallel, user-run)
- Add background and webcam photos with no parts (`python -m scripts.capture_dataset negatives --count 150`) so the model learns "not a part". Then re-validate; only then consider loosening the box guards.
- Include filters end-on and near the frame edge.

## 7. M12: evaluation (needed for the report)
- 20 shelf arrangements under 3 lighting conditions; average of 50 scans for inference time; 10 sync-latency trials; free-tier usage; functional test cases for FR1 to FR9 plus History and Insights; usability test with 3 people.
- The detection and lighting trials do not depend on the new UI; the user can start them earlier.

## 8. M13: report
- Implementation and Evaluation chapters, including the business intelligence features and the MUI decision. Replace ESP32 with webcam and Realtime Database with Firestore everywhere. Include the licence note (Ultralytics is AGPL). State that demo history is synthetic and marked `seeded`. Any AI-use disclosure follows the university policy; that decision is the user's.

## After submission (backlog)
- Anything cut at a checkpoint above.
- Dealer dashboard (the dealer's own performance and order trends).
- Dashboard: search and filter for many products, scan-age indicator.
- Page title per route; phone layout of tables if MUI-9 to MUI-12 are cut.
- Confirmation or undo for Accept and Dispatch.
- Optional Request Restock button; relabel Receive Stock to Receive Delivery. A delivery entered both by Receive Stock and by Mark Received would be counted twice; decide the wording or guard.
- Password reset; idle timeout.
- Backend: rate limiting, audit trail for order and alert changes (stock changes are logged by F1), split `ScanRepository` (scans, products, alerts, orders), remove dead `Detector.warmup`.
- Tooling: CI running the test and lint commands; move `.handoff/live-tests` into the repo if the user wants; code-split the main JS chunk (864 KB).
- Known, not actionable: `npm audit` reports `@grpc/grpc-js` (not in the browser bundle; do not downgrade firebase); Python 3.11 end-of-life warnings from Google libraries.
