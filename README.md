# Smart Inventory

Camera-based inventory counting for an auto-parts shop. A webcam photographs the shelf, a YOLOv8 model counts the parts, the counts are compared with point-of-sale (POS) records, and any mismatch raises alerts and purchase orders for the dealer.

## Architecture

The shop laptop does all the work. Firebase (free Spark plan) stores and serves the results.

```
Shop laptop                      Firebase (free plan)        Browsers
USB webcam (photo every 60 s) -> Firestore  ------------->   Shopkeeper view
FastAPI backend                  Authentication  \            Dealer view
  - loads best.pt (YOLOv8)       Hosting (React)  `---------> Purchase orders
  - counts parts per scan
  - compares with POS
  - creates alerts, orders
```

"Scan now" goes from the shopkeeper view straight to the local backend (local only, not via Firebase).

| Layer | Choice |
|---|---|
| Camera | USB or laptop webcam, read with OpenCV |
| Detection | Ultralytics 8.4.163 and `best.pt` (same version that trained the model) |
| Backend | Python 3.11 and FastAPI |
| Database | Cloud Firestore (`firebase-admin` in Python) |
| Login | Firebase Authentication (email and password) |
| Frontend | React with Vite, Firebase JS SDK |
| Hosting | Firebase Hosting |

Not used: Cloud Functions and Cloud Storage (both need a paid plan).

## Repository layout

```
backend/
  app/
    main.py          app factory: middleware, routers, startup wiring
    api/             HTTP layer: routes/ (health, scan), deps.py (dependency injection)
    services/        use cases: scan_service.py, snapshot_store.py
    schemas/         Pydantic request and response models
    core/            config.py (validated settings), exceptions.py, security.py (Firebase token check), logging.py
    camera.py  detector.py  firebase_db.py   adapters for the webcam, YOLO model and Firestore
    reconcile.py     POS comparison rule (Matched / Mismatch)
    alerts.py        alert lifecycle planner (pure)
    orders.py        automatic reorder planner (pure)
    products.py      product record read from Firestore
  models/            best.pt (trained YOLOv8 weights)
  scripts/           test_webcam.py (M1), test_firebase.py (M2), seed_users.py (role profiles), seed_products.py (POS records), seed_orders.py (sample orders), capture_dataset.py
  tests/             pytest suite (fakes only, no webcam or Firebase needed)
frontend/
  src/
    features/auth/       login, auth context (user + role profile), route guards, roles, validation
    features/alerts/     alerts panel and shared live listener (TypeScript)
    features/notifications/  the bell: derived notifications, per-user read state, dropdown wiring (TypeScript)
    features/inventory/  Stock Check panel (camera vs POS), POS buttons, stock rules (TypeScript)
    features/orders/     orders page for dealer and shopkeeper: summary tiles, filter, action queue, Mark Received (TypeScript)
    features/dashboard/  live dashboard: data layer (repository, scan API, hooks), components, page
    layouts/             app shell (header, navigation, skip link)
    styles/              design tokens, base, shared component and layout CSS
    shared/              api/httpClient.js (token + error handling), reusable components
    firebase.js          Firebase web config
firestore.rules          Firestore security rules
```

Request flow: route (validates input, checks the Firebase ID token) -> service (business logic) -> adapters (camera, detector, Firestore). Errors are raised as typed `AppError`s and returned in one shape: `{"error": {"code", "message", "details?"}}`.

## Setup

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt       # runtime; pins ultralytics==8.4.163
pip install -r requirements-dev.txt   # adds the test and lint tools (pytest, ruff)
```

## M1: webcam smoke test

Captures one webcam frame, counts the parts, prints counts and inference time, and saves an annotated image.

```bash
cd backend
source .venv/bin/activate
python scripts/test_webcam.py
# Counts: {'spark_plug': 4, 'petrol_filter': 1} | inference 412 ms
```

- Output image: `backend/scripts/test_output.jpg` (gitignored).
- Run it twice; the first run is slower while the model warms up.
- macOS asks for camera permission on first run. If it fails, enable Terminal and VS Code under System Settings, Privacy & Security, Camera, then restart the app.
- Classes: `spark_plug`, `petrol_filter`.
- Target: inference under 1,000 ms (NFR2). Measured about 410 to 550 ms on the dev laptop.

## Firestore data model (proposed, not yet set up)

Six collections. The backend writes the counts; the browser writes only POS transactions, acknowledgements and order status.

