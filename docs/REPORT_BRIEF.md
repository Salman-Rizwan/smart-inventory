# Smart Inventory: Brief for Writing the Final Report

Prepared on Nov 15, 2026 from the project's own documents, for writing the final-year project report (due **Nov 19, 2026**). It gives the whole picture in one place: what was built, the logic behind every rule, the results, the limitations, and where each detail lives. The report is the author's own work; any disclosure of tool use follows the university's policy and is the author's decision.

## 0. How to use this brief (for the assistant helping with the report)

Attach these files together with this brief. Each is the authority for its subject; where they disagree with anything older, they win.

| File | What it holds | Use it for |
|---|---|---|
| `docs/REPORT_NOTES.md` | Every measurement, the build timeline, assumptions, the functional test case table, testing, problems found by testing, requirements status, operational lessons | Implementation, Testing and Evaluation chapters |
| `docs/DESIGN_DECISIONS.md` | Why each part is built the way it is, with the trade-offs | Design chapter, and the "why" anywhere |
| `docs/FUTURE_WORK.md` | Known limitations of the submitted version, and future work (why it matters, why deferred, how to build it) | Limitations and Future Work chapters |
| `README.md` | Architecture, repository layout, data model, requirements table, the flows (reconciliation, alerts, orders, notifications, roles), how to run it | Design and Implementation, appendices |
| `docs/TESTING.md` | How everything is verified: automated tests, live checks, rules checks, accessibility, evaluation tools | Testing chapter, methodology |
| `docs/USABILITY_TEST.md` | The usability test script (10 tasks, SUS questionnaire) | Evaluation (usability), appendix |

Rules for the assistant:
1. **Never invent a number, date, name or result.** Every figure in the report must come from these files. If a figure is missing, write `[PENDING: what is needed]` and list it at the end of the answer.
2. Items still to run are marked **PENDING** in section 9. Leave a clear placeholder for each; do not estimate them.
3. The project changed from the original proposal (section 2). Earlier chapters written for the proposal or the interim report must be brought in line: webcam instead of ESP32-CAM, Firestore instead of Realtime Database.
4. The demo history behind the Insights figures is synthetic and must be described as such (section 7.10).
5. Write in plain, precise English, in the author's voice. Explain the reason behind each design choice and its trade-off, as `DESIGN_DECISIONS.md` does.

## 1. The project in one page

**Problem.** A small auto-parts shop keeps its stock records in a point-of-sale (POS) system, but the shelf and the records drift apart through unrecorded sales, theft, damage and miscounts. Nobody notices until a customer asks for a part that the records say is there. Reordering is manual and late.

**Solution.** A webcam watches the shelf. A YOLOv8 object detection model, trained for this project, counts the parts in each image. The count is compared with the POS record for each part:
- if they disagree for long enough, the shopkeeper gets an **alert**;
- if the shelf runs low, the system raises a **purchase order** for the dealer, who accepts and dispatches it through the same web app;
- the shopkeeper confirms delivery, which updates the stock record.

A business intelligence page turns the stock history into sales, profit, shrinkage, days of cover and reorder advice (supervisor feedback, section 4).

**Scope of the build.** Two part types (spark plug, petrol filter) on one shelf, one shop laptop, one dealer. The POS is a mock (buttons for Record Sale, Receive Stock and Adjust Stock), because no real till was available. New part types need only retraining and one database record, no code change (NFR7).

**Key facts.**

| Fact | Value |
|---|---|
| Live address | https://smart-inventory-da834.web.app (Firebase Hosting) |
| Development period | Oct 9 to Nov 15, 2026; 105 commits; interim viva Oct 28 |
| Backend | Python 3.11, FastAPI 0.162, Ultralytics 8.4.163, firebase-admin; 32 modules, about 1,650 lines; 10 operational scripts |
| Frontend | React 19, Vite 8, TypeScript 7, Material UI 9.5, Firebase JS SDK 13; 129 source files, about 7,900 lines; 7 feature areas (auth, dashboard, alerts, orders, inventory, insights, notifications) |
| Security rules | `firestore.rules`, 229 lines, field-by-field checks on every browser write |
| Automated tests | Backend 334 (pytest, about 3,300 lines, fakes only); frontend 861 in 83 files (Vitest and Testing Library, about 7,800 lines); type check, linters (ruff, oxlint) and the production build on every change |
| Model | YOLOv8 (Ultralytics 8.4.163), classes `spark_plug` and `petrol_filter`, trained on Google Colab, 0.995 mAP50 on the validation set |
| Cost | Free: Firebase Spark plan only (no Cloud Functions, no Cloud Storage) |

