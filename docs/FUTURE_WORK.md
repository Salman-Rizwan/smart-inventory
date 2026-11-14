# Future Work and Known Limitations

Kept for the final report (Future Work and Limitations sections). Each item says why it matters to the shop, why it is not in the submitted version, and how it would be built. Anything cut at a checkpoint in `docs/ROADMAP.md` is added here.

## Known limitations of the submitted version

| Limitation | Effect | Mitigation in this version |
|---|---|---|
| The camera sees one shelf only | The POS counts everything the shop holds, so stock kept in a back room shows as a mismatch | The system assumes all stock of a tracked part is on the camera's shelf; stated in the report |
| Mock POS | Sales and deliveries are entered with Record Sale and Receive Stock, not taken from a real till | The stock change log (F1) records each entry with who and when, as a real POS would |
| The model has no "not a part" class | People or rooms can score as parts. On Nov 11 a face close to the laptop camera scored 0.54 as a spark plug with a box of about 19% of the frame, under both size guards, so the shelf read 5 instead of 4 | Box size guards (`MAX_BOX_AREA_RATIO`, `MAX_BOX_SIDE_RATIO`) until retraining; the alert delay absorbs a person passing by, not one who stays in view |
| Filters seen end-on or cut off at the frame edge | Score about 0.35 and are missed | Shelf arrangement guidance; retraining (below) |
| A dark room reads as an empty shelf | False mismatches and, with automatic scanning, false orders | Frames below `MIN_FRAME_BRIGHTNESS` are skipped and the dashboard says "Too Dark" (M6, checked live) |
| Single shop, single camera | No chain stores or several shelves | Product ids equal class names, so new parts need no code change (NFR7) |
| Demo history is synthetic | Insights over the demo period are not real trading data | Seeded records are marked `seeded: true` (ids `seedh-*`), the page and the dashboard say "Includes demo data", and the chain ends at the real POS counts |
| Days of cover follows the camera | While someone works at the laptop the camera reads 0 and the tile says 0 days, like the dashboard | The user's decision (Nov 11): it is the count that drives ordering; the tile shows the scan's age on the Insights page |
| Scan Now works only on the shop laptop | The hosted app can view but not scan | By design: the laptop does all processing (Spark plan, no Cloud Functions) |
| The laptop must stay awake and online | A sleeping laptop scans nothing (gaps of 2 and 4.5 hours seen); short network drops slow a scan by up to 10 s per call | The dashboard says "No Recent Scan"; calls are bounded; the README says to turn off sleep |
| Brightness cannot detect a partly covered lens | A hand half over the lens counts as an empty shelf | Alerts wait 3 minutes and orders 5, so short obstructions raise nothing |
| The camera must see the shelf | Twice the camera counted no parts in full light (on Nov 11 the shelf image showed it looking at the person at the laptop, not the shelf, each time the laptop was being used), which raises alerts after 3 minutes | Camera placement guidance; a future "shelf not recognised" check |
| Two old Pending orders block automatic ordering | The spark plug order from Oct 28 and the petrol filter order from Nov 5 are kept by the user's decision, so neither real part can be ordered automatically while they stay open (an open order stops a new one) | Ordering is demonstrated on a simulated `zz_` part; cancel them (shopkeeper, Orders) or run `demo_reset --apply` before demonstrating real ordering |
| The lead-time median includes three test orders | Three real orders from Oct 28 were received within minutes during live tests and sit in the median with the 15 seeded deliveries | Medians absorb them; clear test orders before the demo for a cleaner figure |
| The hosted page may not reach the laptop | Since Chrome 142 an https page needs the user's permission ("local network access") to call `http://localhost`, and is blocked if denied; Scan Now from the hosted app is not yet proven (M11-2) | The hosted app says Scan Now works only from the shop laptop and what to allow, and the shelf image panel says the image lives on the laptop; the result of the real check is in `docs/REPORT_NOTES.md` |
| Free-tier usage cannot be read by the backend's service account | Cloud Monitoring refused it (HTTP 403), so the one-day usage figures are read by hand from the Firebase console | Console readings at the start and end, plus the per-scan estimate from the code |
| Evaluation evidence is not all collected | Detection accuracy over 20 arrangements, Scan Now timing over 50 runs, sync latency, one day of free-tier usage, the functional cases and the usability test are still to do (M12) | Listed in `docs/TASKS.md`; results go into `docs/REPORT_NOTES.md` |
| The live regression changes real POS counts | Its Mark Received, Record Sale and Receive Stock steps move the real spark plug and petrol filter counts | Snapshot first, restore and verify afterwards (`docs/TESTING.md`) |
| In-app notifications only | Nobody is told while the app is closed | Email or push needs Cloud Functions (paid plan) |
| Ultralytics is AGPL-3.0 | Licence obligations for a commercial product | Noted in the report; a commercial licence or another detector would be needed |