| Collection / document | Key fields | Written by | Built in |
|---|---|---|---|
| `status/latest` (one document) | `counts` {spark_plug, petrol_filter}, `scannedAt`, `imageThumb` (from M11) | Backend | M3 |
| `scans/{auto id}` | `counts`, `scannedAt`, `inferenceMs` | Backend | M3 |
| `users/{uid}` | `name`, `role` (shopkeeper or dealer) | Added by hand in the console | M4 |
| `products/{spark_plug}` | `name`, `posCount`, `reorderLevel`, `reorderQty`, `status` (Matched or Mismatch) | Seeded once; dashboard buttons; backend | M7 |
| `alerts/{auto id}` | `product`, `visualCount`, `posCount`, `state` (Open, Acknowledged, Resolved), `createdAt` | Backend; dashboard (acknowledge) | M8 |
| `purchase_orders/{auto id}` | `product`, `qty`, `state` (Pending, Accepted, Dispatched, Received), `createdAt` | Backend; dealer; shopkeeper | M9 |

Product document ids are the model's own class names. Adding a new part later means retraining the model and adding one product document, with no code change (NFR7).

## Requirements and milestones

| Req | Requirement | Milestone | Evidence |
|---|---|---|---|
| FR1 | Capture images periodically (now via webcam) | M1, M6 | Dashboard updating on its own |
| FR2 | Detect and classify parts | Done; M1 | Annotated webcam image |
| FR3 | Count units per part | Done; M1, M5 | Count cards on the dashboard |
| FR4 | Store counts in the cloud | M2, M3 | Documents in the Firestore console |
| FR5 | Compare with POS records | M7 | Mismatch shown after Record sale |
| FR6 | Raise discrepancy alerts | M8 | One alert per mismatch |
| FR7 | Automatic replenishment request | M9 | Order on the dealer screen |
| FR8 | Web dashboard | M4, M5, M9 | Shopkeeper and dealer pages |
| FR9 | User authentication | M4, M10 | Login and role-based pages |
| NFR1 | Accuracy of at least 85% mAP | Done (0.995 mAP50); M12 | Colab results plus live accuracy test |
| NFR2 | Inference under 1 second | M1, M12 | Measured average time |
| NFR3 | Free or low-cost services | M2, M6, M11 | Spark plan; usage under limits |
| NFR4 | Usable by a non-technical shopkeeper | M5, M12 | Usability test |
| NFR5 | Any webcam works (camera configurable) | M3 | `CAMERA_INDEX` setting |
| NFR6 | Access restricted to logged-in users | M2, M10 | Security rules; key never committed |
| NFR7 | New part categories can be added | Data model | Product ids equal class names |

## POS reconciliation (M7)

Each part has a mock POS record in `products/{class name}` (`posCount`, `reorderLevel`, `reorderQty`). After every scan the backend compares the camera count with `posCount` and stores **Matched** or **Mismatch** on the product. The shopkeeper dashboard's Stock Check panel shows the same comparison live, with **Record Sale** (POS minus 1) and **Receive Stock** (POS plus a quantity) buttons that simulate POS transactions. A negative Difference means the records claim stock that is not on the shelf.

- Seed the records from the model's class names: `python -m scripts.seed_products` (from `backend/`; existing records are left alone, `--reset` restores them).
- Only a shopkeeper can change `posCount`, as a whole number from 0 to 100000, and nothing else (enforced in `firestore.rules`).
- **False-detection guard:** the model has no "not a part" class, so people and rooms can score as parts. Detections covering more than `MAX_BOX_AREA_RATIO` (default 25%) of the frame, or whose longest side exceeds `MAX_BOX_SIDE_RATIO` (default 60%), are ignored and logged. This is a mitigation until the model is retrained with background photos.

## Alerts (M8)

After every scan the backend decides what to do with alerts for each part (`app/alerts.py`, a pure function with unit tests):

- First mismatch: one **Open** alert is created.
- Still mismatched on later scans: no new alert (5 scans give 1 alert); its camera and POS counts are refreshed.
- Counts match again: the alert becomes **Resolved** automatically. A mismatch that returns opens a new alert, and resolved alerts stay in Firestore as history.
- An empty shelf raises alerts too, since stock the POS expects is missing.

The shopkeeper dashboard shows an **Active Alerts** panel with an **Acknowledge** button (Open to Acknowledged; the alert stays until the counts match). The header bell opens a **Notifications** dropdown (see Notifications below); selecting an alert there jumps to this panel. Alerts are in-app only, and the dealer does not see them. The browser can only acknowledge an alert (enforced in `firestore.rules`); creating and resolving alerts is backend-only.

## Purchase orders (M9)

**Automatic ordering.** After every scan the backend (`app/orders.py`, a pure function with unit tests) checks each part against its `reorderLevel`. A part is *low* when the camera count is at or below that level. A **Pending** order for `reorderQty` is raised when the part has been low for `REORDER_CONFIRM_SCANS` scans in a row (default 2, so one bad frame, such as a hand over the camera, cannot order stock) **and** has no open order. A part therefore never has two orders. While an order is open the count is held at zero, so after it is received the part must be low for fresh scans before the next order, which leaves time to restock the shelf. Orders are marked `source: auto`.

