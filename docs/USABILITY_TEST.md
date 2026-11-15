# Usability Test (Group 4, item 35; NFR4)

A short test of whether someone who has never used Smart Inventory can do a shopkeeper's everyday jobs without help. You run it; the participant does the tasks. It takes about 30 minutes per person. Results go into `docs/REPORT_NOTES.md` ("Usability test").

## Before the session (with Claude)
1. Claude takes a snapshot of the real data, and sets up one temporary order that is already Dispatched (for task 5). Afterwards Claude restores the real data and checks it is identical.
2. The shelf shows 4 spark plugs and 1 petrol filter, and the dashboard says Matched for both.
3. Open `http://localhost:5173` on the shop laptop, signed out. Have a timer ready (a phone stopwatch is fine).

## How to run it
- Read the participant this: "We are testing the app, not you. Please think aloud: say what you are looking for and what you expect to happen. I can't help during a task, but you can give up on any task at any time."
- Read one task at a time. Do not point at the screen or name a button unless they give up.
- For each task, note: **done** (on their own), **done with help**, or **not done**; the time; and anything they said or got stuck on.

## Tasks (shopkeeper)
| # | Read this to the participant | Done when |
|---|---|---|
| 1 | "Sign in. The email is shopkeeper@smartinventory.com; I'll type the password." | The dashboard is showing |
| 2 | "How many spark plugs does the camera see on the shelf right now, and does that agree with the shop's records?" | They say 4, and that it matches |
| 3 | "A customer has just bought one spark plug. Record that sale." | Record Sale done for Spark Plug; Stock Check shows Mismatch |
| 4 | "The app should warn you that the shelf and the records now disagree. Find that warning and mark it as seen." (It appears about 3 minutes after task 3: do task 6 first if it has not appeared yet.) | The alert is Acknowledged |
| 5 | "The dealer has sent an order. When it arrives at the shop, you confirm it. Confirm the order that has arrived." | Mark Received done on the dispatched order |
| 6 | "How much profit did the shop make on parts in the last 30 days, and what does the app suggest you do about petrol filters?" | They read the Gross Profit figure and the What To Do line for Petrol Filter |
| 7 | "Make the app order petrol filters when the shelf gets down to 2." | Products, Petrol Filter settings, Reorder At is 2 and saved |
| 8 | "Find out who recorded the sale you made earlier, and when." | They open the Stock Log (from Products or a History link) and read the Sale entry: "You" and its time |
| 9 | "You are about to rearrange the shelf. Stop the camera from counting for a while, then start it again." | Pause Scanning, then Resume |
| 10 | "Sign out." | The Sign In page is showing |

Optional dealer task (if there is time): sign in as `dealer@smartinventory.com` and "accept the newest order and mark it as sent to the shop".

## Questionnaire (System Usability Scale)
After the tasks, the participant answers each statement from 1 (strongly disagree) to 5 (strongly agree). Read them exactly as written.

| # | Statement | 1 to 5 |
|---|---|---|
| 1 | I think that I would like to use this system frequently. | |
| 2 | I found the system unnecessarily complex. | |
| 3 | I thought the system was easy to use. | |
| 4 | I think that I would need the support of a technical person to be able to use this system. | |
| 5 | I found the various functions in this system were well integrated. | |
| 6 | I thought there was too much inconsistency in this system. | |
| 7 | I would imagine that most people would learn to use this system very quickly. | |
| 8 | I found the system very cumbersome to use. | |
| 9 | I felt very confident using the system. | |
| 10 | I needed to learn a lot of things before I could get going with this system. | |

**Scoring:** for statements 1, 3, 5, 7 and 9, take the answer minus 1; for 2, 4, 6, 8 and 10, take 5 minus the answer. Add the ten results and multiply by 2.5. That gives a score from 0 to 100. About 68 is average; above 80 is good. Send Claude the raw answers and Claude will work out the score and check it.

Finally, ask two open questions and write down the answers: "What was the most confusing part?" and "What would you change first?"

## What to send back
For each participant: the task table (done or not, time, notes), the ten answers, and the two open answers. In the report, say how many people took part. With one participant, the result is an indication, not a statistic.
