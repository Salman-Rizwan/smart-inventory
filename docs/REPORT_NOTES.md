# Report Notes

Material for the final report (M13), collected while building. Each section says where the details live. Limitations and future work are in `docs/FUTURE_WORK.md`; the reasons behind each design are in `docs/DESIGN_DECISIONS.md`; how everything is tested is in `docs/TESTING.md`. Keep this file current: add measurements and findings as they happen.

## Before writing
- Replace ESP32 with webcam, and Realtime Database with Firestore, everywhere in the earlier chapters.
- State that the demo history is synthetic and marked `seeded: true` (`seed_history`): 90 days (first written as 30 days on Nov 11, extended on Nov 12), planned backwards from the real POS counts so the log ends exactly at the real counts; 147 stock changes, 12 received orders, 18 resolved alerts; demo cost and price figures (spark plug 350/500, petrol filter 900/1,200 LKR). Every figure on the Insights page over that period is therefore illustrative, not trading data; the page and the dashboard say "Includes demo data".
- Include the licence note: Ultralytics is AGPL-3.0.
- Any disclosure of tool use follows the university policy; that decision is the author's.

## System summary (Introduction, Design)
A USB or laptop webcam photographs an auto-parts shelf; a YOLOv8 model (Ultralytics 8.4.163, `best.pt`, classes `spark_plug` and `petrol_filter`) counts the parts on the shop laptop (FastAPI, Python 3.11). Counts are compared with mock POS records; mismatches raise alerts, and parts that stay low raise purchase orders for the dealer. Firebase on the free Spark plan stores the data (Firestore), signs users in (Auth) and serves the React app (Hosting). Two roles: shopkeeper and dealer. Architecture diagram and data model: `README.md`.

## What was built, in order (Implementation)
| When | Milestone | Notes |
|---|---|---|
| Oct 24 to 27 | M1 to M5, M7 to M9, notifications | Webcam counting, Firestore, login and roles, live dashboard, POS reconciliation, alerts, automatic orders with the dealer workflow, notification bell |
| Oct 28 | Interim viva | Supervisor feedback: a history of past alerts; business intelligence analytics on the dashboard |
| Oct 28 to 31 | Move to Material UI (MUI-0 to MUI-14) | One theme from design tokens; Carbon-style look kept; each step compared by screenshot and axe |
| Oct 31 | UX-1 to UX-4 | Alerts tab with full history (answers the first feedback point), dashboard alert summary, notifications open their alert, two-row header on phones |
| Oct 31 | Shopkeeper's-eye review | Led to the stock change log, Adjust Stock, Part Settings, the delivery guard, and the changes to automatic scanning below |
| Nov 4 | F1 | Every POS change logged in the same transaction (`stock_movements`), enforced by the rules; Adjust Stock with reasons; Part Settings (cost, price in LKR, margin, reorder settings); delivery guard; who acknowledged or received |
| Nov 4 to 11 | M6 automatic scanning | Background loop; time rules for alerts (3 min) and orders (5 min); dark-frame skip; change-only writes; bounded database calls; camera kept open; gap rule; camera status line; Pause Scanning |
| Nov 11 | M10 and Cancel Order | Final least-privilege rules (the dealer reads purchase orders only), shopkeeper-only Scan Now and shelf image on the backend, part names stored on orders; the shopkeeper can cancel an order before dispatch, with a reason |
| Nov 11 (evening) | F3 Insights core | Seeded demo history; pure analytics (sales net of returns, shrinkage, days of cover, dealer lead time, reorder recommendation) in the browser; four "Business at a Glance" tiles; lazy-loaded Insights page with charts and table alternatives; an independent Python recomputation that matched the page on every figure |
| Nov 12 | Insights decisions and dashboard layout | After a walk through every tab in Chrome: gross profit and margin, a What To Do list (one next step per part), weekly bars over 90 days, a 90-day demo history; Part Settings moved to a Products tab; the dashboard reordered by the shopkeeper's questions (alerts, business, stock, camera) and cut from 2,864 to 1,517 px |
| Still to do | Stock Log, M11, M12 | See `docs/TASKS.md`, "Remaining work" |

