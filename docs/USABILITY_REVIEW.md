# Usability Expert Review (Group 4, item 35; NFR4)

**What this is:** an expert review of the shopkeeper's and dealer's screens, **not a user test**. No participants took part, so it gives no task success rates, times or System Usability Scale (SUS) score. It predicts the problems a first-time user is likely to meet. The planned user test (`docs/USABILITY_TEST.md`) was not run before submission, by the author's decision on Nov 16, 2026; it is listed as future work.

**How it was done:** on Nov 16, 2026, with an AI assistant (Claude), from the running system (real Firebase, the development build on the shop laptop) and screenshots of every screen at desktop and phone width (`.handoff/report-screenshots/`, 2x resolution). The review only looked: two dialogs were opened and cancelled, and nothing was saved. The report must state who carried out the review and how, following the university's policy on tool use; that wording is the author's decision.

**Methods:**
1. **Heuristic evaluation** against Nielsen's 10 usability heuristics. Each problem gets a severity on Nielsen's 0 to 4 scale: 0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophic.
2. **Cognitive walkthrough** of the 10 shopkeeper tasks in `docs/USABILITY_TEST.md`. For each step: would a first-time user try the right action, see the control, understand that it does what they want, and see that it worked?

Existing evidence used alongside: automated accessibility checks (axe) report 0 violations on every page and state checked, at widths down to 320 px; keyboard walks; and the problems already found by live testing (`docs/REPORT_NOTES.md`).

## Summary
- **Problems found:** 12. None catastrophic (4) or major (3); 7 minor (2) and 5 cosmetic (1).
- **Strongest areas:**
  - The status of the system is always visible and honest. The camera status line says how old the last count is and what to do.
  - Error messages say what to do next.
  - Risky actions are guarded: an adjustment needs a reason, Receive Stock warns about a dispatched order, and a dispatched order cannot be cancelled.
- **Weakest areas:**
  - Technical words in messages a shopkeeper will see ("backend", "Inference (ms)", "POS").
  - Two terms for the same setting ("Reorder At" and "reorder level").
  - Old counts presented as current when the camera has stopped.
  - Record Sale cannot be undone.
- **Walkthrough:** 7 of the 10 tasks are predicted to be straightforward. 3 have a likely stumbling point:
  - task 4: the alert appears only after 3 minutes;
  - task 8: the Stock Log is a second view inside Products, not a tab;
  - task 9: Pause Scanning looks like plain text.

## 1. Heuristic evaluation

| # | Heuristic | What works | Problems (severity) |
|---|---|---|---|
| H1 | Visibility of system status | The camera status line names the state and the next step ("No Recent Scan: no scan for 13 hours 44 minutes. Check that the shop laptop is awake…", with the time of the last count). Stock Check shows Matched or Mismatch with an icon and text, and an "All Matched" summary. Scan Now reports its result beside the button. Tabs carry "work waiting" badges. Pages say "Includes demo data" | **P1 (2):** when no scan has arrived for hours, Active Alerts still says "Everything on the shelf matches the POS records" and Stock Check shows "All Matched", although both rest on a count 13 hours old. The status line above warns, but the two statements below contradict it |
| H2 | Match between system and the real world | Shop words for the actions (Record Sale, Receive Stock, Mark Received, Accept Order, Mark Dispatched); money in LKR; the Difference column explains its sign in words | **P2 (2):** technical words in messages a shopkeeper sees: "Make sure the backend is running" (shelf image error, camera status line) and "Inference (ms)" (Recent Scans). **P3 (1):** "POS Record" is used throughout, and a small shop may not call its records that |
| H3 | User control and freedom | Dialogs have Cancel. Cancel Order is available until dispatch. Pause Scanning resumes by itself. Every filter is kept in the address, so Back works | **P4 (2):** Record Sale writes at once with no confirmation or undo. A click on the wrong part's row can only be corrected with Adjust (Miscount), which leaves a false sale in the sales figures. Undo was planned and deferred (FUTURE_WORK) |
| H4 | Consistency and standards | One look throughout: Title Case labels, the same status badges, filters and tables on every page, and the same tile layout on the dashboard and Insights | **P5 (2):** one setting, two names: "Reorder At" in Products and its dialog, but "Reorder Level" and "Current Level" in Insights, whose advice says "Raise the reorder level to 2". **P6 (1):** low-emphasis actions look like plain text: Adjust (Stock Check), Pause Scanning (15 Min) and Cancel Order (Orders), while the actions beside them are outlined buttons |
| H5 | Error prevention | Adjust Stock needs a reason, and its dialog tells the user to check the shelf first because the camera can miss parts. Receive Stock warns when a dispatched order exists for the part, so a delivery is not counted twice. A dispatched order cannot be cancelled. Selling below cost is warned about. Forms are checked before saving | **P7 (2):** the quantity box next to Receive Stock has only a placeholder ("Qty…"), no visible label; a first-time user may press Receive Stock without a quantity, or not see what the box is for. It does have a label for screen readers |
| H6 | Recognition rather than recall | A History link on each Stock Check row. Notifications open their own alert, highlighted. What To Do links to the right part's settings ("Edit in Part Settings"). Filter buttons show their counts | **P8 (2):** the Stock Log is a second view inside Products, not a tab, so a user looking for "who sold this" may look under Insights or Orders first. The History links help only from Stock Check |
| H7 | Flexibility and efficiency of use | One-click Acknowledge from the dashboard; links into a filtered view; keyboard use throughout; filters remembered in the address | **P9 (1):** no search, sorting or bulk actions in the tables. Fine for 2 parts, slow for a shop with hundreds |
| H8 | Aesthetic and minimalist design | The dashboard is ordered by the shopkeeper's questions (alerts, business, stock, camera) and was cut from 2,864 px to 1,517 px. Colour is kept for status, and there is no decoration | **P10 (1):** the Insights page is long (about 2,350 px at desktop width) with five sections; a phone user scrolls far to reach the recommendations |
| H9 | Help users recognise, diagnose and recover from errors | Messages say what happened and what to do: "Incorrect email or password. Check both and try again."; Scan Now on the hosted page says it works only from the shop laptop and what to allow; two people receiving one order are told "has already been received" | **P11 (2):** after the user allows Chrome's local network access on the hosted page, the shelf image stays failed until a reload or the next scan (found Nov 15; FUTURE_WORK). The message says to refresh, but the cause is not obvious to a shopkeeper |
| H10 | Help and documentation | Each section has a one-line explanation under its heading; dialogs explain their fields and effects ("An order goes to the dealer when the shelf count stays at or below Reorder At") | **P12 (1):** no help page or first-run guide. A new shopkeeper must learn the meaning of Shrinkage, Days of Cover and Gross Profit from the short explanations |

