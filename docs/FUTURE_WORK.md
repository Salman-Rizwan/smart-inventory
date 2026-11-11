# Future Work and Known Limitations

Kept for the final report (Future Work and Limitations sections). Each item says why it matters to the shop, why it is not in the submitted version, and how it would be built. Anything cut at a checkpoint in `docs/ROADMAP.md` is added here.

## Known limitations of the submitted version

| Limitation | Effect | Mitigation in this version |
|---|---|---|
| The camera sees one shelf only | The POS counts everything the shop holds, so stock kept in a back room shows as a mismatch | The system assumes all stock of a tracked part is on the camera's shelf; stated in the report |
| Mock POS | Sales and deliveries are entered with Record Sale and Receive Stock, not taken from a real till | The stock change log (F1) records each entry with who and when, as a real POS would |
| The model has no "not a part" class | People or rooms can score as parts | Box size guards (`MAX_BOX_AREA_RATIO`, `MAX_BOX_SIDE_RATIO`) until retraining |
| Filters seen end-on or cut off at the frame edge | Score about 0.35 and are missed | Shelf arrangement guidance; retraining (below) |
| A dark room reads as an empty shelf | False mismatches and, with automatic scanning, false orders | Frames that are too dark are skipped (planned in M6) |
| Single shop, single camera | No chain stores or several shelves | Product ids equal class names, so new parts need no code change (NFR7) |
| Demo history is synthetic | Insights over the demo period are not real trading data | Seeded records are marked `seeded: true` and the page says "Includes demo data" |
| Scan Now works only on the shop laptop | The hosted app can view but not scan | By design: the laptop does all processing (Spark plan, no Cloud Functions) |
| The laptop must stay awake and online | A sleeping laptop scans nothing (gaps of 2 and 4.5 hours seen); short network drops slow a scan by up to 10 s per call | The dashboard says "No Recent Scan"; calls are bounded; the README says to turn off sleep |
| Brightness cannot detect a partly covered lens | A hand half over the lens counts as an empty shelf | Alerts wait 3 minutes and orders 5, so short obstructions raise nothing |
| The camera must see the shelf | Twice the camera counted no parts in full light (on Nov 11 the shelf image showed it looking at the person at the laptop, not the shelf, each time the laptop was being used), which raises alerts after 3 minutes | Camera placement guidance; a future "shelf not recognised" check |
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
| Cancel and decline | A Pending order cannot be cancelled by the shop or declined by the dealer (out of stock) | New `Cancelled` and `Declined` states in the workflow, rules and planner | Shopkeeper cancels Pending; dealer declines with a reason; neither counts as an open order |
| Manual order request | The shopkeeper may know about a coming demand spike | Orders are created only by the backend, which the hosted app cannot reach | A Request Restock entry that the backend turns into an order on its next scan |
| Expected delivery date | The shop wants to know when stock arrives | Extra field and rules | Dealer sets a date on Accept; Insights shows on-time delivery rate |
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
| Shelf-in-view check | A moved camera or a cleared shelf looks like stock gone missing | Needs a reference image or marker | Compare each frame with a reference view of the empty shelf, or add a printed marker the model must see |
| Retrain with background images | Lets the box guards be loosened or removed | Needs a new training run and re-validation | `python -m scripts.capture_dataset negatives --count 150`, then retrain and re-validate |
| End-on and edge-of-frame filters | Fewer missed parts | Same retraining | Add those views to the dataset |
| Several cameras or shelves | Covers more of the shop | One camera is enough for the evaluation | A camera id per scan and per product |
| Shelf image on the hosted app | The hosted app shows counts but no photo | No Cloud Storage on the Spark plan | A small thumbnail in `status/latest` (planned in M11) |

### Analytics
| Item | Why it matters | Why deferred | How |
|---|---|---|---|
| Forecasting with seasonality | Medians miss weekly and seasonal patterns | Needs months of real data | Day-of-week profiles, then a simple forecasting model |
| Economic order quantity | A better reorder quantity than days of cover | Needs ordering and holding costs | EOQ from the dealer's order cost and the holding cost |

### Engineering
| Item | Why it matters | Why deferred | How |
|---|---|---|---|
| Continuous integration | Runs tests and linters on every push | Single developer | A GitHub Actions workflow with the commands in `docs/TESTING.md` |
| Code-split the main bundle | Faster first load | The Insights page is already lazy-loaded | Split the remaining routes |
| Split `ScanRepository` | One adapter per collection | Works as is | Separate scans, products, alerts and orders adapters |
| Live tests in the repository | Others can rerun the browser checks | They hold local paths | Move `.handoff/live-tests` into the repo with settings from `.env` |
| Language support | Shop staff may prefer another language | Not in scope | Move the copy into message files |
