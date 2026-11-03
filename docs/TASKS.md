# Task Checklist (Nov 5 to Nov 13)

The roadmap (`docs/ROADMAP.md`) says what and why; this file breaks each step into small actions, each with its **script tests** (automated: pytest, vitest, rule checks) and its **live tests** (real Firebase, real Chrome, real webcam). A task is done only when both pass. Tick items here as they are finished.

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

## Stock Log, undo and part names: Nov 7

| ID | Action | Script tests | Live tests |
|---|---|---|---|
| SL-1 | Repository: newest first by `at` within the period, 50 at a time plus one, cache-skip as in alert history. Part and type filters run in the browser on the period's entries (a Firestore `where` plus `orderBy` on another field would need a composite index) | Paging; cache-skip; filters; period edges in local time | 60 `zz` entries: Load More, filters, counts |
| SL-2 | Stock Log page and fifth tab (shopkeeper): Today by default; period, part and type filters in the URL; columns time, part, type, change, before and after, reason, who; loading, empty and error states | Rendering per state; filters from and to the URL; "who": "You" for the signed-in user, the script's name for Reset, "Another user" otherwise (other users' names are not readable under the rules) | Header fit with five tabs at 320 to 1360 px; axe; keyboard; dealer sent to their home |
| SL-3 | Links: each Stock Check row opens the log filtered to its part | Link targets | Chrome: link opens the filtered log |
| SL-4 | Undo on Record Sale: a "Sale recorded. Undo" message for 10 s; writes a `Correction` entry with id `undo-<sale id>`, reversing exactly that sale, by the same person, within 2 minutes; the analytics leave out both | Planner; UI timer, focus and keyboard; rule check cases (second undo refused because the id exists, wrong amount, someone else's sale, too late, not a sale) | User publishes; REST attack checks; Chrome: undo restores the POS; the log shows both; a second undo is refused |
| SL-5 | One name per part: Orders, Alerts and notifications use the product name; new orders store `productName` (backend), so the dealer keeps names once M10 narrows product reads; `partLabel` only as the last fallback | Name chooser; backend order-plan test includes `productName`; old orders without it still show a name | A `zz` part with a custom name reads the same on every page, for both roles |

## Demo history and analytics: Nov 8

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

## Insights: Nov 9 and Nov 10

| ID | Action | Script tests | Live tests |
|---|---|---|---|
| IN-1 | MUI X Charts at an exact version; Insights route lazy-loaded | Lazy load test | Main bundle unchanged, Insights chunk measured |
| IN-2 | Insights page: period (7, 30, 90 days) and part in the URL; "Includes demo data"; loading, empty and error states | Each state; URL round trip | axe, widths, keyboard |
| IN-3 | Core sections: sales, shrinkage, days of cover, recommendations, each chart with a table alternative | Table equals chart data; empty and error per section | Numbers equal `insights_check.py` |
| IN-4 | Dashboard tiles (sales value with change, shrinkage value, lowest cover, lead time), each linking to its section with focus | Tile values and links | Chrome: tile to section, focus lands |
| IN-5 | Nov 10: stock flow (links to the Stock Log), stock value, stockouts, response and dealer | Section tests | `insights_check.py` |
| IN-6 | Apply recommendation through Part Settings, with confirmation | Confirm and cancel; refused write shows a next step | Apply changes the setting; the next scan uses the new level |

## M10 security and M11 Hosting: Nov 11

| ID | Action | Script tests | Live tests |
|---|---|---|---|
| M10-1 | Final rules: dealer can no longer read products; `settings/scanning`; `stock_movements` including corrections | All rule check cases updated | User publishes; full REST attack suite (`rules_test.py`, `f1_rest.py`, M10 cases) |
| M10-2 | Backend role check: `/scan` and `/snapshot` shopkeeper only (role read through the Admin SDK, typed 403) | Dealer token refused; shopkeeper allowed; missing profile refused | REST with real tokens for both roles |
| M10-3 | Dealer pages work without product reads (names from `productName`) | Orders page tests for the dealer | Dealer regression in Chrome |
| M11-1 | Hosting: build and deploy (the user deploys, or approves it); hosted origin added to `CORS_ORIGINS` | Build passes | Both roles on the hosted URL, desktop and phone |
| M11-2 | Scan Now from the hosted page on the shop laptop: Chrome may block an https page calling `http://localhost` (Private Network Access); if so, the backend answers the preflight, or the hosted app says to use the local app | Backend header test | Real Scan Now from the hosted page |
| M11-3 | Thumbnail in `status/latest`, under 100 KB, written only when counts change or at the heartbeat | Encoder size and cadence | Hosted page shows the shelf image; phone |

## M12 evaluation and regression: Nov 12 (trials from Nov 7)

| ID | Action | Script tests | Live tests |
|---|---|---|---|
| M12-1 | Detection accuracy: 20 arrangements x 3 lighting conditions with known counts (the user arranges; a capture script records each) | Scoring script tested on a fixture | Precision, recall and count accuracy per condition |
| M12-2 | Timing: inference and Scan Now click-to-result, 50 runs | — | Averages and spread against the 3 s target |
| M12-3 | Sync latency: write to second browser, 10 trials | — | Average and worst |
| M12-4 | Free-tier usage for one day of automatic scanning | — | Reads and writes against the limits |
| M12-5 | Functional test cases FR1 to FR9 plus Stock Log and Insights | — | Each case run and recorded |
| M12-6 | Usability test with 3 people: tasks and a SUS questionnaire | — | Results and fixes |
| M12-7 | Full regression updated for every new feature; screenshots for the report | `regress.mjs`, `states.mjs`, `baseline.mjs` updated | All pass; data restored identical |

## Release: Nov 13 (code freeze)

| ID | Action | Script tests | Live tests |
|---|---|---|---|
| R-1 | All gates; `package.json` 1.0.0; no secrets in the repository (search for keys and passwords) | All gates | — |
| R-2 | Fresh clone: install and run the tests by following README only | Tests pass in the clone | — |
| R-3 | User opens the PR dev to main (merge commit), tags `v1.0.0`, deploys Hosting from the tag | — | Smoke test on the hosted URL for both roles; deployed rules equal the file |