## Engineering approach (Implementation)
- Layered backend: routes (HTTP only), services (use cases), adapters (camera, detector, Firestore). Decisions live in pure, unit-tested functions: `reconcile.py`, `alerts.py`, `orders.py`, `scan_policy.py`, `frame_quality.py`.
- Typed errors with one response shape; best-effort steps never lose a scan.
- Frontend in feature folders, TypeScript for new code, one live listener per collection shared through providers.
- Security in Firestore rules: each browser write is checked field by field (for example a POS change must arrive with its matching log entry).
- Accessibility: WCAG AA contrast, keyboard use, screen-reader announcements, colour never alone; axe 0 on every page.
- Every business figure has two implementations: pure, unit-tested functions in the browser (`features/insights/analytics.ts`) and an independent Python recomputation written from the definitions (`backend/scripts/insights_check.py`); a Chrome script compares the page with it, which tests the code against the definitions without trusting either copy.
- Layout is verified by measuring it in a real browser (tile figures, tab strip, side-by-side panels, sideways scroll at six widths), because unit tests cannot see layout; the Nov 12 tile-wrapping defect passed 800 unit tests.
- The charts library is loaded only with the Insights page (React.lazy; a test keeps it from creeping into the main bundle), and its chart colours are validated for colour-vision separation and contrast before use.

