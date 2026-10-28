# Testing

## Automated (run before any hand-off)
```bash
# backend (from backend/, venv on)
python -m pytest                      # 108 tests, fakes only
ruff check . && ruff format --check .

# frontend (from frontend/)
npm run typecheck && npm test && npx oxlint && npm run build   # 327 tests
```
Backend tests use fakes from `tests/conftest.py` (no webcam, no Firebase). `oxlint` matters: `tsc` skips `.js`/`.jsx`, and it caught a removed component still imported in `AppShell.jsx`.

## Live checks (real Firebase, real Chrome)
Scripts are kept locally in `.handoff/live-tests/` (not committed): `regress.mjs` (44-check full regression), `nfull.mjs` (notification flow), `phone.mjs` (phone widths), `live4.mjs`, and `ntest.py` (temporary-data helper: setup, teardown, snapshot, restore, verify). They use Playwright with installed Chrome and axe-core against `http://localhost:5173`, hard-code absolute paths and the Firebase web API key from the scratch session, so adjust paths before reuse. Never put the test password in a script that is committed.

Rules for live tests:
1. Snapshot the real data first; use clearly named `zz-*` temporary data; restore and verify identical afterwards.
2. Before testing anything that depends on a Firestore rule, read the deployed ruleset through the Firebase Rules API (service account) and compare it with `firestore.rules`.
3. Use a normal window and an incognito window for the two roles (one browser shares one sign-in across tabs).
4. Use port 5173 (backend CORS).
5. Python Firebase subprocesses can segfault when spawned from Node; use REST with a service-account token.

## Rules attack checks
Over REST with real ID tokens: a dealer cannot write products or acknowledge alerts; a shopkeeper cannot accept or dispatch; nobody can create or delete orders or alerts; a user cannot read or write another user's `notification_reads`; wrong timestamps are refused.

## Accessibility
axe-core run on each page and role (0 violations at last run), phone widths 390, 375, 360 and 320 px, and review against the Web Interface Guidelines.

## Known flaky or limited
Detection can flicker on an unchanged shelf (for example 4 then 3); the two-scan rule absorbs it. End-on filters and dark rooms are missed. Latency compensation in Firestore updates the UI before the server confirms, so verify writes in the console too.