## Future work

### Stock and POS
| Item | Why it matters | Why deferred | How |
|---|---|---|---|
| Real POS integration | Removes double entry, the biggest gap between the project and a shop system | Needs a real till or its export format | Read sales from a barcode scanner, a POS export file or a POS API into the same stock change log |
| Back-room and multi-location stock | Removes false mismatches for stock kept off the shelf | Changes the reconciliation rule in two places and the data model | A per-part `storedElsewhere` count; expected on shelf = POS minus stored elsewhere |
| Partial and damaged deliveries | Mark Received today adds the full ordered quantity | Needs a received quantity on the order, a rules change and UI | Received quantity defaulting to the ordered quantity; the difference logged; dealer fill rate in Insights |
| Price history and promotions | Revenue analytics with changing prices | Each sale already records its price at the time | A price list with dates; promotion periods marked in Insights |
| Approval for large adjustments | An adjustment is trusted as entered | Two roles only | Adjustments above a threshold wait for the owner's approval (with owner and staff roles) |
| Search and filter for many products | Two parts today | Not needed at demo scale | Search box and status filter on Stock Check |
| CSV export | The accountant works in a spreadsheet | Not needed for the evaluation | Export the stock log, alerts and orders for a chosen period from the browser |

### Orders and the dealer
| Item | Why it matters | Why deferred | How |
|---|---|---|---|
| Dealer decline, and returns | The dealer cannot decline an order (out of stock), and a dispatched order cannot be cancelled or returned. Cancel Order (shopkeeper, before dispatch) was built on Nov 11 | Cancel covered the case seen live; time | A `Declined` state like `Cancelled`; a return flow that removes the quantity with a logged entry |
| Part names on alerts | Orders carry `productName`; alerts and the dashboard counts still show the class name made readable, so a part renamed in its product document reads differently there | No part can be renamed from the app yet | Store the name on alerts as on orders, or read it from the products the shopkeeper already loads |
| Manual order request | The shopkeeper may know about a coming demand spike | Orders are created only by the backend, which the hosted app cannot reach | A Request Restock entry that the backend turns into an order on its next scan |
| Expected delivery date | The shop wants to know when stock arrives | Extra field and rules | Dealer sets a date on Accept; Insights shows on-time delivery rate |
| Undo on Record Sale (SL-4) | A mis-tap on Record Sale lowers the POS by one, and the only fix is an Adjust Stock entry | A proposed cut (Group 7), not confirmed by the user; the stock change log is never edited, so a correction would be a new entry | A "Sale recorded. Undo" message for 10 s that writes a Correction entry with a deterministic id, and a rules change the user publishes |
| Confirmation or undo for Accept and Dispatch | A mis-tap moves an order on | Low risk at demo scale | A confirmation step, or a short undo window |
| Dealer dashboard | The dealer's own performance and order trends | Shopkeeper analytics come first | Lead time and on-time rate per dealer |

### Accounts and security
| Item | Why it matters | Why deferred | How |
|---|---|---|---|
| Password reset | A shopkeeper who forgets the password is locked out | Not in scope; about 1 hour | Firebase `sendPasswordResetEmail` on the Sign In page |
| Idle timeout | A shared shop laptop stays signed in | Not in scope | Sign out after a period without input |
| Owner and staff roles | Staff should record sales but not change prices or write off stock | Two roles are enough for the evaluation | A third role in `roles.js` and the rules |
| Audit trail for settings | Who changed a price or reorder level | Stock changes are logged; settings keep only the last change | A settings change log like the stock log |
| Rate limiting on the backend | Protects the laptop from a runaway client | Single shop, signed-in users only | A per-user request limit in FastAPI middleware |

### Detection
| Item | Why it matters | Why deferred | How |
|---|---|---|---|
| Shelf-in-view check | A moved camera or a cleared shelf looks like stock gone missing (seen five times on Nov 11, whenever the laptop was in use) | Needs a reference image or marker | Compare each frame with a reference view of the empty shelf, or add a printed marker the model must see |
| Retrain with background images | Lets the box guards be loosened or removed | Needs a new training run and re-validation | `python -m scripts.capture_dataset negatives --count 150`, then retrain and re-validate |
| End-on and edge-of-frame filters | Fewer missed parts | Same retraining | Add those views to the dataset |
| Several cameras or shelves | Covers more of the shop | One camera is enough for the evaluation | A camera id per scan and per product |
| Shelf image on the hosted app | The hosted app shows counts but no photo | No Cloud Storage on the Spark plan | A small thumbnail in `status/latest` (planned in M11) |

