# Testing

## Automated (run before any hand-off)
```bash
# backend (from backend/, venv on)
python -m pytest                      # 227 tests, fakes only
ruff check . && ruff format --check .

# frontend (from frontend/)
npm run typecheck && npm test && npx oxlint && npm run build   # 635 tests
```
Backend tests use fakes from `tests/conftest.py` (no webcam, no Firebase): a camera that returns a mid-grey frame (or a dark one, or fails), a detector, a repository that records every write and counts them as Firestore would, and a clock the test moves by hand, so time rules are tested to the second without waiting. `oxlint` matters: `tsc` skips `.js`/`.jsx`, and it caught a removed component still imported in `AppShell.jsx`.

## Live checks (real Firebase, real Chrome)
Scripts are kept locally in `.handoff/live-tests/` (not committed): `regress.mjs` (55-check full regression across both roles, including a real Scan Now and the Alerts page), `alerts.mjs` and `alerts_zz.py` (62 checks on the Alerts page and dashboard summary with 60 temporary `zz-u` alerts: filters, Load More past one page, focus, a notification opening its row, page titles, header fit from 320 to 1360 px with a simulated fourth tab), `baseline.mjs` and `compare.py` (30 screenshots per run, 6 views at 5 widths, with axe, compared pixel by pixel), `states.mjs` (43 states the screenshots miss: loading, Scan Now result and error, image errors, filters, hover and keyboard focus, tablet widths, Firestore unavailable; it fakes backend replies and writes nothing), keyboard walks (`bellkeys.mjs`, `shellkeys.mjs`, `keyscroll.mjs`, `login.mjs`), inline error checks (`stockerr.mjs`, and `orderr.mjs` for two people receiving one order at once), `ntest.py` and `realdata.py` (temporary `zz` data, and snapshot, restore and verify of the real data; with automatic scanning on, use `restore --keep-scans` and `verify --keep-scans`, which leave the scan history, `status/latest` and the shelf image to the running backend), `f1_rest.py` and `f1.mjs` (stock change log rules over REST and the F1 flow in Chrome), `pause_rest.py` (Pause Scanning rules), `m6_live.py` (alert and reorder delays against the running backend), `gap_live.py` (an old timer must not open an alert after a gap), `deployed_rules.py` (deployed rules equal `firestore.rules`) and `rules_test.py` (Rules API test endpoint; needs the Firebase Rules Viewer role). Each UI task during the Material UI move was compared against the previous task's screenshots on the same data. They use Playwright with installed Chrome and axe-core against `http://localhost:5173`, hard-code absolute paths and the Firebase web API key from the scratch session, so adjust paths before reuse. Never put the test password in a script that is committed.

Rules for live tests:
1. Snapshot the real data first; use clearly named `zz-*` temporary data; restore and verify identical afterwards.
2. Before testing anything that depends on a Firestore rule, read the deployed ruleset through the Firebase Rules API (service account) and compare it with `firestore.rules`.
3. Use a normal window and an incognito window for the two roles (one browser shares one sign-in across tabs).
4. Use port 5173 (backend CORS).
5. Python Firebase subprocesses can segfault when spawned from Node; use REST with a service-account token.
6. Do not run a snapshot and restore while someone is scanning: the restore would delete their scans. Check `status/latest.scannedAt` first. With automatic scanning on, use the `--keep-scans` restore.
8. Before a live test that needs the camera, check that it actually sees the shelf (the counts in `status/latest` match the shelf); twice it counted no parts with the shelf out of view.
7. After a click that changes the URL, wait for the new state (for example `aria-pressed="true"`), not for the URL: React Router renders a long table as a low-priority update, a few tens of milliseconds after the URL changes.

## Rules checks
`rules_test.py` (in `.handoff/live-tests/`, 65 cases) sends `firestore.rules` with mocked documents to the Firebase Rules API test endpoint, so a rule change is checked before the user publishes it and nothing is deployed or written. It covers the stock change log (every field, every type, the link to the product through `lastMovementId`, edits and deletes), Part Settings, who acknowledged and who received, and the unchanged rules. The service account needs the `firebaserules.rulesets.test` permission (for example the Firebase Rules Viewer role); without it the API answers 403.

## Rules attack checks
Over REST with real ID tokens, after the user publishes: a dealer cannot write products or acknowledge alerts; a shopkeeper cannot accept or dispatch; nobody can create or delete orders or alerts; a user cannot read or write another user's `notification_reads`; wrong timestamps are refused; a POS change without its log entry, a log entry by the dealer, and any edit or delete of a log entry are refused.

## Accessibility
axe-core run on each page and role at desktop and at 390 px, layout checked at phone widths 390, 375, 360 and 320 px, and review against the Web Interface Guidelines. The Oct 29 baseline found `scrollable-region-focusable` at 390 px: the table scroll boxes could not be reached by keyboard (desktop axe was 0). Fixed by the shared `TableScroll` wrapper, which becomes a labelled, focusable region only when the table overflows. Run axe at a phone width as well as desktop; some failures only appear when content overflows.

## Known flaky or limited
Detection can flicker on an unchanged shelf (for example 4 then 3); the two-scan rule absorbs it. End-on filters and dark rooms are missed. Latency compensation in Firestore updates the UI before the server confirms, so verify writes in the console too.