## 2. What changed from the proposal, and why

| Proposal | Final system | Reason |
|---|---|---|
| ESP32-CAM camera | USB or laptop webcam, read with OpenCV; device chosen by `CAMERA_INDEX` (NFR5) | Simpler and more reliable capture; the model runs on the laptop anyway |
| Firebase Realtime Database | Cloud Firestore | Document model with queries, and security rules that can check each field of each write |
| Processing in the cloud (Cloud Functions) | All processing on the shop laptop (FastAPI); Firebase only stores, signs in and hosts | Cloud Functions and Cloud Storage need the paid plan; NFR3 asks for free or low-cost services |
| Manual capture | Automatic scanning every 30 s (the shop's setting; default 60 s), plus Scan Now | FR1 "capture periodically"; needed time rules so that people passing do not raise alerts (section 7.3) |
| Basic dashboard | Five-tab shopkeeper app (Dashboard, Alerts, Orders, Products, Insights), a dealer app, notifications, Stock Log, business intelligence | Supervisor feedback at the interim viva (section 4) and a review from the shopkeeper's point of view (Oct 31) |

## 3. Assumptions and scope (state these in the Introduction or Scope, and again in Evaluation)

Agreed with the author on Nov 15, 2026:
- **Shelf layout:** parts in one layer, a few centimetres apart, none cut off at the frame edge. Touching parts are miscounted; the evaluation measured this on purpose (section 8.1).
- **Lighting:** the shelf is properly lit. Frames darker than a set brightness are skipped rather than counted as an empty shelf.
- **Camera position:** a fixed view of the whole shelf, with nobody in the frame.
- **All stock of a tracked part is on the camera's shelf** (the POS counts everything the shop holds).
- **The POS is a mock;** a real till would feed the same records.
- **One shop, one camera, one dealer.**

## 4. Supervisor feedback (interim viva, Oct 28) and how it was answered

| Feedback | Answer | Where |
|---|---|---|
| 1. A history of past alerts | An **Alerts** tab with summary tiles, a filter (Open, Acknowledged, Resolved, All), and a table of when each alert was raised, acknowledged and resolved; past alerts load 50 at a time; a notification opens its alert's row | README "Alerts"; DESIGN_DECISIONS "Alerts have their own page" |
| 2. Business intelligence on the dashboard | Every stock change is now logged (the basis for any analytics). Four "Business at a Glance" tiles on the dashboard, and an **Insights** page: sales and gross profit, part ranking, shrinkage, days of cover, dealer lead time, suggested reorder levels, and a What To Do list | Section 7.10; REPORT_NOTES "Insights as built" |

## 5. Architecture

```
 Shop laptop (does all processing)                Firebase, free Spark plan              Browsers
 ┌─────────────────────────────────┐              ┌───────────────────────┐
 │ Webcam ─> FastAPI backend       │  firebase-   │ Firestore (database)  │  live listeners  Shopkeeper app
 │   camera.py   (OpenCV capture)  │  admin SDK   │ Authentication        │ <──────────────> (5 tabs)
 │   detector.py (YOLOv8 count)    │ ───────────> │ Hosting (React app)   │                  Dealer app
 │   reconcile / alerts / orders   │              └───────────────────────┘                  (Purchase Orders)
 │   (pure planning functions)     │
 │   auto scanner (every 30 s)     │ <── Scan Now and shelf image: called directly by the
 └─────────────────────────────────┘     shopkeeper's browser (shop laptop only)
```

- **Backend layers:** routes (HTTP only), then services (use cases such as `ScanService`), then adapters (camera, detector, Firestore). Every decision lives in a pure, unit-tested function with no input or output (`reconcile.py`, `alerts.py`, `orders.py`, `scan_policy.py`, `frame_quality.py`). Dependencies are wired in one place (`create_app`) and injected, so tests replace the camera, model, database and clock with fakes.
- **Typed errors:** every expected failure is a subclass of `AppError` with one response shape (`{"error": {"code", "message", "details"}}`); users see a safe message with a next step.
- **Frontend:** feature folders; one live listener per collection, shared by providers, so each piece of data is read once per session; components render, repositories and services do the reading and writing.
- **Security:** the browser writes to Firestore directly, so `firestore.rules` is the security boundary. Each role may write only specific fields in specific states (section 7.8). The backend checks each request's Firebase sign-in token and role.
- **Hosting:** the built React app is served by Firebase Hosting. The dealer uses it from anywhere. The shopkeeper uses it for everything except Scan Now and the shelf image, which come from the laptop (since Chrome 142, the browser asks the user once to allow a public page to reach the laptop's local backend; measured working, section 8.2).

## 6. Data model (Firestore)

| Collection | Holds | Written by |
|---|---|---|
| `status/latest` | Latest counts, scan time, last attempt and its outcome (counted, skipped, failed), step timings, whether automatic scanning is on | Backend |
| `scans/{id}` | Scan history: counts, time, inference time; saved on change, on every manual scan, and as a heartbeat every 10 minutes | Backend |
| `products/{class name}` | One per part, id equal to the model's class name: POS count, reorder level and quantity, cost and price (LKR), status (Matched or Mismatch), timers (`mismatchSince`, `lowSince`), `lowScanStreak`, `lastMovementId` | Backend (status, timers); shopkeeper (POS count with its log entry; Part Settings) |
| `stock_movements/{id}` | The stock change log: type (Sale, Receipt, OrderReceived, Adjustment with a reason, Reset), signed change, POS before and after, cost and price at that moment, who, when. Never edited or deleted | Shopkeeper, in the same transaction as the POS change |
| `alerts/{id}` | Part, camera and POS counts, state (Open, Acknowledged, Resolved), times, who acknowledged | Backend; shopkeeper acknowledges |
| `purchase_orders/{id}` | Part and its name, quantity, state (Pending, Accepted, Dispatched, Received, Cancelled), a time for each step, who received or cancelled, cancel reason | Backend creates; dealer and shopkeeper move it on |
| `users/{uid}` | Name and role (shopkeeper or dealer) | Setup script |
| `notification_reads/{uid}` | The user's read notification keys (at most 500) | That user only |
| `settings/scanning` | Pause Scanning (`pausedUntil`, at most 30 minutes ahead) | Shopkeeper |

## 7. How it works: the logic behind each rule

### 7.1 One scan, step by step
1. **Capture:** read a frame from the webcam. With automatic scanning on, the camera stays open and only a few stale buffered frames are dropped (capture 0.19 s instead of 1.25 s with reopening).
2. **Quality check:** if the frame's mean brightness is below `MIN_FRAME_BRIGHTNESS` (40 of 255), the scan is **skipped**: a dark shop must not read as an empty shelf, which would raise alerts and order stock every night. Measured: lights on 171 to 183; lights off with daylight 40 to 53 (counts still right); lens covered 18 and 39 (skipped).
3. **Detect and count:** YOLOv8 finds the boxes (confidence at least 0.5). Boxes larger than 25% of the frame's area or 60% of either side are dropped, because the model has no "not a part" class and a face or a room can score as a part.
4. **Save:** the counts go to `status/latest` (always) and to `scans` (only on a change, on every manual scan, or as a 10-minute heartbeat), so a quiet automatic scan costs one database write.
5. **Best-effort follow-up steps,** each of which may fail without losing the scan: reconciliation, then alerts, then orders. Each is a pure planning function that returns what to write; the service then writes it.

### 7.2 Reconciliation (POS comparison)
Per part: **Matched** when the camera count equals the POS count, otherwise **Mismatch**. The rule is stored on each scan by the backend and repeated in the browser so that Stock Check updates instantly while the shopkeeper edits the POS. The two copies are kept identical and both are tested. Difference = shelf minus POS; a negative difference means the records claim stock that is not on the shelf.

### 7.3 Time rules (why alerts and orders wait)
With scanning every 30 s, a customer reaching for a part, a person restocking, or a hand in front of the lens would raise false alerts and orders. So decisions use time, not scan counts:
- **Alert delay:** an alert opens only when a mismatch has lasted `ALERT_DELAY_SECONDS` (180 s). Stock Check still shows the mismatch at once.
- **Order delay:** an order needs the part to be low for `REORDER_DELAY_SECONDS` (300 s) **and** for `REORDER_CONFIRM_SCANS` (2) scans in a row.
- **Gap rule:** a timer must mean "mismatched (or low) the whole time we watched". On the first counted scan after the backend starts, and after a gap longer than 3 scan intervals with no counted scan (laptop asleep, backend stopped, frames too dark), the timers and the streak restart from that scan. This was found live on Nov 5: a timer left over from the previous day opened alerts on the first scan after a restart.
- A missing, malformed or future timestamp counts from now, never from a guess.
- **Pause Scanning:** restocking takes longer than the alert delay, so the shopkeeper can pause automatic scanning for 15 minutes. The rules allow at most 30 minutes ahead, so it always resumes by itself. If the setting cannot be read, scanning is treated as not paused: a missed pause is safer than scanning silently stopping.

### 7.4 Alert lifecycle (`alerts.py`, the only place alerts are created or resolved)
- Mismatch lasting past the delay: one **Open** alert per part. Later scans refresh its counts but never create a second alert.
- Counts match again: the alert becomes **Resolved** automatically and stays as history. A returning mismatch opens a new alert.
- The browser may only **Acknowledge** (Open to Acknowledged, with the server's time and who did it). The alert stays active until the counts match.

### 7.5 Automatic ordering (`orders.py`, the only place orders are created)
- A part is **low** when the camera count is at or below its `reorderLevel`.
- A **Pending** order for `reorderQty` is raised when the part has been low for 2 scans in a row **and** for 5 minutes, **and** no order for it is open.
- While an order is open, the streak and timer are held at zero; after the order is received, the part must be low again for fresh scans before the next order. A part never has two open orders.
- Orders follow the **camera's** count, not the POS, because the shelf is the verified truth and the POS may be wrong (that is what the alert is for).
- A `reorderQty` of 0 turns automatic ordering off for that part.

### 7.6 Order workflow (a state machine shared by the browser, the rules and the backend)
```
Pending ──dealer: Accept──> Accepted ──dealer: Mark Dispatched──> Dispatched ──shopkeeper: Mark Received──> Received
   │                           │
   └──shopkeeper: Cancel (with a reason)──> Cancelled  (only before dispatch; never deleted)
```
- **Mark Received** is one transaction: the order becomes Received, its quantity is added to the POS count, and an OrderReceived log entry is written, all or nothing. Receiving twice is refused.
- **Cancel, never delete:** deleting would erase the history the dealer and Insights rely on. A cancelled order is no longer open, so if the shelf is still low a fresh order follows after the usual scans and delay. The dealer is notified only when an order they had accepted is cancelled.
- **A delivery is counted once:** Receive Stock warns when a dispatched order exists for the part and points to Mark Received.

### 7.7 Stock change log (every POS change is recorded)
Every change to a POS count (Record Sale, Receive Stock, Adjust Stock, Mark Received) writes a `stock_movements` entry **in the same transaction**. The product stores `lastMovementId`, and the rules refuse a POS change unless that entry is new and its before and after counts match the change. Entries record who and when (the server's time), copy the part's cost and price at that moment (a later price change never rewrites past revenue), and can never be edited or deleted. **Adjust Stock** sets the POS to a counted figure with a required reason (Damaged, Lost or Stolen, Miscount, Found, Customer Return), so write-offs are never disguised as sales. The **Stock Log** (Products, second view) shows these entries by period and part.

### 7.8 Roles and least privilege
- **Shopkeeper:** everything about the shop: counts, Stock Check and the POS buttons, alerts, orders (receive, cancel), Products (cost, price, reorder settings), Insights, Pause Scanning, Scan Now.
- **Dealer** (an outside business): reads purchase orders only (no stock counts, prices, sales, alerts or scans); orders therefore carry the part's name. May only accept and dispatch.
- Enforced in two places: `firestore.rules` (each role's own fields and steps, server timestamps only, no deletes) and the backend (Scan Now and the shelf image answer the shopkeeper only; any other user gets 403). The backend keeps a user's role for 5 minutes to save reads, so a role change reaches it within 5 minutes.

### 7.9 Notifications
Notifications are **derived from live data, never stored**: a notification exists exactly while its alert or order still needs attention, so it cannot go stale. Shopkeeper: open alerts and dispatched orders to confirm. Dealer: pending orders to accept. Only each user's "read" keys are stored. "Unread" (personal) is separate from "Acknowledged" (shared), and reading never hides work: tab badges and summary tiles count work waiting, not unread items. In-app only (email or push would need Cloud Functions, a paid plan).

### 7.10 Business intelligence (Insights)
Computed in the browser by pure, tested functions over the last 7, 30 or 90 days, from the stock change log and the orders (read once per session over a 180-day window, shared by the dashboard tiles, the Insights page and the Stock Log). In the browser because the data is already there, the hosted app must work without the shop laptop, and Cloud Functions are not on the free plan.

| Figure | Definition |
|---|---|
| Sales | Units sold minus customer returns, each entry at its own stored price; units without a price are counted and reported, never valued at 0 |
| Gross profit and margin | (price − cost) × units over entries that have both; margin = profit ÷ the sales value of those entries; entries missing a cost are noted |
| Shrinkage | Damaged plus Lost or Stolen write-offs at cost, and as a share of sales value |
| Days of cover | Camera shelf count ÷ average daily sales (an average, because the median of mostly-zero days is 0) |
| Dealer lead time | Median of (received − created) over received orders (a median, so one slow order does not skew it) |
| Suggested reorder level | Lead-time demand (average daily sales × lead time) plus a safety margin of half that demand (at least 1), rounded up; given only after 14 days of history and 2 received deliveries |
| What To Do | One next step per part from the first matching rule: no scan yet; order open or due; raise or lower the reorder level; no sales; too early; OK. Always on the last 30 days, so the advice does not change with the period shown |

Every figure has a **second, independent implementation** in Python (`insights_check.py`), written from the definitions; a browser script compared the page with it: 175 checks over five runs, 0 differences (Nov 12). "No data" always names what is missing (for example "1 of 2 deliveries received"), never 0 or infinity.

**Demo history (must be disclosed):** the shop had no sales history, so `seed_history` writes 90 days of synthetic trading (147 stock changes, 12 received orders, 18 resolved alerts; demo cost and price: spark plug 350/500 LKR, petrol filter 900/1,200 LKR). It is planned backwards so it ends exactly at the real POS counts; every record is marked `seeded: true`, and the page shows "Includes demo data". All Insights figures over that period are illustrative.

### 7.11 Camera status and honesty
The dashboard always says what state the camera is in (scanning, paused, too dark, camera not responding, scanning off, no recent scan), each with an icon, text and a next step. "No Recent Scan" is checked first, so an old "all good" never hides a sleeping laptop. Every database call is limited to 5 s per attempt and 10 s in total; the Firestore library's default is to retry for 300 s, which once held Scan Now for up to 144 s.

### 7.12 User interface and accessibility
A Carbon-style look built on Material UI: IBM Plex fonts, one teal accent, square hairline surfaces, no gradients or shadows. Colour carries status only and never alone: always an icon plus text. Accessibility follows WCAG AA: contrast, keyboard use and visible focus, labelled controls, screen-reader announcements for results, and reduced motion honoured. Automated accessibility checks (axe) report 0 violations on every page and interface state checked, at desktop and phone widths down to 320 px. The layout works on phones: five tabs fit from 375 px.

## 8. Results (Evaluation)

All from `docs/REPORT_NOTES.md`, measured on the real system: the shop laptop's webcam, real Firebase and real Chrome.

### 8.1 Detection accuracy (NFR1), Nov 15
Method: 11 arrangements of known counts × 3 lighting directions × 3 frames = 99 frames, using the backend's own camera, model and settings, scored by count. Arrangements 10 and 11 had touching plugs, on purpose.

| Layout | Frames | All counts right | Spark plug precision / recall | Petrol filter precision / recall |
|---|---|---|---|---|
| Spaced parts (1 to 9) | 81 | 73 (90.1%) | 98.2% / 100% | 93.0% / 98.1% |
| Touching plugs (10, 11) | 18 | 1 (5.6%) | 100% / 73.0% | 100% / 100% |
| All | 99 | 74 (74.7%) | 98.6% / 92.4% | 94.7% / 98.6% |

Validation-set accuracy: 0.995 mAP50 (target at least 85%). Empty sheets read 0 in all 18 frames. Causes of the 25 wrong frames, read from the images: touching plugs merged into one box (17); a filter's shadow given a second box (4); a laptop edge beside the shelf scored as a plug (2); a duplicate box on one plug (1); a filter cut off at the frame edge (1). Limitation: all three lighting conditions measured 139 to 207 brightness (the webcam adjusts its exposure), so low light was not covered.

### 8.2 Speed (NFR2), Nov 15
- **Inference:** 25 to 48 ms per frame (target under 1 s); median 45 ms in the accuracy run.
- **Scan Now, click to result on screen:**

  | Page | Presses | Median | Mean | 95th percentile | Max | Under the 3 s target |
  |---|---|---|---|---|---|---|
  | Laptop page | 50 | 817 ms | 989 ms | 1,748 ms | 1,948 ms | 50 of 50 |
  | Hosted page | 10 | 871 ms | 1,076 ms | n/a | 2,235 ms | 10 of 10 |

  Every press counted correctly. The slower presses (1.6 to 2.2 s) reopened the camera after a pause. Before the camera was kept open, a press took 2.8 to 5.4 s.
- **Sync latency** (a change in one browser until a second browser shows it): 10 of 10 seen; median 150 ms, mean 175 ms, max 348 ms.

### 8.3 Free-tier usage (NFR3)
A 4.1-hour sample of automatic scanning (Nov 15, 06:42 to 10:46, no gaps) gave about 3,400 reads and 570 writes, which scales to about 20,000 reads (41% of the 50,000 daily limit) and 3,400 writes (17% of 20,000) a day. These figures are provisional: a sample scaled to a day, including one open browser. **The author decided (Nov 16) that this sample stands; no 24-hour count is run before submission.** Present it as a 4.1-hour sample scaled to a day, say how it was measured (the Firebase console's usage totals before and after, with the scan records proving the window had no gaps), and list a full 24-hour count as future work.

### 8.4 Correctness and testing
- **Functional test cases:** 25-plus cases covering FR1 to FR9, Insights, Stock Log and Hosting, defined in REPORT_NOTES "Functional test cases". TC3.1 (counting) and TC-H2 (Scan Now from the hosted page) passed on Nov 15. **[PENDING: the rest are run in the final regression before release, about Nov 17.]**
- **Full regression:** 56 of 56 checks across both roles, Nov 12. The current version has 63 checks. **[PENDING: final run on the release code.]**
- **Insights:** 175 checks against the independent recomputation, 0 differences.
- **Security rules:** 63 cases on the Rules API test endpoint, all passing on Nov 11 (the kit now has 65), plus live attack checks over REST with real sign-ins (32 for the stock log and Part Settings, 11 for Pause Scanning, 38 for least privilege, 13 for the dealer's order steps), all passing.
- **Dealer flow** (Nov 15): 28 of 28 read-only checks and 48 of 48 two-role checks, also on the hosted address.
- **A fresh clone** set up from the README alone passed every automated test without access to the Firebase project.
- **Problems found only by live testing:** 19 defects that unit tests could not see, each fixed and covered by new tests. Examples: a stale timer after a restart; Firestore's 300 s retries; tile figures breaking mid-number; a cache header rule that never applied on the live site. The table is in REPORT_NOTES.

### 8.5 Usability (NFR4)
**[PENDING: one participant (the author's brother), 10 shopkeeper tasks and the System Usability Scale questionnaire (`docs/USABILITY_TEST.md`); planned for Nov 16.]** With one participant the result is an indication, not a statistic; say so.

## 9. Still to do before submission (as of Nov 15, night)

| Item | Status | Effect on the report |
|---|---|---|
| Usability test with the author's brother | PENDING, Nov 16 | Fills 8.5 (task results, SUS score, comments) |
| Stock Log live checks and a keyboard focus check | PENDING, Nov 16 | One more line under testing |
| Final regression, with the functional test cases, on the release code; version 1.0.0; tag, deploy | PENDING, about Nov 17 | Fills 8.4; the report then describes exactly the submitted version |
| 24-hour free-tier count | Not run: the 4.1-hour sample stands (the author's decision, Nov 16) | 8.3 is final as written |
| Screenshots for the report | Taken Nov 16 (16 figures with captions, including the model's detection output and four failure examples); the dashboard (desktop and phone) still to take with the backend running | Figures for the Implementation and Evaluation chapters |

## 10. Limitations (full table in FUTURE_WORK "Known limitations")
- Touching parts, shadows and objects beside the shelf cause miscounts (measured, 8.1). The model has no "not a part" class; box-size guards mitigate this until it is retrained with background images.
- Filters seen end-on or cut off at the frame edge are missed.
- One shelf, one camera, one shop. The POS is a mock.
- The laptop must stay awake, online and pointed at the shelf. A sleeping laptop scans nothing, and the dashboard says so.
- Brightness cannot tell a hand partly over the lens from a dim shelf; the time rules absorb short obstructions.
- Scan Now and the shelf image work only from the shop laptop (or a browser allowed to reach it); the dealer and remote viewers see counts but not the photo.
- The Insights history is synthetic demo data.
- Notifications are in-app only.
- Ultralytics is licensed AGPL-3.0, which matters for a commercial product.
- The evaluation is small: one shop setup, 99 frames, one usability participant.

## 11. Future work (full list in FUTURE_WORK)
Retrain with background images, touching and overlapping parts, shadows and end-on filters, then repeat the accuracy run; a real low-light test; a "shelf in view" check; several cameras and shelves; a hosted thumbnail of the shelf image; integration with a real POS; email or push notifications (needs a paid plan); undo for Record Sale; stockouts and lost sales, stock value and dealer analytics; owner and staff roles with approval for adjustments; continuous integration.

## 12. Suggested report structure, with sources

| Chapter | Content | Sources |
|---|---|---|
| Abstract | Problem, solution, the headline results (8.1 to 8.3) | This brief |
| 1. Introduction | Problem, aims and objectives, scope, assumptions (section 3) | Sections 1 and 3; the proposal |
| 2. Background and related work | Inventory shrinkage and record inaccuracy, computer-vision stock counting, YOLO object detection, serverless back ends | The proposal's literature review, updated |
| 3. Requirements | FR1 to FR9, NFR1 to NFR7 and their status | README "Requirements and milestones"; REPORT_NOTES "Requirements status" |
| 4. Design | Architecture, data model, the logic in section 7, security, UI and accessibility, changes from the proposal (section 2) | Sections 2, 5, 6 and 7; DESIGN_DECISIONS |
| 5. Implementation | Build timeline, engineering approach, Insights, Hosting, screenshots | REPORT_NOTES "What was built", "Engineering approach", "Insights as built", "Hosting (M11) as built" |
| 6. Testing | Strategy (unit tests with fakes, live checks, rules checks, accessibility), problems found by live testing | TESTING; REPORT_NOTES "Testing", "Problems found by live testing" |
| 7. Evaluation | Accuracy, speed, sync, free-tier usage, functional cases, usability, against each NFR | Section 8; REPORT_NOTES "Measurements", "Detection accuracy", "Functional test cases" |
| 8. Discussion | What worked, what did not, operational lessons (keeping a laptop awake, camera placement, people in the frame) | REPORT_NOTES "Operational lessons" |
| 9. Limitations and future work | Sections 10 and 11 | FUTURE_WORK |
| 10. Conclusion | Objectives met, with evidence | Sections 4 and 8 |
| Appendices | Data model, security rules summary, test case table, usability script, setup guide | README; USABILITY_TEST; REPORT_NOTES |

## 13. Glossary
- **POS (point of sale):** the shop's stock records; here a mock with Record Sale, Receive Stock and Adjust Stock.
- **Matched or Mismatch:** whether the camera count equals the POS count for a part.
- **Reorder level:** the shelf count at or below which a part is "low"; **reorder quantity** is how many to order.
- **Shrinkage:** stock lost to damage or theft, valued at cost.
- **Days of cover:** how many days the shelf would last at the recent rate of sales.
- **Lead time:** days from an order being raised to its receipt.
- **mAP50:** mean average precision at 50% box overlap, the standard detection accuracy measure on a labelled validation set.
- **Precision and recall (by count):** for each part, matched = min(true, counted); precision = matched ÷ counted; recall = matched ÷ true.
- **Spark plan:** Firebase's free tier (50,000 reads and 20,000 writes a day in Firestore).
- **Least privilege:** each role can read and change only what its job needs.