## Measurements so far (Evaluation)
| Measure | Result | Source |
|---|---|---|
| Model accuracy (validation) | 0.995 mAP50 | Training run (Colab) |
| Inference per frame | 25 to 48 ms on the shop laptop (NFR2 target under 1 s) | Scan records, Nov 4 to 11 |
| Camera capture | 1.25 s opening the camera per scan; 0.19 s with the camera kept open | `status/latest` timings, Nov 4 to 5 |
| Scan Now click to result | 2.8 to 5.4 s before the camera change (target 3 s); to be remeasured in M12 | Live regression runs, Oct 30 to Oct 31 |
| Database steps per scan | 0.3 to 1 s normally; reads 0.15 to 0.4 s warm, 1.2 to 1.6 s for the first read on a new connection | Live, Nov 5 |
| Alert delay | Alert opened 203 s after the mismatch began (setting 180 s plus the next 30 s scan) | Live test, Nov 4 |
| Reorder after a cancel | On a simulated part: a fresh order 314 s after the first low scan following the cancel (delay 300 s, 30 s scans), and only one | `sim_reorder_live.py`, Nov 11 |
| Gap rule | After a 130 s pause, a timer planted 24 hours in the past was ignored; the alert opened 186 s after the restarted timer (setting 180 s) | `gap_live.py`, Nov 11 |
| Pause Scanning | No scan attempted during a 130 s pause; scanning resumed by itself 29 s after it ended (interval 30 s); from the button, a scan arrived 4 s after Resume | `pause_live.py`, `camstates.mjs`, Nov 11 |
| Scan Now click to result, camera kept open | 2.4 s and 2.8 s (target 3 s); 50 runs to follow in M12 | Live regression, Nov 11 |
| Scan Now on the final layout | 2,829 ms click to result with 29 ms inference; counted 1 filter and 4 plugs correctly | Live regression, Nov 12 |
| Writes from automatic scanning | Overnight: 8 scan records over the hours the laptop was awake (5 heartbeats every 10 minutes, 2 changes, 1 manual) instead of about 300; a quiet scan costs 1 write | Live soak, Nov 4 to 5 |
| Brightness (0 to 255) | Lights on 171 to 183; lights off with daylight 40 to 53 (counts still right); lens covered 18 and 39 (skipped); threshold 40 | Live, Nov 4 to 5 |
| Free-tier budget (estimate) | About 1,500 writes and 7,000 reads a day from the backend at a 60 s interval, plus about 1,440 reads a day per open dashboard; limits are 20,000 and 50,000 | Design calculation; to be measured in M12 |
| Insights read cost (first 30-day seed, Nov 11) | 64 document reads per session (55 stock changes and 9 orders over a 180-day window), shared by the dashboard tiles and the page; afterwards one read per new change | `insights_check.py` `loaded` counts, Nov 11 |
| Insights bundle (Nov 11) | Main bundle 1,126 to 1,140 kB (347 to 352 kB gzipped) for the analytics, tiles and loader; the Insights page with the charts library is a separate 347 kB chunk (109 kB gzipped) loaded on first visit | `npm run build`, Nov 11 |
| Insights correctness (first version, Nov 11) | Page figures equal to an independent Python recomputation at 7, 30 and 90 days and with the part filter: 25 checks per run, all equal | `insights_live.mjs`, Nov 11 |
| Insights correctness (final, Nov 12) | The same comparison after gross profit, the part ranking, weekly bars and What To Do: 175 checks over five runs (7, 30 and 90 days, and two part filters), 0 differences | `insights_live.mjs`, Nov 12 |
| Seeded demo figures (30 days, first 30-day seed) | 44 units sold, LKR 31,800; shrinkage 3 units, LKR 1,600 (5% of sales); cover 2.1 days (filter) and 4.0 days (plug); dealer lead time 2.9 days over 7 deliveries; suggested levels 3 (filter, from 0) and 5 (plug, from 2) | `insights_check.py`, Nov 11 |
| Seeded demo figures (90-day seed, Nov 12) | 114 units in 90 days, LKR 80,100 sales, LKR 22,050 gross profit (28% margin); spark plug 30% margin and 55% of the profit, petrol filter 25% and 45%; shrinkage 9 units, LKR 4,800 (6% of sales); dealer lead time 3.1 days over 15 deliveries | `insights_check.py`, Nov 12 |
| Dashboard length | 2,864 px to 1,517 px at 1360 px wide; 3,650 px to 2,886 px at 390 px; the first screen now holds alerts, the business figures and Stock Check | Chrome full-page measurement, Nov 12 |
| Insights read cost (90-day seed, Nov 12) | 147 stock changes and 17 orders, about 165 document reads per session, shared by the tiles and the page; afterwards one read per new change | `insights_check.py` `loaded` counts, Nov 12 |
| Insights bundle (Nov 12) | Main bundle 1,144 kB (353 kB gzipped); Insights page with the charts 351 kB (110 kB gzipped), loaded on first visit | `npm run build`, Nov 12 |
| Hosting build (Nov 12) | The whole `dist` folder is 2.0 MB (fonts included), far inside Hosting's free 10 GB. The production build, served locally and signed in to real Firebase, passes 21 checks for both roles: sign-in, live data, every page on a full reload (the single-page rewrite), unknown path sent home, no sideways scroll at 390 px, no unexpected console errors; the dealer lands on Orders, is kept out of five shopkeeper pages, makes no call to the backend and gets no permission-denied error | `hosting_check.mjs` on `vite preview`, Nov 12 |
| Hosted wording (Nov 12) | With the backend refusing the page's origin, the shelf image panel says the image lives on the shop laptop (information, not an error) and Scan Now says it works only from the shop laptop and what to allow; no scan was run; axe 0 violations at 1360 and 390 px | `hosted_messages.mjs`, Chrome, Nov 12 |
| Free-tier budget at a 30 s interval (estimate from the code, Nov 12) | One automatic scan reads about 5 documents (2 products, the pause setting, the open orders) and writes 1 (`status/latest`), plus changes: about 14,000 reads and 2,900 writes a day from the backend, against limits of 50,000 and 20,000; each open browser adds its listeners' reads | Code reading; the one-day count below checks it |
| One-day free-tier count (started Nov 12) | Automatic scanning every 30 s, laptop kept awake with `caffeinate -i`, started 01:30 IST Nov 12 (20:00 UTC Nov 11), to be read at 01:30 Nov 13 from the Firebase console Usage tab (the service account cannot read Cloud Monitoring: HTTP 403, so the console is the source). Exceptions during the window are listed below | Pending |