Dealer screens (Purchase Orders, notifications): clear and limited to the dealer's job. Two problems already recorded elsewhere are not counted in the 12 above: on a phone, the dealer must scroll the table sideways to reach Accept Order (found Nov 15, severity 2); and demo orders all show the number "#SEEDH-" (demo data only, severity 1). Both are in `docs/FUTURE_WORK.md`.

## 2. Cognitive walkthrough of the 10 shopkeeper tasks

| # | Task (from `USABILITY_TEST.md`) | Path | Predicted outcome | Risk |
|---|---|---|---|---|
| 1 | Sign in | Email, Password, Sign In | Straightforward. Errors appear on each field, with the focus on the first | — |
| 2 | How many spark plugs, and do they agree with the records? | Dashboard, Stock Check: On Shelf 4, POS Record 4, Matched | Straightforward | If the camera has stopped, the count is old (P1). The status line says so |
| 3 | Record a sale of one spark plug | Stock Check, Spark Plug row, Record Sale | Straightforward; the row turns Mismatch at once | No undo if the wrong row is clicked (P4) |
| 4 | Find the warning and mark it as seen | Wait about 3 minutes; Active Alerts on the dashboard, or the bell, or the Alerts tab; Acknowledge | **Likely stumbling point:** the alert appears only after the mismatch has lasted 3 minutes. Until then, Active Alerts says the parts differ and that a lasting mismatch becomes an alert, but not how long "lasting" is | The user may think nothing happened; the delay is deliberate (people reaching for parts must not raise alerts) but is not stated in minutes (FUTURE_WORK: show the delay) |
| 5 | Confirm the order that has arrived | Orders tab (badge), the Dispatched order is listed first, Mark Received | Straightforward | — |
| 6 | Profit in the last 30 days, and the advice for petrol filters | Dashboard tile Gross Profit (or Insights), then What To Do: "Raise the reorder level to 2" | Straightforward to find; the business terms may need their explanations | Jargon (P12) |
| 7 | Order petrol filters when the shelf gets down to 2 | Products, Edit (Petrol Filter), Reorder At = 2, Save Settings; or What To Do's "Edit in Part Settings" link | Straightforward; the link opens the right row with the focus on Edit | The advice says "reorder level", the form says "Reorder At" (P5) |
| 8 | Who recorded the sale, and when? | Products, Stock Log; or the History link on the Spark Plug row | **Likely stumbling point:** the Stock Log is not a tab (P8). Once found, "Sale, -1, By: You" and the time are clear | — |
| 9 | Stop the camera counting for a while, then start again | Dashboard, Pause Scanning (15 Min), then Resume Scanning | **Likely stumbling point:** the control is a low-emphasis text button under the status line (P6) | — |
| 10 | Sign out | Log Out, top right | Straightforward | — |

## 3. Recommendations (in order of value for effort; none built before submission)
1. **P1:** when no scan is recent, qualify the claims ("All Matched at the last scan, 13 hours ago") instead of stating them as current.
2. **P5:** use one name for the setting everywhere, "Reorder At", including in the Insights advice and tables.
3. **P2:** replace "backend" with "the shop laptop's Smart Inventory program"; hide "Inference (ms)" or move it to a technical view.
4. **P4:** an Undo for Record Sale for a few seconds after the click (planned as SL-4; needs a rules change).
5. **P6 and P7:** give Pause Scanning, Adjust and Cancel Order a visible button outline, and give the quantity box a visible label.
6. **Task 4:** say the alert delay in minutes on the dashboard ("becomes an alert after 3 minutes").
7. **P8:** a "Stock Log" link on the dashboard beside Stock Check, or make it a tab once the header has room.
8. **P11:** a Try Again button on the shelf image error.
9. **P12:** a short help page explaining each figure, linked from Insights.
10. Run the planned user test (`docs/USABILITY_TEST.md`, SUS) with real shopkeepers, ideally 5 or more, to confirm or correct these predictions.

## 4. Limits of this review
An expert review predicts problems; it does not measure them. It cannot say how many users would fail a task, how long tasks take, or how satisfied users are (no SUS score). It tends to miss problems that come from a user's own expectations and vocabulary, and may report problems that real users would not notice. It covers the screens as built on Nov 16, 2026, on desktop and phone widths in Chrome.