### Analytics
| Item | Why it matters | Why deferred | How |
|---|---|---|---|
| Stockouts and lost sales (AN-6, IN-5) | Hours at zero and the sales missed while the shelf was empty | Deferred at the Nov 11 plan: needs the scan series (thousands of heartbeat records) and a gap rule; seeded scans were not written for the same reason | Hours at zero from the scan records, gaps longer than the heartbeat counted as unknown, lost sales = hours × average hourly sales |
| Stock value, stock flow, response and dealer sections (AN-7, IN-5) | Value on the shelf and in the POS at cost; sold against received; time to acknowledge and resolve alerts; time per order stage | Deferred at the Nov 11 plan (Group 7); the loader already reads the orders, and alerts would be one more query | Sections on the Insights page from the same pure functions |
| Period comparison for every figure | Only the sales tile and section compare with the previous period | Deferred (AN-7) | Previous-period figures for shrinkage and cover, "New" when the earlier period is zero |
| Apply a recommendation (IN-6) | One click to set the suggested reorder level | Deferred (Group 7); the page says to use Part Settings | A confirm dialog that writes `reorderLevel` through the existing Part Settings path |
| Search and filter on the Products list | With many parts the Products tab needs a search box and sorting | Two parts need none | A text filter over the part name and a sort by margin or reorder level |
| Stock Log inside Products | The Stock Log (not built yet) would be a second view of Products so the header keeps five tabs | The Stock Log is the first item to drop if time runs short | A "Stock History" view on `/products`, filtered by part from the Stock Check rows |
| Two quick filter clicks | On the Insights page, two filter clicks within a few milliseconds can lose the first (the router applies the first change a moment later); no person clicks that fast | Found by a browser script; the script now waits for the new state | Read the pending address from a ref that the click updates at once |
| Narrow-phone tab strip | Below 375 px the five tabs scroll; the current tab is kept in view, but a fifth of the labels can be off screen | Five labels with counts do not fit 320 px at a readable size | Shorter labels, or icons with labels, on phones |
| Weekly bars thicker than the chart guideline | The 90-day weekly bars are wider than the 24 px the chart guideline asks for | The charts library draws a band's width | A custom bar element or a narrower band |
| Chart stacking gaps | The stacked bars have no 2 px gap between a day's two parts (the dataviz guideline) | The charts library draws stacks edge to edge | A custom bar element, or a thin surface-coloured stroke |
| Lead time and the Oct 28 test orders | Three real orders received within minutes during live tests are in the median | Medians absorb them with four seeded deliveries | Exclude orders received under an hour after creation, or clear test orders before the demo |
| Forecasting with seasonality | Medians miss weekly and seasonal patterns | Needs months of real data | Day-of-week profiles, then a simple forecasting model |
| Economic order quantity | A better reorder quantity than days of cover | Needs ordering and holding costs | EOQ from the dealer's order cost and the holding cost |

### Engineering
| Item | Why it matters | Why deferred | How |
|---|---|---|---|
| Keep focus on every busy button | A button is disabled while it saves, and Chrome drops keyboard focus from a disabled button; fixed for Pause and Resume Scanning only (Nov 11) | The other buttons (Scan Now, Record Sale, Acknowledge, order steps) were not rechecked | Use `aria-disabled` while busy in the shared `Button`, or return focus as `CameraStatus` does |
| Tell the dashboard the alert and reorder delays | The summary can only say "a mismatch that lasts"; it cannot say "in 2 minutes" | The delays are backend settings the browser does not read | Publish them in `status/latest` at startup with the scanning setting, and show a countdown from `mismatchSince` |
| Content-Security-Policy on Hosting | Limits what a script on the page could load or call | Material UI injects inline styles, so a wrong policy would blank the app; needs testing with a report-only policy first | Add a `Content-Security-Policy-Report-Only` header in `firebase.json`, fix what it reports, then enforce it |
| Load the shelf image on demand on the hosted app | Chrome's local network prompt would otherwise appear when the dashboard opens, before the shopkeeper asks for anything | Decide after the real M11-2 check | A "Load Shelf Image" button on the hosted address, or the thumbnail in `status/latest` (Group 7) |
| Continuous integration | Runs tests and linters on every push | Single developer | A GitHub Actions workflow with the commands in `docs/TESTING.md` |
| Code-split the main bundle | Faster first load | The Insights page is already lazy-loaded | Split the remaining routes |
| Split `ScanRepository` | One adapter per collection | Works as is | Separate scans, products, alerts and orders adapters |
| Live tests in the repository | Others can rerun the browser checks | They hold local paths | Move `.handoff/live-tests` into the repo with settings from `.env` |
| Language support | Shop staff may prefer another language | Not in scope | Move the copy into message files |