**Dealer** (Purchase Orders page): summary tiles (Pending, Accepted, Dispatched, Received), an Open, Completed and All filter kept in the URL (`?status=completed`), and an action queue with Pending first and the oldest first. **Accept Order** (Pending to Accepted), then **Mark Dispatched** ("the goods have left my warehouse"). The header bell opens a **Notifications** dropdown listing the orders waiting for acceptance (see Notifications below).

**Shopkeeper** (Orders tab, with a count badge for orders waiting to be confirmed): the same page, with Dispatched orders first. **Mark Received** confirms the goods arrived and, in the same transaction, adds the order quantity to the part's POS record. Receiving twice is refused.

- `firestore.rules` lets each role make only its own step, touching nothing but the state and that step's server timestamp. Orders are created by the backend, never from the browser.
- `python -m scripts.seed_orders` (from `backend/`) puts one sample order per state into the real `purchase_orders` collection, marked `seeded`; `--clear` removes them. **Run `--clear` before demonstrating automatic ordering**: an open order for a part, seeded or not, stops a new one being raised for it.

## Notifications

One bell in the header for every role, with a dropdown of what needs that role's attention:

- **Shopkeeper:** open alerts, and dispatched orders waiting to be confirmed. **Dealer:** pending orders waiting for acceptance.
- Notifications are **derived from live data, never stored**: an item exists exactly while its alert or order still needs attention, so handling or resolving it removes it by itself. An acknowledged alert is already handled, so it leaves the list.
- **Unread** is personal and **acknowledged** is shared, and they are separate. The bell counts what the signed-in user has not read; the Alerts panel, the Orders tab badge and the order tiles are still the "work waiting" counters, and reading never hides work.
- Click a notification to read it and go to the Alerts panel or the orders page. **Mark All as Read** marks everything. Unread items are bold with a dot and announced as "Unread" to screen readers; read items are greyed and stay listed until their item is resolved. A refresh of an open alert's numbers does not notify again; a new alert or order does.
- Read state is one document per user, `notification_reads/{uid}`, holding a capped list of keys (`alert:ID`, `order:ID:Dispatched`). It survives a refresh and follows the user between devices. The rules let a user read and change only their own document. The bell and the browser tab title (like "(2) Smart Inventory") show the **unread** count, and wait for the read state to load so they never flash a wrong number. If the read state cannot be loaded, everything shows as unread and the dropdown says so.

## Roles

Each account has a `users/{uid}` document with `name` and `role` (`shopkeeper` or `dealer`). The shopkeeper lands on the shelf dashboard; the dealer lands on Purchase Orders. A route guard sends anyone who opens the other role's page back to their own, and an account with no role sees an "Account Not Ready" page. Create the profile documents with `python -m scripts.seed_users` (from `backend/`).

## Design system

Carbon-style enterprise UI: flat, square, hairline borders, a 4 px grid, IBM Plex Sans (self-hosted), and one deep-teal accent (`#0e6b6f`). Tokens live in `frontend/src/styles/tokens.css`. Text and UI colours meet WCAG AA, status is never colour-only (icon plus text), focus is always visible, and motion respects `prefers-reduced-motion`. Checked with axe (0 violations) and the Web Interface Guidelines.

## Run and test

```bash
# backend (from backend/)
uvicorn app.main:app --reload      # API docs at http://localhost:8000/docs
python -m pytest                   # backend tests (fakes only)
ruff check . && ruff format --check .

# frontend (from frontend/)
npm install
npm run dev                        # http://localhost:5173
npm run typecheck && npm test      # TypeScript check, then the unit and component tests
```

`POST /scan` and `GET /snapshot/latest.jpg` require a Firebase ID token (`Authorization: Bearer <token>`); the frontend adds it automatically.

## Status

- [x] M1: model counts parts from the webcam
- [x] M2: Firebase project, Firestore, Auth test users, test write from Python
- [x] M3: FastAPI `/health`, `/scan`, `/snapshot/latest.jpg` writing to Firestore
- [x] M4: React login, protected dashboard, logout
- [x] M5: live dashboard (count cards, annotated image, Scan Now, last 10 scans)
- [ ] M7 POS reconciliation and M8 alerts: built and tested; the live POS-button and Acknowledge checks wait for the updated Firestore rules to be published
- [ ] M9 automatic orders, dealer page and shopkeeper Orders tab: built and tested; the live Mark Received check waits for the updated Firestore rules to be published
- [ ] M6, M10 to M13 (see the build plan)
- [ ] `reconcile.py` and `firestore.rules` are still empty
