# Roadmap

Deadlines: code freeze Nov 7, 2026; submit Nov 8; final submission Nov 9. Done so far: M1 to M5, M7, M8, M9 and notifications (see `README.md` Status). Ordered by what the evaluation and report need most.

## 1. M6: automatic scanning every 60 s
- A background loop in the backend calls the same scan service every `SCAN_INTERVAL` seconds (new `.env` setting, validated in `core/config.py`).
- Free-tier budget: write a `scans` document only when the counts change, plus a heartbeat every 10 minutes. `status/latest` is updated every scan.
- Must not overlap with a manual Scan Now (one scan at a time); camera errors are logged and the loop carries on.
- Tests with the fake camera and fake repository; no real webcam.

## 2. M10: full role-based security
- Replace the interim rules with the final set; keep every rule currently in `firestore.rules`. The user publishes them.
- Backend role check: today any signed-in user, including a dealer, can call `/scan` and `/snapshot`. Add a shopkeeper-only dependency.
- Rules attack tests (see `docs/TESTING.md`).

## 3. M11: Firebase Hosting
- Deploy the React build. Add the hosted origin to `CORS_ORIGINS`. "Scan Now" still only works on the shop laptop.
- Put a small thumbnail in `status/latest` (no Cloud Storage), so the hosted app can show the shelf image.
- Check on a phone.

## 4. Model retraining (can run in parallel)
- Add background and webcam photos with no parts (`python -m scripts.capture_dataset negatives --count 150`) so the model learns "not a part". Then re-validate; only then consider loosening the box guards.
- Include filters end-on and near the frame edge.

## 5. M12: evaluation (needed for the report)
- 20 shelf arrangements under 3 lighting conditions; average of 50 scans for inference time; 10 sync-latency trials; free-tier usage; functional test cases for FR1 to FR9; usability test with 3 people.

## 6. M13: report
- Implementation and Evaluation chapters. Replace ESP32 with webcam and Realtime Database with Firestore everywhere. Include the licence note (Ultralytics is AGPL). Any AI-use disclosure follows the university policy; that decision is the user's.

## Polish backlog (pick by value)
- Dashboard: summary tiles, search and filter for many products, Recent Scans table redesign, scan-age indicator.
- Phone layout of tables; page title per route; history page for resolved alerts.
- Confirmation or undo for Accept and Dispatch.
- Optional Request Restock button; relabel Receive Stock to Receive Delivery. A delivery entered both by Receive Stock and by Mark Received would be counted twice; decide the wording or guard.
- Notifications Stage B (the user postponed it until after the viva).
- Password reset; idle timeout.
- Backend: rate limiting, audit trail, split `ScanRepository` (scans, products, alerts, orders), remove dead `Detector.warmup`.
- Tooling: CI running the test and lint commands; move `.handoff/live-tests` into the repo if the user wants; the single 864 KB JS chunk (code-split).
- Pending decision: migrate to TypeScript plus Material UI behind the shared wrappers, or keep the token CSS. Do not start without the user's approval; it touches every screen.
- Known, not actionable: `npm audit` reports `@grpc/grpc-js` (not in the browser bundle; do not downgrade firebase); Python 3.11 end-of-life warnings from Google libraries.