**Status at Nov 12 (end of the Insights work, groups 1, 2 and 2b done):** not yet done are Hosting (M11), the simple Stock Log, the M12 evidence below, the release (v1.0.0), and the user's usability test with their brother. The Group 7 items (undo on Record Sale, stockouts, stock value, the extra Insights sections, Apply, the hosted thumbnail) are proposed cuts the user has not confirmed; they are written up as future work.

Still to measure in M12 (`docs/TASKS.md`): detection accuracy over 20 arrangements under 3 lighting conditions, Scan Now timing over 50 runs, sync latency over 10 trials, one day of real free-tier usage, functional test cases FR1 to FR9, and a usability test with 3 people.

## Insights as built (Implementation, for the report)
Everything is computed in the browser over the last 7, 30 or 90 local calendar days (today included); the previous period is the same number of days before it. A part with no data never shows 0 or infinity: each case names what is missing.

| Figure | Definition |
|---|---|
| Sales | Units of Sale entries minus units of Customer Return adjustments, each entry at its own stored price. Reset entries are left out. Units with no price are counted and reported, not valued at 0. |
| Gross profit and margin | (price - cost) x units over the entries that have both, each at its own price and cost; margin is profit over the sales value of those same entries. Entries with a price but no cost are counted and noted. |
| Shrinkage | Damaged and Lost or Stolen write-offs at each entry's own cost, and as a share of sales value ("—" with no sales). Miscount, Found and returns are record corrections, not shrinkage. |
| Days of cover | Camera shelf count divided by average daily net sales over the period (an average, because the median of mostly-zero days is 0), and days until the shelf reaches the reorder level. "No recent sales" or "No scan yet" when it cannot be worked out. |
| Dealer lead time | Median of received minus created over orders received in the period (a median, so one slow order does not skew it). |
| Suggested reorder level | Average daily sales x median lead time, plus a safety margin of half that demand (at least 1 unit), rounded up; withheld until the part has 14 days of history and the dealer 2 received deliveries, with the missing condition named. |
| What To Do | One step per part from the first matching rule: no scan yet; at or below the reorder level with an order open (waiting) or not (an order is due); the suggested level differs from the current one (raise or lower it); no sales; too early for a suggestion; otherwise OK. |
| Basis | What To Do and the recommendations always use the last 30 days, whichever period the page shows, so the advice does not change with the view. |
| Part ranking | Parts by gross profit, then units, then name, with units, revenue, margin and share of profit. |
| Charts | Units per day (per week over 90 days) stacked by part, and units written off by reason; each chart has its data as a table. |

The demo run on the 90-day seed (30-day view): 36 units, LKR 26,400 sales, LKR 7,200 gross profit (27% margin); the first 30-day seed and the 90-day seed give the figures in the measurements table. These are synthetic.

