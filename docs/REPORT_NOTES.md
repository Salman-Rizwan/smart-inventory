# Report Notes

Material for the final report (M13), collected while building. Each section says where the details live. Limitations and future work are in `docs/FUTURE_WORK.md`; the reasons behind each design are in `docs/DESIGN_DECISIONS.md`; how everything is tested is in `docs/TESTING.md`. Keep this file current: add measurements and findings as they happen.

## Before writing
- Replace ESP32 with webcam, and Realtime Database with Firestore, everywhere in the earlier chapters.
- State that the demo history is synthetic and marked `seeded: true` (once `seed_history` exists).
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
| Still to do | Stock Log, Insights (F3), M10, M11, M12 | See `docs/TASKS.md`, "Remaining work" |

## Engineering approach (Implementation)
- Layered backend: routes (HTTP only), services (use cases), adapters (camera, detector, Firestore). Decisions live in pure, unit-tested functions: `reconcile.py`, `alerts.py`, `orders.py`, `scan_policy.py`, `frame_quality.py`.
- Typed errors with one response shape; best-effort steps never lose a scan.
- Frontend in feature folders, TypeScript for new code, one live listener per collection shared through providers.
- Security in Firestore rules: each browser write is checked field by field (for example a POS change must arrive with its matching log entry).
- Accessibility: WCAG AA contrast, keyboard use, screen-reader announcements, colour never alone; axe 0 on every page.

## Measurements so far (Evaluation)
| Measure | Result | Source |
|---|---|---|
| Model accuracy (validation) | 0.995 mAP50 | Training run (Colab) |
| Inference per frame | 25 to 48 ms on the shop laptop (NFR2 target under 1 s) | Scan records, Nov 4 to 11 |
| Camera capture | 1.25 s opening the camera per scan; 0.19 s with the camera kept open | `status/latest` timings, Nov 4 to 5 |
| Scan Now click to result | 2.8 to 5.4 s before the camera change (target 3 s); to be remeasured in M12 | Live regression runs, Oct 30 to Oct 31 |
| Database steps per scan | 0.3 to 1 s normally; reads 0.15 to 0.4 s warm, 1.2 to 1.6 s for the first read on a new connection | Live, Nov 5 |
| Alert delay | Alert opened 203 s after the mismatch began (setting 180 s plus the next 30 s scan) | Live test, Nov 4 |
| Writes from automatic scanning | Overnight: 8 scan records over the hours the laptop was awake (5 heartbeats every 10 minutes, 2 changes, 1 manual) instead of about 300; a quiet scan costs 1 write | Live soak, Nov 4 to 5 |
| Brightness (0 to 255) | Lights on 171 to 183; lights off with daylight 40 to 53 (counts still right); lens covered 18 and 39 (skipped); threshold 40 | Live, Nov 4 to 5 |
| Free-tier budget (estimate) | About 1,500 writes and 7,000 reads a day from the backend at a 60 s interval, plus about 1,440 reads a day per open dashboard; limits are 20,000 and 50,000 | Design calculation; to be measured in M12 |

Still to measure in M12 (`docs/TASKS.md`): detection accuracy over 20 arrangements under 3 lighting conditions, Scan Now timing over 50 runs, sync latency over 10 trials, one day of real free-tier usage, functional test cases FR1 to FR9, and a usability test with 3 people.

## Testing (Evaluation)
- Automated, Nov 11: backend 227 tests (pytest with fakes: camera, detector, a repository that counts writes, a hand-moved clock); frontend 635 tests (Vitest and Testing Library); type checks, linters and the production build on every change.
- Rules: 63 cases written for the Rules API test endpoint; live attack checks over REST with real sign-ins: 32 for the stock change log and Part Settings, 11 for Pause Scanning, all passing.
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

## Requirements status
| Req | Status (Nov 11) |
|---|---|
| FR1 capture periodically | Done: automatic scanning (M6) |
| FR2 to FR8 | Done (detection, counting, cloud storage, POS comparison, alerts, automatic orders, dashboard) |
| FR9 authentication | Done; final role rules in M10 |
| NFR1 accuracy | 0.995 mAP50 validation; live accuracy in M12 |
| NFR2 inference under 1 s | Met (25 to 48 ms) |
| NFR3 free services | Spark plan; usage measured in M12 |
| NFR4 usable by a non-technical shopkeeper | Usability test in M12 |
| NFR5 any webcam | `CAMERA_INDEX` |
| NFR6 access control | Rules per role; final set in M10 |
| NFR7 new parts without code changes | Product ids equal model class names |

## Operational lessons (Discussion)
- A sleeping laptop scans nothing: the shop laptop must not sleep (`caffeinate`, or the battery settings). The dashboard says "No Recent Scan" when it happens.
- The shop's internet connection drops for seconds at a time; the backend must assume it will.
- Brightness cannot tell a hand partly over the lens from a dim shelf; the time rules absorb short obstructions.
- Twice (Nov 4 at 12:05 local and Nov 11), the camera counted no parts in full light, most likely because the shelf was out of view; worth noting in M12 as a setup risk.
