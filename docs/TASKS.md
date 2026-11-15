# Task Checklist (Nov 5 to Nov 14)

The roadmap (`docs/ROADMAP.md`) says what and why; this file breaks each step into small actions, each with its **script tests** (automated: pytest, vitest, rule checks) and its **live tests** (real Firebase, real Chrome, real webcam). A task is done only when both pass. Tick items here as they are finished.

## Where we are and what comes next (updated Nov 14)

**One naming scheme: Groups.** The live plan is by **Group**. The older labels still appear in the detailed rows below, in `README.md` and in `docs/ROADMAP.md`, and they name the same work: **M-labels** are the original milestones (M10 security, M11 Hosting, M12 evaluation, M13 report), and SL, AN, IN, SH and R are the ids of the detailed tables. When talking about the plan, say Group.

| Group | Items | Original labels | What it is | Status |
|---|---|---|---|---|
| 0 | (decisions) | | Camera, kept orders, usability test with the user's brother | Done Nov 11 |
| 1 | 9, 25 to 27a | M10-1 to M10-3, SL-5 | Least-privilege access, Cancel Order, one name per part | Done Nov 11 |
| 2 | 10 to 15, 18 to 22 | SH-1, AN-1 to AN-5, AN-L1, IN-1 to IN-4 | Insights core on seeded history | Done Nov 11 |
| 2b | 38 to 44 | | Gross profit, What To Do, 90-day seed, Products tab, dashboard order, full regression | Done Nov 12 |
| 3 | 28, 29 | M11-1, M11-2 | Hosting: deployed, and Scan Now from the hosted page | **Done Nov 14** (one look left, see below) |
| 5 | 5 to 7, and 7a | SL-1 to SL-3 | Stock Log as a second view inside Products, plus a focus check on the busy buttons | After Group 4 (the user's choice, Nov 14) |
| 4 | 31 to 35 | M12-1 to M12-6 | Evidence for the report: accuracy, timing, sync and usage, functional cases, usability | **Next** |
| 6 | 36, 37 | M12-7, R-1 to R-3 | Full regression, fresh clone, version 1.0.0, tag and deploy from it | After Groups 4 and 5 |
| 7 | 8, 16, 17, 23, 24, 30 | SL-4, AN-6, AN-7, IN-5, IN-6, M11-3 | Optional extras, proposed cuts | The user decides (list below) |
| Report | | M13 | The written report, from `docs/REPORT_NOTES.md` and `docs/FUTURE_WORK.md` | The user |

**Order of work (the freeze date is not driving it at the moment, the user's decision Nov 14): Group 4 first (the user's choice on Nov 14; it was Group 5 first before), then Group 5, then Group 6, with Group 7 decided by the user at any point.** Two consequences: the one-day usage count takes 24 uninterrupted hours, so it is started first and runs while the measuring tools are built (code work and unit tests do not touch Firestore); and the functional cases (item 34) are run in two parts, FR1 to FR9 plus Insights and Hosting now, the Stock Log cases after Group 5 is built. Group 6 comes last because it re-runs everything on the final code.

**Group 5, Stock Log (agreed design: `/products/log`, a second view inside Products, five tabs only).** Steps, each finished and tested before the next:
1. Pure view logic: period (Today, 7, 30, 90 days), part filter, URL round trip, the "By" label ("You", "Another user", the script's name, "Demo data"). No type filter (trimmed Nov 12).
2. Repository and hook: `stock_movements where at >= start, orderBy at desc, limit(size + 1)`, 50 at a time with Load More, the cache-skip rule from alert history, no composite index, no rules change; the part filter works on the loaded rows and the page says so.
3. The page and the Parts / Stock Log switch: loading, error, empty and loaded states; shopkeeper only, the dealer is sent to Orders; the Products tab stays current and five tabs still fit.
4. A "History" link in each Stock Check part cell, opening `/products/log?part=ID&period=30`.
5. Live checks on the seeded history (147 entries, no `zz` rows needed): Load More, filters, links, axe at six widths, keyboard, the dealer redirect.
**Progress Nov 15 (built during the usage window, code and unit tests only):** steps 1 to 4 done. `features/inventory/stockLog.ts` (+11 tests), `StockLogPanel.tsx` (+8), the Parts / Stock Log switch on `ProductsPage` (+2) and the `/products/log` route, the History link in each Stock Check row (+1); frontend 860 tests, typecheck, oxlint, build green. **Changed from step 2 as written:** no new query: the log filters the stock changes `InsightsProvider` already keeps live (180 days), so no extra reads and the part filter covers the whole period; the table shows 50 rows at a time with Show More (`docs/DESIGN_DECISIONS.md`). Steps 5 (live checks) and 6 (focus check) wait for the window to end.

**Dealer flow check, Nov 15 (outside the numbered items):** reviewed and checked live with both roles; two fixes (the dealer's tab badge; a cancelled-order notification opens the Closed view), deployed and checked on the hosted address. Results in `docs/REPORT_NOTES.md` (Testing); follow-ups in `docs/FUTURE_WORK.md` (Orders and the dealer).
6. Item 7a, the focus check, listed in the plan but never numbered until now: a button that is disabled while it saves loses keyboard focus in Chrome (fixed for Pause and Resume Scanning only). Measure Scan Now, Record Sale, Receive Stock, Acknowledge and the order steps in Chrome, and if focus is lost fix it once in the shared `Button` (keep it focusable with `aria-disabled` while busy), with tests.

**Group 4, evidence (nothing is built yet; the usage count starts first, then the tools).** There is no accuracy, timing or latency script in the repository. Steps:
0. Start the one-day usage count first (it is redone, see the finding below): laptop on the charger (it was on battery on Nov 14), lid open, still, facing the parts, backend running from VS Code, `caffeinate -i` running; note the start time and the console Usage figures; the scan records prove the window afterwards. While it runs, only code work and unit tests; any live run that touches Firestore (timing, sync, regression) is logged as an exception with its time and rough size, or waits until the window ends.
1. Build the three measuring tools with tests: the accuracy capture and scoring script (scored on a fixture), the Scan Now timing run (50 runs, once on the laptop's own page and once from the hosted page), and the sync-latency run (10 trials, two browsers).
2. Item 31 accuracy: **the user arranges the shelf** under three lighting conditions (the number of arrangements, 20 or 10, is the user's decision); the script records each capture.
3. Item 32 timing and item 33 sync latency: run by me with scanning paused as needed.
4. Item 33 usage: **the one-day count must be redone** (see the finding below), then read at the end from the Firebase console Usage tab.
5. Item 34 functional cases FR1 to FR9, plus Insights and Hosting, each run and recorded; the Stock Log cases are added after Group 5.
6. Item 35 usability test: the user with their brother (parked with the user).

**Group 6, release.** Item 36: the full regression updated for the Stock Log and Hosting (with real data snapshotted and restored), screenshots for the report, a fresh-clone run from the README alone, a secrets search, `SIMULATED_PARTS` empty and no `zz_` products, `package.json` 1.0.0. Item 37 (the user): pull request dev to main (merge commit), tag `v1.0.0`, deploy Hosting from the tag, then `hosting_check.mjs` on the live address and `deployed_rules.py`.

**Group 7, optional extras (the user has not confirmed any; each is either built or stays in `docs/FUTURE_WORK.md`).** My suggested order if any are wanted, by value for effort: item 24 Apply a recommended reorder level (small, a clear usability gain); item 8 undo on Record Sale (a rules change the user publishes); item 30 hosted thumbnail (removes the need for Chrome's local network permission just to see the shelf image, and lets a remote shopkeeper see it); item 23 stock flow and the Response and dealer section (the dealer's side of the analytics); item 17 stock value; item 16 stockouts and lost sales (the largest, it needs the scan series).

**Findings on Nov 14 that change the plan:**
- **The one-day usage count of Nov 12 to 13 is invalid.** There are no scan records between Nov 12 01:27 and Nov 14 16:06, and a heartbeat is written every 10 minutes while scanning runs, so the backend was not scanning (most likely the laptop slept: `caffeinate -i` does not stop sleep when the lid is closed, and the camera needs the lid open anyway). The redo needs the laptop awake, lid open, facing the parts, backend running for 24 hours, and the same scan records are the proof that the window had no gap longer than about 11 minutes.
- **Group 3 leaves one look and one decision.** Look: the Chrome permission prompt itself, once the user's Chrome has relaunched into version 157 (a fresh Chrome 157 blocks the hosted page until local network access is allowed; the user's older running Chrome did not ask). Decision, after that: whether the hosted dashboard should load the shelf image only on request, so the prompt does not appear at page load (`docs/FUTURE_WORK.md`).
- **Model retraining is not part of any group.** It stays in future work; the accuracy runs (item 31) measure the current model, and the report says so.

## Remaining work (updated Nov 14)
Everything left, numbered 1 to 44 (38 to 43 added Nov 12); IDs point to the detailed rows below, each with its script tests and live tests. "User" marks a step only the user can do. The order and the dependencies are in the section above; the group table under **Plan by group** near the end of this list holds the severity of each.

**Done:** M1 to M5, M7 to M9, notifications, the move to Material UI, UX-1 to UX-4, F1, M6 automatic scanning (every live check finished Nov 11), M10 access control, Cancel Order, simulated parts for live testing (all checked live Nov 11), Group 2 Insights core (Nov 11 evening: seeded history, analytics, dashboard tiles, Insights page, independent check; all checked live), the Insights decisions and dashboard layout (Nov 12, items 38 to 43: gross profit, What To Do, a 90-day seed, the Products tab, the reordered dashboard), and **Group 3 Hosting (Nov 14: deployed to `https://smart-inventory-da834.web.app`, CORS, hosted wording, Scan Now from the hosted page; the live check passes both roles and the cache headers)**. Tests: backend 315, frontend 838.

**Open decisions and parked items (Nov 14):** the Group 7 list above is unconfirmed; the number of accuracy arrangements (20 or 10 times 3 lighting conditions) is the user's choice; the usability test is parked with the user (they run it with their brother and report the outcome); the two Pending orders are kept; the camera is the laptop's own and the laptop must stay still facing the shelf during live tests (people in the frame read as 0, 5 or a wrong count). Automatic scanning is ON in `.env` (30 s interval).

**Before any live test:**
- The shelf camera is the MacBook Air's built-in camera (`CAMERA_INDEX=0`, the user's decision). Whoever uses the laptop is in the frame: on Nov 11 it read 0 and 0 while the laptop was being used, and a face once scored 0.54 as a spark plug. Open `backend/snapshots/latest.jpg` and check `status/latest.counts` = 4 and 1 before any live test; ask the user to Pause Scanning while they work on the laptop.
- `SIMULATED_PARTS` must be empty except during a simulated-part test (`docs/TESTING.md`).
- The two Pending orders (spark plug, Oct 28; petrol filter, Nov 5, a leftover from the lens test) are KEPT by the user's decision: do not delete or cancel them. They block automatic ordering for both real parts; use a simulated part to test ordering.
- Run the regression with scanning paused (the loop resolves the `zz` alerts on its next matching scan).

1. M6: finish automatic scanning
   - [x] 1. Gap recheck, live: an old timer must not open an alert after a gap (`gap_live.py`). Nov 11: 4/4.
   - [x] 2. Every camera status in Chrome (live, off, paused, too dark, camera not responding, no recent scan) with axe at all widths (M6-L5). Nov 11: all six produced for real (`camstates.mjs`), axe 0 at 6 widths.
   - [x] 3. Pause end to end: the loop stops while paused and resumes on time. Nov 11: `pause_live.py` 5/5, and from the button in Chrome (`camstates.mjs pause`).
   - [x] 4. Full regression updated for the camera status line and run (M6-L1). Nov 11: 56/56, Scan Now 2.8 s.
2. Stock Log, undo and part names
   - [ ] 5. Stock Log data: newest first, 50 at a time, period, part and type filters (SL-1).
   - [ ] 6. Stock Log page as a second view inside Products (Nov 12 decision: the header stays at five tabs, which fit from 375 px); filters in the URL (SL-2).
   - [ ] 7. Link from each Stock Check row to that part's log (SL-3).
   - [ ] 7a. Focus check on the other busy buttons (added Nov 14; it was in the Group 5 row of the plan but had no item): Scan Now, Record Sale, Receive Stock, Acknowledge and the order steps lose keyboard focus while they save, as Pause Scanning did; measure in Chrome, fix once in the shared `Button` if needed, with tests.
   - [ ] 8. Undo on Record Sale; rules change (SL-4). User publishes the rules.
   - [x] 9. One name per part; `productName` on new orders (SL-5). Nov 11: built, script-tested and seen live (the dealer's row shows the stored name) (orders and order notifications use it; alerts still use the class-name label, see FUTURE_WORK).
3. Demo history and analytics
   - [x] 10. `seed_history`, ending exactly at the real POS counts (SH-1). Nov 11: planned backwards from the real POS counts (55 entries, 4 Received orders, 6 Resolved alerts, ids `seedh-*`); applied, cleared, verified identical apart from the agreed cost and price fields, applied again. The two Pending orders untouched. Seeded scans left out (user's decision: only the cut stockouts section would read them).
   - [x] 11. Data loader for a period (AN-1). Nov 11: `InsightsProvider` holds two live queries (stock changes by `at`, orders by `createdAt`, 180-day window, single-field filters, no index); 64 reads per session on the seeded data, shared by the dashboard tiles and the page.
   - [x] 12. Sales, net of returns (AN-2). Nov 11: `analytics.ts`, 40 tests with the parsers.
   - [x] 13. Shrinkage (AN-3). Nov 11.
   - [x] 14. Days of cover (AN-4). Nov 11: shelf count over average daily sales (user's decision: the camera count).
   - [x] 15. Reorder recommendations (AN-5). Nov 11: dealer-wide median lead time; 14 days of history and 2 deliveries required.
   - [ ] 16. Stockouts and lost sales (AN-6).
   - [ ] 17. Stock value and period comparison (AN-7).
   - [x] 18. `insights_check.py`, an independent recomputation (AN-L1). Nov 11: `insights_live.mjs` compared the page with the script at 7, 30 and 90 days and with the part filter: every tile, table row and per-day figure equal (25 checks per run).
4. Insights
   - [x] 19. Charts library at an exact version; Insights lazy-loaded (IN-1). Nov 11: `@mui/x-charts` 9.17.0 pinned; `React.lazy` route; a test keeps the library behind the page; main bundle 1,126 to 1,140 kB (analytics and tiles), Insights chunk 347 kB (109 kB gzipped).
   - [x] 20. Insights page: 7, 30 or 90 days, part filter, "Includes demo data" (IN-2). Nov 11: period and part in the URL (a race between two quick clicks found live and fixed with a functional update); axe 0 at 320, 390, 768, 1024, 1360 and 1470 px; four tabs fit at 320 px (five from Nov 12, fitting from 375 px, see item 42); keyboard reach checked (`insights_ui.mjs`, 27 checks, 37 now).
   - [x] 21. Core sections with table alternatives (IN-3). Nov 11: sales and shrinkage charts each with a table disclosure; days of cover and recommendations as tables; every section states its definition.
   - [x] 22. Four dashboard tiles linking to their sections (IN-4). Nov 11: "Business at a Glance" panel; a tile opens its section with focus on the heading (seen live).
   - [ ] 23. Stock flow, stock value, stockouts, response and dealer (IN-5).
   - [ ] 24. Apply a recommended reorder level (IN-6).
5. M10 security
   - [x] 25. Final rules; the dealer no longer reads products (M10-1). Published Nov 11 05:36 UTC (dealer reads purchase orders only, plus the Cancel Order rule). `m10_rest.py` 38/38, `f1_rest.py` 32/32, `pause_rest.py` 11/11.
   - [x] 26. Backend: Scan Now and the shelf image for the shopkeeper only (M10-2). Nov 11: built (`require_shopkeeper`, `RoleChecker` with a 5-minute cache, typed 403), backend 252 tests; live: the dealer's token gets 403 `forbidden` for both, the shopkeeper's 200, no token 401.
   - [x] 27. Dealer pages without product reads (M10-3). The dealer's pages already read no products (ProductsProvider is shopkeeper-only); names now come from `productName`. Live: full regression 56/56 under the new rules, no permission errors in either role.
   - [x] 27a. Cancel Order (added Nov 11, user's decision): shopkeeper cancels Pending or Accepted with a reason; Cancelled state, Closed filter, Cancelled tile, dealer notified if they had accepted it; backend no longer counts it as open. Built and script-tested (frontend 674 tests). Live (`cancel_live.mjs`, both roles): cancelled with a reason, moved to Closed with the reason shown, the dealer's tile and notification updated live, no Cancel on a dispatched order, axe 0; dialog checked at 1360, 390 and 320 px (`cancelui.mjs`). Reorder after a cancel: checked live on a simulated part, `zz_brakepads` (`sim_reorder_live.py` 7/7, Nov 11): first order after 2 low scans and the 5-minute delay, cancelled by the shopkeeper over REST, no new order one scan later, a fresh one 314 s after the first low scan following the cancel, and only one. Teardown left no trace; real orders and alerts unchanged.
6. M11 Hosting
   - [x] 28. (Done Nov 14: redeployed 16:34 IST, `hosting_check.mjs` on the live address passes every check including both cache headers.) Build and deploy; hosted origin in `CORS_ORIGINS` (M11-1). User deploys or approves. **Nov 12 (built, not deployed):** `firebase.json` (Hosting only, SPA rewrite, cache headers) and `.firebaserc`, guarded by `hostingConfig.test.ts`; the hosted origins are in the backend's default `CORS_ORIGINS` with `test_cors.py` (10 tests; `.env` needs no change, restart the backend); the production build served locally with `hosting_check.mjs`: 21 checks for both roles on real Firebase, all pass. **Nov 14:** deployed by the user (16:04 IST); `hosting_check.mjs` on the live `.web.app` address passed 21 of 22 (the failure was the home page's cache header: `/index.html` is redirected to `/`, so its rule never applied). Fixed in `firebase.json` (no-cache on every path, assets rule after it), verified on the hosting emulator, frontend 838 tests. Left: the user redeploys, then `hosting_check.mjs` again (it must pass 22 of 22).
   - [x] 29. (Done Nov 14: Scan Now and the shelf image work from the hosted page in the shopkeeper's Chrome; in a fresh Chrome 157 the page is blocked until local network access is allowed, and the hosted wording was checked there. Remaining: only seeing the prompt in headed Chrome 157 after the relaunch; details in `docs/REPORT_NOTES.md`.) Scan Now from the hosted page on the shop laptop (M11-2). **Nov 12:** the hosted wording is built and checked in Chrome on `hosted.localhost` (`hosted_messages.mjs`, desktop and phone, axe 0, no scan run): Scan Now says it works only from the shop laptop and what to allow; the shelf image panel says the image lives on the laptop. Left: the real check on the hosted address with the backend restarted (Chrome's local network prompt; steps in `docs/REPORT_NOTES.md`).
   - [ ] 30. Shelf thumbnail on the hosted app (M11-3).
7. M12 evaluation (results go into `docs/REPORT_NOTES.md`)
   - [ ] 31. Detection accuracy, 20 arrangements x 3 lighting conditions (M12-1). User arranges the shelf. **Tool built Nov 15:** `backend/scripts/accuracy_run.py` (`capture <run> --conditions a,b,c --arrangements N`, 3 frames each, the backend's own camera, model and settings, nothing written to Firestore, refuses to start while the backend is running; `score <run>` prints the Markdown tables; images and CSV in `backend/evaluation/<run>/`, gitignored), 19 tests in `tests/test_accuracy_run.py`. Runs after the usage window (it needs the camera, so the backend is stopped).
   - [ ] 32. Scan Now timing, 50 runs (M12-2). **Tools built Nov 15 (local kit, `.handoff/live-tests/`):** `scan_timing.mjs` (in-page timer from the click to the result on screen, counts checked on every run, CSV and Markdown rows; hosted mode opens a visible Chrome with its own profile for the local network permission), `scan_timer.mjs` (10 tests together with `stats.test.mjs`, the timer checked in Chrome on a fake page), `m12.py pause|resume|breakdown` (backend step times from the scan records). Run after the usage window: 3-run check first, then 50 on the laptop page and 10 on the hosted page.
   - [ ] 33. Sync latency and one day of free-tier usage (M12-3, M12-4). **Nov 14: the first usage count (Nov 12 01:30 to Nov 13 01:30) is invalid**: there are no scan records from Nov 12 01:27 to Nov 14 16:06, so the backend was not scanning (the laptop most likely slept). Redo it with the lid open and the laptop awake; valid only if the scan records show no gap over about 11 minutes. The service account cannot read Cloud Monitoring (403), so the figures come from the Firebase console Usage tab. No sync-latency tool exists yet. **Redo started 06:42 IST Nov 15** (charger from 06:48, `caffeinate -dis`, no `--reload`); read the console's hourly buckets 07:00 Nov 15 to 07:00 Nov 16 after 08:00 Nov 16, and prove it with `scan_gaps.py 2026-11-15T01:12:18 24`. **Sync tool built Nov 15:** `sync_latency.mjs` (two shopkeeper sessions; A changes `zz_sync`'s Reorder At, B's table shows it; 10 trials), `sync_watch.mjs` (4 Chrome tests on fake pages, one clock shared), `m12.py sync-setup|sync-teardown`. `zz_sync` is never counted by the camera, so the backend never reconciles, alerts on or orders it, and scanning can stay on.
   - [ ] 34. Functional test cases FR1 to FR9 plus Stock Log and Insights (M12-5). **Case table written Nov 15** in `docs/REPORT_NOTES.md` ("Functional test cases": 25 cases, FR1 to FR9, Insights, Hosting, each with its deciding script check); run after the usage window. TC7.1 needs `SIMULATED_PARTS` and a backend restart by the user.
   - [ ] 35. Usability test with 3 people (M12-6). User runs it. **Kit written Nov 15:** `docs/USABILITY_TEST.md` (10 shopkeeper tasks, SUS, what to send back); Claude prepares and restores the data around the session.
8. Release
   - [ ] 36. Full regression, screenshots, fresh-clone check, no secrets, version 1.0.0 (M12-7, R-1, R-2). **Trial runs Nov 15:** fresh clone of commit 3611226 set up from the README alone (Python 3.11 venv, both requirements files, `npm install`): backend 334 tests and ruff clean, frontend typecheck, 860 tests, oxlint and build all pass with no `.env` and no service account (the README's first-time list was added the same day); secrets search over every tracked file and the whole history clean (only the public Firebase web key); `regress.mjs` extended for the Stock Log (7 checks). Repeat the fresh clone on the release tag.
   - [ ] 37. PR dev to main (merge commit), tag `v1.0.0`, deploy, smoke test (R-3). User.

9. Insights decisions and dashboard layout (added Nov 12 by the user's decision; each step tested before the next)
   - [x] 38. Tile figures never split mid-number: the tile is a size container and the figure scales with it. Live: `tilefit.mjs`, 24 combinations (4 pages x 6 widths), after a Chrome walk found "LKR 31,800." / "00" on the dashboard.
   - [x] 39. Analytics: gross profit and margin (each entry's own price and cost; uncosted units noted), part ranking, weekly bars over 90 days, What To Do (first matching rule). Pure, tested; `insights_check.py` rewritten from the definitions.
   - [x] 40. Seed 90 days instead of 30 (147 stock changes, 12 received orders, 18 resolved alerts); snapshot, clear, apply, verified: POS still 4 and 1, both Pending orders and the 14 real alerts untouched.
   - [x] 41. Insights page: Gross Profit tile replaces Dealer Lead Time (lead time now beside Recommendations), What To Do list, Sales and Profit with the ranking, a data table per bar. Live: `insights_live.mjs` equal to the script at 7, 30, 90 days and per part (175 checks over five runs, 0 differences). Found live: the 90-day table said "raise to 3" while the advice said "raise to 2"; recommendations now use the same 30-day basis.
   - [x] 42. Products tab (`/products`, shopkeeper only): Part Settings moved off the dashboard, `?part=ID` highlights the row and focuses its Edit button, the Insights advice links to it. Live: `products_ui.mjs` 19 checks (axe 0 at six widths, Cancel returns focus, dealer redirected). Five tabs fit from 375 px; narrower the strip scrolls and the current tab is kept in view.
   - [x] 43. Dashboard order: alerts (one row when none), Business at a Glance, Stock Check with the counts folded in, shelf image beside Recent Scans from 1100 px. 2,864 px to 1,517 px at 1360 px wide. Live: `insights_ui.mjs` 37 checks, `states.mjs` 43 states axe 0, F1 33/33 with Part Settings on Products.
   - [x] 44. Full regression with a real Scan Now, on the new layout (Nov 12, 00:45): 56/56 across both roles (sign-in, routing, notifications, the order chain, Stock Check and alerts, axe on every screen, phone width, and a real Scan Now: 1 Petrol Filter and 4 Spark Plug, 29 ms inference, 2,829 ms click to result, target 3 s). Scanning was paused for the run and resumed after; the temporary `zz` data was removed. The run changes the real POS counts (its Mark Received, Record Sale and Receive Stock steps), so the real data was restored from the snapshot with `restore --keep-scans` and verified identical (POS 4 and 1, both Pending orders, no `zz` left).

Then the report (M13, user), using `docs/REPORT_NOTES.md` and `docs/FUTURE_WORK.md`.

## Plan by group (agreed Nov 11 as "Plan to the freeze"; reordered by dependency Nov 14)
Final submission Nov 15 and the code freeze on the morning of Nov 14 were the user's dates (decided Nov 11). On Nov 14 the user asked to stop planning around them for now, so the **Order** column is by what depends on what, and the "Where we are and what comes next" section at the top says what each group still contains. The remaining items were grouped by severity and by what each gives:

| Group | Items | Severity | What it gives | Order |
|---|---|---|---|---|
| 0, user | Camera (laptop camera kept), leftover order (kept), freeze date (Nov 14), usability test (the user with their brother, outcome reported later) | Decided | — | Done Nov 11 |
| 1 | 9, 25, 26, 27, plus Cancel Order (27a) | Must | Least-privilege access for the dealer; FR9 and NFR6 done | **Done Nov 11** |
| 2 | 10 to 15, 18 to 22 (Insights core) | Must: the supervisor's feedback | Insights tab (sales, shrinkage, days of cover, reorder suggestions) and four dashboard tiles, on seeded demo history | **Done Nov 11 evening** |
| 2b | 38 to 44 (Insights decisions, dashboard order, Products tab) | Must: the user's decision Nov 12 | The shopkeeper sees profit and one next step per part, and a dashboard of about 1,500 px | **Done Nov 12** |
| 3 | 28, 29 (Hosting) | Must | Public URL for both roles; Scan Now from the hosted page on the laptop | **Done Nov 14** |
| 5 | 5 to 7 (simple Stock Log) and 7a (focus check on the busy buttons) | Built (no longer "first to drop": the deadline is not driving the order) | Every POS change visible inside Products | After Group 4 |
| 4 | 31 to 35 (M12 evidence) | Must for the report | Numbers for NFR1 to NFR4 | **Next**; the usage count starts first and is redone; the measuring tools are built while it runs |
| 6 | 36, 37 (release) | Must, last | v1.0.0 tagged and deployed | After Groups 4 and 5 |
| 7 | 8 (undo), 16, 17, 23 (extra Insights sections), 24 (Apply), 30 (hosted thumbnail) | Proposed cuts to future work: confirm with the user before dropping or building them | — | The user decides |

## Every task, every time
1. Script gates: backend `python -m pytest` and `ruff check . && ruff format --check .`; frontend `npm run typecheck && npm test && npx oxlint && npm run build`.
2. New code has tests for its normal case, every edge case listed here, and its error paths (typed errors, safe messages).
3. UI: axe 0 in both roles; widths 320, 360, 390, 768, 1024, 1360; keyboard only; reduced motion.
4. Live cycle: `deployed_rules.py` (deployed rules equal the file) → last scan is old, nobody scanning → `realdata.py snapshot` → `zz-*` data → checks → data written is verified from Firestore → `realdata.py restore` and `verify` (identical).
5. Docs: README, DESIGN_DECISIONS, TESTING, ROADMAP status; anything cut goes into FUTURE_WORK.
6. Commit commands given to the user (backend, frontend, docs).

Live tests that need the webcam need the user to restart the backend from VS Code's terminal (macOS camera permission). Rule changes need the user to publish.

## M6 automatic scanning: Nov 5 (backend)
Live checks for these run on Nov 6 morning, after the user restarts the backend.

**Status (Nov 4 evening): script part of M6-1 to M6-12 done** (backend 201 tests, ruff clean; frontend 599 tests and all gates). Live parts pending: M6-L1 to M6-L5 on Nov 6.

**Live results so far (Nov 4 to 5):** delays (M6-L3) pass: an alert opened 203 s after a mismatch began (delay 180 s plus the next scan), none when fixed within the delay, resolved on the next matching scan; an order only after both the streak and the delay, one only, timers held at zero after it. Soak (M6-L2) overnight: 8 scan records (5 heartbeats every 10 minutes, 2 changes, 1 manual), counts always right, no stray alerts or orders; gaps of 4.5 h and 2.2 h were the laptop sleeping. Camera kept open (M6-16/17): capture 1.25 s to about 0.19 s. Found and fixed: a network hiccup held scans for 20 to 47 s because the Firestore library retries for up to 300 s; every call is now capped at 5 s per attempt and 10 s in total. Nov 5: the retry cap holds in the running backend (processing 0.3 to 1 s, no stalls). Brightness (M6-L4): lights on 171 to 183, dim 40 to 53 with correct counts, lens covered 18 and 39 skipped; minimum kept at 40. Found and fixed: a timer left from before a restart (or a sleep, or dark frames) opened alerts at once; timers and the streak now restart after a gap of more than 3 intervals and on the first scan after a start (221 backend tests). Still to run: M6-L1 regression, M6-L5 states, and a recheck of the gap fix after the next restart (the Nov 5 recheck was inconclusive: the lens stayed covered, so every scan was skipped; nothing was raised).

**Nov 11:** M6-13 to M6-15 built and script-tested: `cameraState` (pure, every state and boundary), the camera status line with Pause Scanning (15 minutes) and Resume, announced only on a change of state; Stock Check says "Shelf counts as of"; `settings/scanning` rule; the loop reads the pause before each scan (unreadable counts as not paused) and releases the camera while paused. Frontend 635 tests, backend 227. Live: needs the rules published and the backend running.

**Nov 11, live:** gap recheck 4/4 (a 130 s pause made the gap; the planted 24-hour-old timer was ignored, the timer restarted, and the alert opened 186 s later). Pause in the loop 5/5 (no scan attempted while paused; resumed by itself 29 s after the pause ended). Pause from the button in Chrome, by keyboard: no scan for 75 s, a scan 4 s after Resume, both changes announced; live and paused states axe 0 at 320 to 1360 px. Two faults found and fixed (frontend 637 tests): the line announced its state on every page load and briefly said "Waiting for First Scan" while loading (now "Checking Camera…", and the first state is not announced); keyboard focus was lost after pressing Pause or Resume, because the button is disabled while saving (focus is now returned). Regression 56/56 with scanning paused (first run 55/56: the dealer's Received tile was late in the test browser; the data was right and the rerun passed). Real data verified identical after each cycle. M6-L5 finished the same morning: Too Dark (lens covered), No Recent Scan (backend stopped; shown about 90 s after the last scan), Camera Not Responding (`CAMERA_INDEX=9`) and Automatic Scanning Off (`AUTO_SCAN_ENABLED=false`) each appeared with the right next step, axe 0 and no sideways scroll at 320 to 1360 px. Finding: the backend wrote its scanning setting to `status/latest` only when it attempted a scan, so after a restart with scanning off the dashboard said "No Recent Scan" until Scan Now was pressed once. Fixed the same day: the backend publishes the setting once at startup (`ScanService.publish_settings`, best effort, one write, no attempt claimed; backend 234 tests). Live: after a restart with `AUTO_SCAN_ENABLED=false` the dashboard showed "Automatic Scanning Off" 2 s after the backend started, with no scan (the last attempt in `status/latest` stayed the automatic one from before the restart). Group 1 is complete.

**Nov 11, from the user's own screenshots of the four states:** two more faults fixed (frontend 644 tests). (1) Scan Now changed place: with a long status text it dropped below the title, at the left (No Recent Scan, Camera Not Responding), and sat at the right otherwise; the title block now shrinks and its text wraps, so Scan Now stays at the right from 700 px up (`headcheck.mjs`, 6 widths, axe 0). (2) Active Alerts said "Everything on the shelf matches the POS records" while Stock Check showed 2 mismatches, because an alert now waits out its delay; it now says how many parts differ and that a lasting mismatch becomes an alert (checked in Chrome with a temporary POS +1). Also seen: the shelf read 0 and 0 at full brightness in the scan just before the lens was covered (03:38 UTC) and in the first Scan Now after the last restart (03:44:35), then 4 and 1 ten seconds later; no alert or order followed (delays and the gap rule). Cause confirmed from the shelf image of a later 0 and 0 scan (03:53:45): the camera was looking at the person at the laptop, not at the parts, as on the morning of Nov 11. Every 0 and 0 scan that day came while the laptop was being used (covering the lens, restarting, pressing Scan Now).

| ID | Action | Script tests | Live tests |
|---|---|---|---|
| M6-1 | Settings: `AUTO_SCAN_ENABLED`, `SCAN_INTERVAL_SECONDS`, `SCAN_HEARTBEAT_SECONDS`, `ALERT_DELAY_SECONDS`, `REORDER_DELAY_SECONDS`, `MIN_FRAME_BRIGHTNESS`; `.env.example` | Defaults; "true/false/1/0" parsing; refused: interval under 10, heartbeat under the interval, negative delays, brightness outside 0 to 255; a clear startup error | Backend starts with the user's `.env`; the startup log states the scanning settings; a bad value stops startup with a readable message |
| M6-2 | Injected clock; `FakeClock` in `conftest.py` | The fake advances exactly; the real clock is timezone-aware UTC | Covered by M6-L2 (timestamps in Firestore are sensible UTC) |
| M6-3 | `frame_brightness(frame)` (mean grey level, 0 to 255) and `is_too_dark` | Black 0, white 255, a mid grey; colour frames; exactly at the threshold counts as bright enough; empty frame refused | M6-L4 calibration with the lights on, dim and off |
| M6-4 | Alert time rule in `plan_alerts` (`mismatchSince` per product, `now`, delay) | First mismatch sets the time, no alert; still under the delay: no alert, no write; at exactly the delay: alert with current counts; delay 0: alert at once (old behaviour); match before the delay clears the time; match with an active alert resolves it at once; counts change while still mismatched: the time is kept; mismatch, match, mismatch: the timer restarts; a sale makes it match: cleared; an acknowledged alert stays acknowledged; counts refreshed only when changed; product with no POS record untouched; duplicate active alerts resolved; a `mismatchSince` in the future or malformed is treated as now | M6-L3: a part removed shows Mismatch at once and an alert only after the delay; put back within the delay, no alert; a Record Sale within the delay, no alert |
| M6-5 | Order time rule in `plan_orders` (`lowSince` plus the low-scan streak) | Low sets `lowSince`; under the delay no order even with the streak met; delay and streak met: one order; delay 0 and two scans: order (demo); back above the level clears both; an open order holds both cleared; after receipt a fresh delay is needed; reorder quantity 0: never orders, nothing stored; level 0 with count 0 is low; a manual Scan Now counts toward the streak; boundary at exactly the delay; future or malformed `lowSince` | M6-L3: parts taken down to the level order only after the delay; put back within it, no order |
| M6-6 | `should_save_scan` (manual always; automatic when counts change, on the first scan after start, and at the heartbeat) | Every branch; heartbeat at exactly the boundary; counts with a new or missing part count as changed | M6-L2: scan records appear only on change and every heartbeat |
| M6-7 | Repository: change-only writes; `status/latest` on every attempt (`lastAttemptAt`, `lastError`, `skipReason`, scanning settings); scan fields `trigger`, `brightness`, `captureMs`, `detectMs`, `saveMs`, `heartbeat`; `mismatchSince` and `lowSince` | Fake repository counts writes: steady state is one status write per automatic scan; product status written only when it changes (`ProductRecord` gains `status`); planners' empty plans write nothing | M6-L2: field shapes read back from Firestore; write counts for one hour against the budget |
| M6-8 | Scan service: step timings; dark frame (automatic: nothing changes, status records the skip; Scan Now: `FrameTooDarkError`, a typed 422 with a next step); camera error recorded in status | Each path with fakes; the old "a later step never loses the scan" tests still pass; timings are whole milliseconds | M6-L1: Scan Now with the lens covered shows the message; timings visible in scan records |
| M6-9 | Background loop `AutoScanner`, started and stopped in `create_app`'s lifespan | Disabled: no thread; one tick with fakes; shares the scan lock (a Scan Now during a tick waits, never overlaps); camera and storage errors are logged and the loop carries on; any unexpected error never kills the thread; stop within 1 s; settings wired through `create_app` | M6-L2: runs for an hour; Ctrl+C stops it within a second; restarting resumes |
| M6-10 | Scan Now button shows the dark-frame message | `ScanControl` test for the new error code and message | M6-L1 with the lens covered |
| M6-11 | `demo_reset` clears `mismatchSince` and `lowSince` | `describe_change` and plan tests | Dry run against the real data (read only) lists them |
| M6-12 | Docs: one worker only, settings, demo settings, the time rules and change-only writes | — | README steps followed as written on Nov 6 |

## M6 automatic scanning: Nov 6 (browser and live)

| ID | Action | Script tests | Live tests |
|---|---|---|---|
| M6-13 | `cameraState(status, now)` (pure): Live, Off, Paused, Too dark, Camera not responding, No scan (laptop off), Waiting for first scan | Each state; exactly twice the interval; an old `status/latest` without the new fields; a time in the future; settings missing | M6-L5: every state produced for real |
| M6-14 | Camera status line on the dashboard; Stock Check says "as of"; a 30 s tick | Icon plus text per state; `aria-live` announces a change of state, never every tick; the timer is cleared on unmount | Chrome: each state, axe, all widths, screen reader text |
| M6-15 | Pause Scanning: `settings/scanning.pausedUntil` (at most 30 minutes ahead), `pausedBy`; rules; loop checks before each scan (unreadable means not paused, logged); Pause 15 min and Resume buttons | Rule check cases (shopkeeper allowed, dealer refused, over 30 minutes refused, other fields refused, wrong time refused); loop skips while paused and resumes after; UI states | User publishes; REST attack checks; Chrome: pause stops scans (`lastAttemptAt` stops), resume scans within the interval, the pause ends by itself |
| M6-16 | Measure first: capture, detect and save times from real scan records | — | 10 Scan Now presses; decide on keeping the camera open (only if capture dominates) |
| M6-17 | If worth it: keep the camera open while scanning is on; reopen after a failure; release when paused, off or stopping | Fake `VideoCapture`: reopen after a failed read, release on stop and pause, buffer flushed before the frame used | 10 Scan Now presses before and after (target under 3 s); camera light behaviour; Scan Now still works with scanning off |
| M6-L1 | Restart the backend with the new code (user) | — | Full regression (`regress.mjs`) passes with scanning off: nothing changed for manual use |
| M6-L2 | Soak: scanning on, 30 s interval, 1 to 2 hours | — | Scan records only on change plus heartbeat; one status write per scan; no duplicate alerts; no unintended orders; no errors in the log; memory steady |
| M6-L3 | Delays: alert 60 s, reorder 60 s, `zz` setup | — | The M6-4 and M6-5 live cases above |
| M6-L4 | Brightness calibration | — | Brightness with lights on, dim and off; set `MIN_FRAME_BRIGHTNESS` between; record the values in TESTING |
| M6-L5 | Camera states | — | Live (running), Off (`AUTO_SCAN_ENABLED=false`), No scan (backend stopped for two intervals), Too dark (lens covered), Camera not responding (`CAMERA_INDEX` set to a missing camera), Paused |

## Stock Log, undo and part names (Group 5: SL-1 to SL-3; SL-4 undo is Group 7; SL-5 part names done Nov 11)

| ID | Action | Script tests | Live tests |
|---|---|---|---|
| SL-1 | Repository: newest first by `at` within the period, 50 at a time plus one, cache-skip as in alert history. The part filter runs in the browser on the loaded entries (a Firestore `where` plus `orderBy` on another field would need a composite index); the type filter was dropped Nov 12 | Paging; cache-skip; filters; period edges in local time | 60 `zz` entries: Load More, filters, counts |
| SL-2 | Stock Log page, a second view inside the Products tab (shopkeeper; changed Nov 12 from a sixth tab): Today by default; period and part filters in the URL (no type filter); columns time, part, type, change, before and after, reason, who; route `/products/log`; loading, empty and error states | Rendering per state; filters from and to the URL; "who": "You" for the signed-in user, the script's name for Reset, "Another user" otherwise (other users' names are not readable under the rules) | Header fit with five tabs at 320 to 1360 px; axe; keyboard; dealer sent to their home |
| SL-3 | Links: each Stock Check part cell has a "History" link to `/products/log?part=ID&period=30` | Link targets | Chrome: link opens the filtered log |
| SL-4 | Undo on Record Sale: a "Sale recorded. Undo" message for 10 s; writes a `Correction` entry with id `undo-<sale id>`, reversing exactly that sale, by the same person, within 2 minutes; the analytics leave out both | Planner; UI timer, focus and keyboard; rule check cases (second undo refused because the id exists, wrong amount, someone else's sale, too late, not a sale) | User publishes; REST attack checks; Chrome: undo restores the POS; the log shows both; a second undo is refused |
| SL-5 | One name per part: Orders, Alerts and notifications use the product name; new orders store `productName` (backend), so the dealer keeps names once M10 narrows product reads; `partLabel` only as the last fallback | Name chooser; backend order-plan test includes `productName`; old orders without it still show a name | A `zz` part with a custom name reads the same on every page, for both roles |

## Demo history and analytics: Nov 12

*Outcome (Nov 11 to 12): SH-1, AN-1 to AN-5 and AN-L1 built and checked live; the seed was extended to 90 days. AN-6 (stockouts) and AN-7 (stock value, full period comparison) were not built (Group 7, proposed cuts, in `docs/FUTURE_WORK.md`); only the sales and profit comparison with the previous period exists. Gross profit, the part ranking, weekly bars and What To Do were added on Nov 12 (items 39 to 41).*

| ID | Action | Script tests | Live tests |
|---|---|---|---|
| SH-1 | `seed_history` planner (pure, seeded random): 30 days of sales, receipts, adjustments with reasons, customer returns, Resolved alerts, Received orders with every stage time, and scan records at heartbeat cadence with some stockouts; all `seeded: true` | The log replays exactly to each part's current POS (the chain ends where the real record is); no future dates; no open orders or alerts; reasons match directions; reproducible | Dry run; apply after a snapshot; `--clear` removes only seeded data; `demo_reset` keeps it; the app shows it |
| AN-1 | Data loader: movements, scans, orders and alerts for the period by their time field (no composite index) | Query shape; period edges | Read count per visit measured |
| AN-2 | Sales: units and value per day and part, net of customer returns, at each entry's own price; Reset and undone sales left out | Days with no sales count as 0; a price change mid-period; returns larger than sales | AN-L1 |
| AN-3 | Shrinkage by reason and part at cost; as a share of sales | No sales ("—", not infinity); no cost set ("Set a cost in Part Settings") | AN-L1 |
| AN-4 | Days of cover = shelf count / average daily sales over the period (an average, because the median of mostly-zero days is 0); dealer lead time and response times use medians | No sales: "No recent sales"; stale shelf count shows its age | AN-L1 |
| AN-5 | Recommendation: reorder level = average daily sales x median lead time + safety margin | Under 14 days of sales or 2 received orders: "Not enough history yet" | AN-L1 |
| AN-6 | Stockouts: hours at zero from the scan series; gaps longer than the heartbeat count as unknown; lost sales estimate | Gaps; a period starting mid-stockout; seeded and real mixed | AN-L1 |
| AN-7 | Stock value; period comparison ("New" when the previous period is zero) | Each edge case | AN-L1 |
| AN-L1 | `insights_check.py` recomputes every figure from Firestore independently | — | The page's numbers equal the script's, on seeded and real data |

## Insights: Nov 12

*Outcome (Nov 11 to 12): IN-1 to IN-4 built and checked live, then revised on Nov 12: the tiles are Sales, Gross Profit, Shrinkage and Lowest Days of Cover (dealer lead time moved beside the recommendations), and a What To Do list was added. IN-5 (stock flow, stock value, stockouts, response and dealer) and IN-6 (Apply) were not built; see `docs/FUTURE_WORK.md`.*

| ID | Action | Script tests | Live tests |
|---|---|---|---|
| IN-1 | MUI X Charts at an exact version; Insights route lazy-loaded | Lazy load test | Main bundle unchanged, Insights chunk measured |
| IN-2 | Insights page: period (7, 30, 90 days) and part in the URL; "Includes demo data"; loading, empty and error states | Each state; URL round trip | axe, widths, keyboard |
| IN-3 | Core sections: sales, shrinkage, days of cover, recommendations, each chart with a table alternative | Table equals chart data; empty and error per section | Numbers equal `insights_check.py` |
| IN-4 | Dashboard tiles (sales value with change, shrinkage value, lowest cover, lead time), each linking to its section with focus | Tile values and links | Chrome: tile to section, focus lands |
| IN-5 | Nov 10: stock flow (links to the Stock Log), stock value, stockouts, response and dealer | Section tests | `insights_check.py` |
| IN-6 | Apply recommendation through Part Settings, with confirmation | Confirm and cancel; refused write shows a next step | Apply changes the setting; the next scan uses the new level |

## M10 security (Group 1, done Nov 11) and M11 Hosting (Group 3, done Nov 14; M11-3 is Group 7)

| ID | Action | Script tests | Live tests |
|---|---|---|---|
| M10-1 | Final rules: dealer can no longer read products; `settings/scanning`; `stock_movements` including corrections | All rule check cases updated | User publishes; full REST attack suite (`rules_test.py`, `f1_rest.py`, M10 cases) |
| M10-2 | Backend role check: `/scan` and `/snapshot` shopkeeper only (role read through the Admin SDK, typed 403) | Dealer token refused; shopkeeper allowed; missing profile refused | REST with real tokens for both roles |
| M10-3 | Dealer pages work without product reads (names from `productName`) | Orders page tests for the dealer | Dealer regression in Chrome |
| M11-1 | Hosting: build and deploy (the user deploys, or approves it); hosted origin added to `CORS_ORIGINS` | Build passes | Both roles on the hosted URL, desktop and phone |
| M11-2 | Scan Now from the hosted page on the shop laptop: Chrome may block an https page calling `http://localhost` (Private Network Access); if so, the backend answers the preflight, or the hosted app says to use the local app | Backend header test | Real Scan Now from the hosted page |
| M11-3 | Thumbnail in `status/latest`, under 100 KB, written only when counts change or at the heartbeat | Encoder size and cadence | Hosted page shows the shelf image; phone |

## M12 evaluation (Group 4: M12-1 to M12-6; M12-7 belongs to Group 6)

| ID | Action | Script tests | Live tests |
|---|---|---|---|
| M12-1 | Detection accuracy: 20 arrangements x 3 lighting conditions with known counts (the user arranges; a capture script records each) | Scoring script tested on a fixture | Precision, recall and count accuracy per condition |
| M12-2 | Timing: inference and Scan Now click-to-result, 50 runs | — | Averages and spread against the 3 s target |
| M12-3 | Sync latency: write to second browser, 10 trials | — | Average and worst |
| M12-4 | Free-tier usage for one day of automatic scanning | — | Reads and writes against the limits |
| M12-5 | Functional test cases FR1 to FR9 plus Stock Log and Insights | — | Each case run and recorded |
| M12-6 | Usability test with 3 people: tasks and a SUS questionnaire | — | Results and fixes |
| M12-7 | Full regression updated for every new feature; screenshots for the report | `regress.mjs`, `states.mjs`, `baseline.mjs` updated | All pass; data restored identical |

## Release (Group 6)

| ID | Action | Script tests | Live tests |
|---|---|---|---|
| R-1 | All gates; `package.json` 1.0.0; no secrets in the repository (search for keys and passwords); `SIMULATED_PARTS` empty in `.env` and no `zz_` products left | All gates | — |
| R-2 | Fresh clone: install and run the tests by following README only | Tests pass in the clone | — |
| R-3 | User opens the PR dev to main (merge commit), tags `v1.0.0`, deploys Hosting from the tag | — | Smoke test on the hosted URL for both roles; deployed rules equal the file |