## Hosting (M11) as built (Implementation, for the report)
- **Design:** the React build is served by Firebase Hosting (free Spark plan); all processing stays on the shop laptop. `firebase.json` has a `hosting` section only, so a deploy can never publish the Firestore rules (the user publishes those by hand); every path rewrites to `index.html` so a refresh on `/alerts?alert=ID` works; hashed files are cached for a year and `index.html` is never cached.
- **Who needs what:** the dealer is the user of the hosted address (remote, never on the shop laptop) and never calls the backend; the shopkeeper uses it for everything except Scan Now and the shelf image, which come from the laptop. Counts, alerts, orders and Insights are the same everywhere because the automatic scanner writes them to Firestore.
- **CORS:** the two Hosting addresses are in the backend's default allowed origins, with tests that each is accepted and that other origins (plain http, look-alike names) are refused. A deploy needs no `.env` change.
- **Finding (browser rules, researched Nov 12, to be confirmed on the real site):** since Chrome 142 a public https page that calls `localhost` triggers a permission prompt ("Look for and connect to any device on your local network") and is blocked if denied. This replaces the older Private Network Access preflight design. Chrome's own article does not say whether a plain-http `localhost` call from an https page counts as mixed content. Sources: developer.chrome.com/blog/local-network-access and the Local Network Access guidance on developer.chrome.com.
- **Hosted wording:** when the page is not on `localhost`, a failed Scan Now says it works only from the shop laptop and what to allow (the old text, "make sure the backend is running", would mislead a dealer or a phone), and the shelf image panel says the image lives on the laptop, as information.
- **M11-2 check to run on the hosted address (laptop, backend restarted):** (1) Chrome version at `chrome://version`, 142 or later; (2) sign in as the shopkeeper and note when the prompt appears (the shelf image is requested on dashboard load); (3) Allow, press Scan Now, record the click-to-result time; (4) if anything fails, read the reason in the console (permission, mixed content, CORS, preflight); (5) Block, reload, record what the page shows; the setting lives at `chrome://settings/content/localNetworkAccess`. Fixes by cause: a preflight demand means answering `Access-Control-Allow-Private-Network: true`; mixed content means `targetAddressSpace` on the fetch; denied or a phone means the wording above stands.
- **Deployed (Nov 14, 16:04 IST):** `https://smart-inventory-da834.web.app` and `.firebaseapp.com` answer HTTP 200. On the live address `hosting_check.mjs` passed 21 of 22 checks for both roles (sign-in from that origin, live data, every page on a full reload, phone width, the dealer kept out and never calling the backend); the one failure is the cache header above. The backend answers a preflight from the hosted origin after its restart. Headless Chrome could not reach `http://localhost:8000` from the hosted page ("Failed to fetch"), as expected when the local network permission prompt cannot be answered; the real answer needs the shopkeeper's own Chrome (M11-2, still to do). From the test laptop's connection the hosted login page took 5.5 s to first byte (and 2.4 s for google.com), so the connection, not the site, was slow; a demo should use a good network.
- **Test kit (local, `.handoff/live-tests/`):** `signin_built.mjs` signs in to any built site (the old helper imports the dev server's source files), `hosting_check.mjs` (both roles, plus cache headers on the real address), `hosted_messages.mjs` (the hosted wording; locally on `hosted.localhost`, which Chrome treats as loopback and the app treats as hosted).

## Testing (Evaluation)
- Automated, Nov 12: backend 305 tests, frontend 819 (the new analytics, the What To Do rules, weekly grouping, the Products page and its focus-by-link behaviour, and the dashboard order each have their own tests). Earlier, Nov 11 evening: backend 294 tests (pytest with fakes: camera, detector, a repository that counts writes, a hand-moved clock; plus the seed_history planner and the Insights check script); frontend 762 tests (Vitest and Testing Library; the analytics are tested case by case: price changes mid-period, returns larger than sales, unpriced units, no sales, no scan, short history, a part added later); type checks, linters and the production build on every change.
- Live, Nov 12, on the final layout (each script writes nothing unless noted): tile figures fit at six widths on four pages (24 combinations); the Insights page equals the independent recomputation (175 checks over five runs); the dashboard order, height and side-by-side panels at six widths, five tabs, keyboard reach and the dealer kept out (37 checks); the Products tab with the link from the advice, focus return and axe at six widths (19 checks); 43 interface states with axe 0; the stock-change flow (F1) on temporary data, 33 browser checks and 8 data checks, with the real data verified identical afterwards.
- Full regression, Nov 12 (after the Products tab and the new dashboard): 56 of 56 checks across both roles, including a real Scan Now, with axe on every screen and the phone layout. The run exercises the real POS flow, so the real data was restored from a snapshot afterwards and verified identical.
- Insights, live Nov 11: the page compared with an independent recomputation (`insights_check.py`) at every period and with the part filter, all equal; axe 0 at six widths from 320 px; a dashboard tile opens its section with focus on the heading; the dealer has no tab and is redirected; a race between two quick filter clicks was found by the browser script and fixed.
- Live testing without touching real stock: a `.env` test setting adds made-up `zz_` parts to every scan, so order and Cancel flows run through the real backend and rules (7 checks, Nov 11). A name without the `zz_` prefix stops the backend at startup (seen live).
- Rules: 63 cases written for the Rules API test endpoint; live attack checks over REST with real sign-ins: 32 for the stock change log and Part Settings, 11 for Pause Scanning, 38 for M10 (reads per role, every Cancel Order case, and the backend's 403 for the dealer), all passing on Nov 11.
- Live, Nov 11: full regression 56 checks passing; all six camera states produced for real (lens covered, backend stopped, wrong camera index, scanning off, paused, live), each at 6 widths with axe 0; Pause Scanning by keyboard, end to end.
- Live, in Chrome with Playwright and axe: full regression across both roles, screenshot comparison at 5 widths, 43 extra interface states, keyboard walks; F1 flow end to end; temporary `zz-*` data, with the real data snapshotted and restored identically after every run.

## Problems found by live testing (Evaluation: what testing caught)
These were missed by unit tests and found only on the real system; each was fixed and covered by new tests.
| Found | Problem | Fix |
|---|---|---|
| Oct 31 | Load More claimed "all loaded" too early: Firestore answers a widened query from its local cache first | Skip a cached page until the server confirms |
| Oct 31 | The Orders tab was cut off on phones | Tabs move to a second header row below 960 px |
| Nov 4 | A second Part Settings save by the same person was refused (the rule required "who" to change) | Rule corrected and republished |
| Nov 4 | Dialogs opened with focus on the box, not the first field | The shared Dialog focuses the first field |
| Nov 4 | With automatic scanning, a dark shop would read as an empty shelf and order stock overnight | Frames below a brightness threshold are skipped |
| Nov 4 to 5 | A network hiccup held a scan (and Scan Now) for 19 to 144 s: the Firestore library retries for up to 300 s | Every call capped at 5 s per attempt and 10 s in total |
| Nov 5 | A timer left from the day before opened alerts on the first mismatched scan after a restart; a part low before an overnight gap was ordered at once | Timers and the low-scan streak restart after a gap or a restart |
| Nov 11 | The camera status line was read out by a screen reader on every page load, and said "Waiting for First Scan" for a moment while loading | A "Checking Camera…" state while loading; only a real change of state is announced |
| Nov 11 | The dashboard said "No active alerts. Everything on the shelf matches" while Stock Check showed 2 mismatches: alerts now wait 3 minutes, and the text predated the delay | The text counts the parts that differ and says a lasting mismatch becomes an alert |
| Nov 11 | The Scan Now button moved below the title when the camera status text was long, so the main action was in a different place in different states | The title block wraps its text; Scan Now keeps its place |
| Nov 11 | After a restart with automatic scanning off, the dashboard still said scanning was on, then "No Recent Scan", until Scan Now was pressed: the backend reported its setting only with a scan attempt | The backend publishes the setting once at startup; the dashboard showed "Automatic Scanning Off" 2 s after the next start, with no scan |
| Nov 11 | After a simulated test part was switched off, the dashboard kept showing it: `status/latest` was written with a merge, which never removes a key from the counts (a class removed from the model would linger the same way) | A counted scan now replaces the counts whole; a skipped or failed one still leaves them as they were. Checked live: a planted extra count was gone after the next scan |
| Nov 11 | Keyboard focus was lost after pressing Pause Scanning or Resume Scanning (the button is disabled while saving, and Chrome drops focus from a disabled button) | Focus is returned to the button when the save ends |
| Nov 11 | On a phone the day labels of the sales chart ran together and a money figure overflowed its tile | Labels are thinned on a phone; tile figures shrink to fit |
| Nov 11 | Two clicks on the Insights filters within a few milliseconds lost the first (the second built its address from the page as last drawn) | The update is now built from the address at the moment of the click. Two clicks inside the router's update delay can still lose the first; no person clicks that fast, so the live script now waits for the new state between clicks (listed in `docs/FUTURE_WORK.md`) |
| Nov 12 | On the dashboard the Sales and Shrinkage tile values broke mid-number ("LKR 31,800." then "00"), although they fitted on the Insights page; a wrap rule added a day earlier caused it and unit tests cannot see layout | The tile is a size container and its figure scales with it; a Chrome check measures every tile at six widths |
| Nov 12 | The Insights advice said "raise the petrol filter's level to 2" while the table under it, on a 90-day view, said 3: the table followed the period and the advice did not | Both use the last 30 days, and say so |
| Nov 14 | On the deployed site the home page and every page reached by the single-page rewrite were served with Firebase's default `Cache-Control: max-age=3600`, not `no-cache`: the rule was written for `/index.html`, but Hosting redirects that path to `/`, so the rule never applied (the hashed assets were right). A new deploy could show the old version for up to an hour | Add `no-cache` rules for `/` and for every path, with the assets rule after it; found by `hosting_check.mjs` on the real address. Fixed Nov 14 and checked on Firebase's own hosting emulator (`firebase emulators:start --only hosting`): the old rules reproduce the bug (`/` and `/alerts` carry no `no-cache`), the new ones give `no-cache` on every page and keep the assets cached for a year; a test locks the rule order. Takes effect on the next deploy |
| Nov 12 | Five tabs are 364 px wide and the header offers 320 px | The strip scrolls, padding is tighter, and the current tab is scrolled into view; five tabs fit from 375 px |

## Requirements status
| Req | Status (Nov 12) |
|---|---|
| FR1 capture periodically | Done: automatic scanning (M6) |
| FR2 to FR8 | Done (detection, counting, cloud storage, POS comparison, alerts, automatic orders, dashboard) |
| FR9 authentication | Done, with the final role rules (M10, Nov 11) |
| NFR1 accuracy | 0.995 mAP50 validation; live accuracy in M12 |
| NFR2 inference under 1 s | Met (25 to 48 ms) |
| NFR3 free services | Spark plan; usage measured in M12 |
| NFR4 usable by a non-technical shopkeeper | Usability test in M12 |
| NFR5 any webcam | `CAMERA_INDEX`; a wrong index shows "Camera Not Responding" on the dashboard (seen live, Nov 11) |
| NFR6 access control | Done: least privilege per role in the rules, and a role check on the backend's camera and image endpoints (M10, Nov 11) |
| NFR7 new parts without code changes | Product ids equal model class names; the Products tab, Stock Check and Insights list parts from the data |
| Supervisor feedback 1: history of past alerts | Done: the Alerts tab (Oct 31) |
| Supervisor feedback 2: business intelligence on the dashboard | Done (Nov 11 to 12): four dashboard tiles and the Insights page (sales and gross profit, shrinkage, days of cover, reorder recommendations, What To Do), on a synthetic 90-day history; stockouts, stock value and Apply are future work |
| Stock history (every POS change logged) | Logged since Nov 4; the viewing page (Stock Log, inside Products) is planned for Nov 13 |

## Operational lessons (Discussion)
- With the laptop's own camera, the person using the laptop is in the frame. On Nov 11 a face scored 0.54 as a spark plug and passed the size guards; retraining with background images (people, rooms) is the real fix (FUTURE_WORK).
- A sleeping laptop scans nothing: the shop laptop must not sleep (`caffeinate`, or the battery settings). The dashboard says "No Recent Scan" when it happens.
- The shop's internet connection drops for seconds at a time; the backend must assume it will.
- Brightness cannot tell a hand partly over the lens from a dim shelf; the time rules absorb short obstructions.
- Twice (Nov 4 at 12:05 local and Nov 11), the camera counted no parts in full light. On Nov 11 the saved shelf image confirmed the cause: the camera was pointed at the room, not the shelf. The system behaved as designed (two alerts after 3 minutes, resolved by themselves once the shelf was back in view), but it cannot tell "no parts" from "no shelf"; worth noting in M12 as a setup risk. Later the same morning four single scans read 0 and 0 at full brightness (03:38, 03:44, 03:50 and 03:53 UTC), each while the laptop was being used (before covering the lens, after restarts, pressing Scan Now); the saved image of one of them again showed the person at the laptop instead of the parts. The next scan with the parts in view read 4 and 1 each time, and the alert delay meant nothing was raised. For the evaluation and the demo the camera needs a fixed view of the shelf that using the laptop does not disturb.
