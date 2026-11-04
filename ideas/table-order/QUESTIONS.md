# Table Order: the fixed question script

This is the fixed question script for the Table Order workshop. It is built from the questions asked in the 2026-11-03 dry run.

- At each stage the AI asks exactly these questions, in this order, with the same wording and the same options.
- The AI adds no questions of its own. The one exception is a single follow-up when a team's answer is unclear or contradicts an earlier answer.
- For any other open point the AI chooses the recommended option itself and lists it under Assumptions & Open Questions. The team accepts that list in one reply, or turns an item back into a question.
- The recommended option is always first and marked "(Recommended)". No other option is a default.
- Where a stage asks fewer questions than its limit, the stage says so. The AI never fills the gap with questions of its own.
- **Decision points** are prompts that are not in a question file: approvals, commits and how Construction runs. Each one has the exact reply the facilitator tells teams to give.

Question limits per stage (project rules): 1.1: 6 · 1.4: 5 · 2.3: 5 · 2.4: 2 · 2.5: 3 · 2.6: 2 · 2.7, 2.8 and 2.9: 1 each · 3.1: 1 per Unit · 3.5 and 3.6: none besides the plan approval and the sign-off.

---

## Before the first question: how to answer

**Decision point.** When the first question file is ready, the AI asks: "How would you like to answer the questions?" The options are `Guide me`, `I'll edit the file` and `Chat`.

- Facilitator reply: **Guide me**

---

## 1.1 Intent Capture (6 questions, the limit)

## Q1. [Product Owner] What problem are we solving?

The brief says diners order from their table through a web app, and staff see orders live, update their status and close out tables. Which problem statement should the intent carry?

A. Diners wait for staff to take their order and cannot see how it is progressing, while staff juggle orders without one live view of every table. Ordering from the table, a live kitchen board and a one-click bill and close remove the wait and the guesswork. (Recommended)
B. Mainly a staff problem: the kitchen and floor lose track of orders; the diner side is secondary.
C. Mainly a diner problem: diners want to order at their own pace; the staff side is secondary.
D. Not yet defined.
X. Other (please specify)

## Q2. [Product Owner] Who uses the app?

The brief describes one responsive web app with two views: a customer view at `/table/:id` (opening `/table/5` stands in for scanning a QR code) and a staff view at `/staff`.

A. Two user groups: diners seated at a table (customer view), and restaurant staff, with floor and kitchen staff sharing the one staff view. (Recommended)
B. Three user groups: diners, floor staff and kitchen staff, each needing its own view.
C. Diners only; the staff view is a supporting tool, not a target user.
D. Not yet defined.
X. Other (please specify)

## Q3. [Product Owner] How will we know it worked?

These become the success measures the later stages test against.

A. The brief's checks: a new order appears on the staff board within 2 seconds, highlighted; a status change (Pending, Preparing, Completed) shows on the diner's view; the cart survives a page refresh; closing a table archives the visit and resets the table; the five built screens (Menu, Cart, My Orders, Kitchen Board, Table Bill) match their mockups; and `npm install && npm start` starts everything at http://localhost:3000. (Recommended)
B. Only the live-update check: a new order on the staff board within 2 seconds.
C. A full diner journey (browse, order, see status, get the bill) works end to end, with no specific timings.
D. Not yet defined.
X. Other (please specify)

## Q4. [Product Owner] What does this first version leave out?

The workflow plan for this work is already chosen (`dpl-workshop`); this question is only about what the product itself will not do yet.

A. Exactly the brief's out-of-scope list: payments, QR code generation, multi-language, menu management, past-visit history, notifications and cloud deployment. It runs locally only. (Recommended)
B. The brief's list, plus anything beyond the five screens (no extra admin or settings screens).
C. Nothing is left out; the brief's out-of-scope list can be revisited.
D. Not yet defined.
X. Other (please specify)

## Q5. [Sponsor] Why are we building this now?

A. It is the workshop exercise: the team builds a realistic app end to end in one session (about 5 hours), with AI-DLC guiding each step. (Recommended)
B. A real restaurant has asked for it.
C. A product opportunity we want to test with restaurants.
D. Not identified.
X. Other (please specify)

## Q6. [Sponsor] Who decides, and who has a say?

A. The workshop team plays every role. The Product Owner decides scope and the brief's five open questions; the rest of the team reviews and approves each step. (Recommended)
B. A restaurant owner decides; diners and staff only influence.
C. One facilitator decides everything; the team only observes.
D. Not identified.
X. Other (please specify)

**Assumptions & Open Questions (asked once, after Q6).** The AI lists these with the recommended choice taken. It then asks `A. Accept assumptions` / `B. Convert to follow-up questions`.
- The brief's five open questions are decided when requirements are written: they are the first questions of Requirements Analysis.
- The team follows progress at each step's approval and on the workshop dashboard. There is no separate status report.
- SM2's time limit is 2 seconds, the same as SM1's. Requirements Analysis confirms or changes it.
- After a table is closed, its customer view shows an empty cart and no orders, ready for the next diner.
- The success measures check that the product is delivered and works. They do not measure restaurant outcomes such as waiting time.

Facilitator reply: **A. Accept assumptions**. Converting the list into questions would take the stage past its limit of 6.

**Gate.** "Intent Capture & Framing complete. How would you like to proceed?" (`Approve` / `Request Changes`). Facilitator reply: **Approve**

---

## 1.4 Scope Definition (3 questions; the limit is 5)

Not asked, because the answer is already settled: what the first version leaves out (Intent Capture Q4); the build order (walking skeleton first, then the rest in parallel, from the project rules); and the brief's five open questions (decided at Requirements Analysis).

## Q1. [Product Owner] What is the smallest version that delivers value?

The brief describes three features: (1) diners order from the table, (2) a live kitchen board for staff, (3) staff open a table's bill and close the table.

A. All three are Must Have: together they make the full journey from ordering to the next diner sitting down, and each success measure in the intent statement needs one of them. (Recommended)
B. Features 1 and 2 are Must Have; bill and close (3) is Should Have.
C. Only ordering from the table (1) is Must Have; the staff features are Should Have.
D. Not yet defined.
X. Other (please specify)

## Q2. [Product Owner] Is anything inside the three features only nice to have?

These would be the first things dropped if the session runs short. Candidates from the brief: menu item images, the highlight on a newly arrived order, and the cart surviving a page refresh.

A. None: everything the brief lists inside the three features is Must Have, because the success measures test the highlight and the cart surviving a refresh, and the mockups show the images. (Recommended)
B. Menu item images are Should Have; the rest is Must Have.
C. Images and the new-order highlight are Should Have; the rest is Must Have.
D. Not yet defined.
X. Other (please specify)

## Q3. [Delivery Lead] Are there hard deadlines tied to particular capabilities?

A. One deadline for everything: the whole app is built, tested and signed off within the workshop session of about 5 hours; no capability has a deadline of its own. (Recommended)
B. Ordering from the table must be working by the middle of the session, before the staff features.
C. No deadline at all.
D. Not yet defined.
X. Other (please specify)

**Assumptions & Open Questions** (listed in the scope document, accepted at the gate):
- The value stream map follows one table visit, from the diner sitting down to the table being reset.
- If the session runs short, the team decides what to cut at the next approval point. Nothing is marked droppable in advance.
- The brief's five open questions stay open until Requirements Analysis.

**Decision point.** If the AI asks "Does this all look correct before I generate the artifact?" (`Looks correct` / `Request changes`), the facilitator reply is **Looks correct**.

**Gate.** Facilitator reply: **Approve**

---

## 2.3 Requirements Analysis (5 questions, the limit: the brief's five open questions)

Everything else the brief or the earlier answers leave open is decided with the recommended choice and listed under Assumptions & Open Questions in `requirements.md`.

## Q1. [Product Owner] Can a customer cancel an order, and up to which status?

A. Yes, while the order is still Pending. Once the kitchen moves it to Preparing it can no longer be cancelled. A cancelled order shows as Cancelled under "My orders" and on the kitchen board, and is left off the bill. (Recommended)
B. No: customers cannot cancel; they ask a member of staff.
C. Yes, up to and including Preparing; only a Completed order cannot be cancelled.
D. Not yet defined.
X. Other (please specify)

## Q2. [Product Owner] Can a table be closed while it has orders that are Pending or Preparing?

A. No. "Close table" stays unavailable until every order at the table is Completed or Cancelled, and the bill screen says which orders are still open. (Recommended)
B. Yes, after a warning that names the unfinished orders; they are archived as they are.
C. Yes, with no warning.
D. Not yet defined.
X. Other (please specify)

## Q3. [Product Owner] How do staff get into the staff view?

A. No protection: the staff view opens directly. The app runs only on the local machine during the workshop, so anyone with access to that machine is treated as staff. (Recommended)
B. A shared staff PIN, asked for once when the staff view opens.
C. A login with a name and password for each member of staff.
D. Not yet defined.
X. Other (please specify)

## Q4. [Product Owner] What happens when an item sells out mid-service?

A. Staff mark the item as sold out (and back again) from the staff view. Diners see it as "Sold out" on the menu and cannot add it. If it is already in a diner's cart, placing the order tells them which item sold out and takes it out of the cart, and the rest of the cart is kept. (Recommended)
B. Nothing in the app: staff tell the diner, and the order goes ahead as normal.
C. As A, and staff can also remove a sold-out item from an order already placed.
D. Not yet defined.
X. Other (please specify)

## Q5. [Product Owner] Is the bill one combined total, or listed per order?

A. Listed per order: each order with its number, items, quantities, prices and subtotal, then one combined total for the table. (Recommended)
B. One combined list: the same item ordered more than once is merged into one line, then one total.
C. One combined total only, with no item lines.
D. Not yet defined.
X. Other (please specify)

**Assumptions & Open Questions** (12 items in `requirements.md`, accepted at the gate):
- A status change reaches the diner within 2 seconds.
- Each device keeps its own cart, and "My orders" shows the whole table's orders for the visit.
- Order numbers are unique across the restaurant.
- A cart line holds 1 to 20 of an item.
- A new order stays highlighted until it moves to Preparing.
- Statuses only move forward, one step at a time.
- A sold-out mark is not menu management.
- Prices use one currency, with no tax or service charge.
- Archived visits are stored but shown nowhere.
- "Close table" is unavailable when a table has no orders.
- Status is shown with words or icons, never by colour alone.
- The corner-case requirements are recommended defaults.

**Gate decision: the first Major review finding (asked at the gate, together with the approval).** This is the run's first Major finding, so the team's rules send it to the team. Every later Major finding is decided and fixed by the AI.

## R-01. [Product Owner] When staff close a table, what happens on diner phones at that table that are already open?

A. The close reaches open devices live: within 2 seconds every open customer view for that table empties its cart, clears "My orders" and shows "This table was closed", and a device that was offline does the same when it reconnects. (Recommended)
B. Devices reset the next time their page is refreshed.
C. A device whose cart dates from before the close is refused when it next acts, and told to reload.
D. Not yet defined.
X. Other (please specify)

Ask this as written. It assumes the requirements draft did not yet say what open diner devices do when their table is closed. If your draft already covers this, say so and ask it anyway.

**Gate.** Facilitator reply: **Approve**

---

## 2.4 User Stories (no questions; the limit is 2)

No questions are asked at this step. The personas, priorities and behaviour are already settled by earlier answers. The open planning points take the recommended choice:
- Two personas: the diner, and one member of staff.
- MoSCoW priorities, with every story Must Have.
- Stories are broken down by user journey within each feature.
- Every story has 3 to 6 Given/When/Then criteria.

**Assumptions & Open Questions** (in `stories.md`):
- Stories are grouped by journey; the build slices come at Units Generation.
- The one-command start story is written for staff.
- No questions were asked.

**Gate.** Facilitator reply: **Approve**

---

## 2.5 Refined Mockups (3 questions, the limit)

Not asked, because they are already settled:
- The states each screen handles: loading, empty, error and success.
- WCAG 2.1 AA and keyboard use.
- Breakpoints: 360 px for diner screens, 1024 px for staff screens.
- A small new design system.
- The team's Screen design rules: the bottom tab bar, the category pills, the "+ Add" pill and the smooth look.

## Q1. [Designer] What look and feel should the app have?

A. Warm and calm: an off-white background, dark text, one terracotta accent color for main actions, rounded cards and large touch targets. Status colors (amber Pending, blue Preparing, green Completed, grey Cancelled) always come with a word and an icon. (Recommended)
B. Dark: a dark background on every screen, like a kitchen display, with bright status colors.
C. Plain: black and white with one blue accent and no decoration.
D. Not yet defined.
X. Other (please specify)

## Q2. [Product Owner] Which currency do prices show?

The brief says nothing about it; every price on all five screens shows it.

A. US dollars, for example `$4.50`. (Recommended)
B. British pounds, for example `£4.50`.
C. Euros, for example `€4.50`.
D. Pakistani rupees, for example `Rs 450`.
X. Other (please specify)

## Q3. [Designer] Where do staff mark items as sold out?

Sold-out marking (Requirements Q4) is not one of the brief's five screens.

A. A "Menu availability" panel on the Kitchen Board screen, opened from a button in its header. It lists the 12 items with a Sold out switch each, so the app keeps its five screens. (Recommended)
B. A sixth screen, "Menu availability", linked from the Kitchen Board.
C. A switch next to each item on the Table Bill screen.
D. Not yet defined.
X. Other (please specify)

**Assumptions & Open Questions** (in `mockups.md`):
- Item images are emoji tiles.
- The bill is its own page at `/staff/tables/:id`.
- The mockups' seed menu becomes the app's seed data.
- Order numbers are shown as "#15".
- Icons always sit next to words.

**Gate.** Facilitator reply: **Approve**. The project rules already hold the screen-design changes the dry-run team asked for at this gate, so no request for changes is needed.

---

## 2.6 Domain Design (1 question, asked at the gate; the limit is 2)

No questions are asked before the design. The one real choice, how to split the server side into components, is presented with its trade-offs at the approval (`components.md`, Rationale; `decisions.md`, ADR-001).

## Q1. [Architect] Which component split do you approve?

A. Option A: eight components (Menu, Tables, Ordering, Billing, LiveUpdates, DinerApp, StaffApp, Platform). Each rule lives in one place, there are no dependency cycles, and after the walking skeleton the diner screens, the kitchen board and the bill can be built in parallel. (Recommended)
B. Option B: merge Tables and Billing into Ordering. Fewer calls, but one large component, and the bill and close can't be built in parallel with ordering.
C. Option C: one "Restaurant" server component plus Platform and the two screen components. The simplest wiring, but every rule in one place and no parallel build except the screens.
X. Other (please specify)

The gate shows these as `Approve with Option A`, `Approve with Option B`, `Approve with Option C` and `Request Changes`. Facilitator reply: **Approve with Option A**

**Assumptions & Open Questions** (in `components.md`):
- `image` holds the emoji.
- Live updates keep one hour of events for catching up.
- Types and validation detail are left to Functional Design.

---

## 2.7 Units Generation (1 question, the limit)

Settled by the project rules, so not asked:
- Units are split by feature around a walking skeleton.
- U1 carries everything the other Units share.
- Every other Unit depends only on U1.
- One app is started by one command.

The plan shown is U1 `u1-walking-skeleton`, U2 `u2-diner-screens`, U3 `u3-kitchen-board` and U4 `u4-bill-and-close`.

## Q1. [Architect] Do you approve this decomposition plan?

A. Approve Plan
B. Revise Plan
X. Other (please specify)

No option is marked recommended in this question, as in the dry run. The expected reply is **A. Approve Plan**.

**Gate.** Facilitator reply: **Approve**

---

## 2.8 Contract Design (no questions; the limit is 1)

No questions are asked. The brief and the earlier answers settle every point:
- There is no public API.
- The screens call the server over HTTP, and live updates use Server-Sent Events.
- U1 owns the contracts; U4 owns the Billing calls.
- Changes are additive.
- There is one error shape, a retry-safe placement key, and the live stream reconnects by itself.

**Gate.** Facilitator reply: **Approve**

---

## 2.9 Delivery Planning (1 question, the limit)

Settled, so not asked:
- The walking skeleton comes first.
- There is no scoring model.
- Each Bolt is one Unit.
- The Bolt order and the ports are 4100, 5100 and 6100.
- There are no outside dependencies.
- The biggest risk is the 5-hour session.
- Each Bolt's own details are in `bolt-plan.md`.

## Q1. [Delivery Lead] Use this command to verify each completed Unit? `npm test && npm run test:e2e`

A. Approve (Recommended)
B. Request Changes
X. Other (please specify)

**Decision point: the build order.** When this question first appears, the facilitator tells teams to type exactly:

> **Build Bolt 1 on its own, then Bolts 2 and 3 in parallel, then Bolt 4 on its own**

The AI then sets Construction to stage-major, swarm. When the command question comes back, the reply is **Approve**.

**Gate.** "Delivery Planning is done: Bolt 1 alone, then Bolts 2 and 3 in parallel, then Bolt 4 alone." Facilitator reply: **Approve**

**Decision point: who builds.** "Inception is done, and the plan has 4 Units. Who builds them?" (`Just me` / `Several teams`). Facilitator reply: **Just me**

---

## 3.1 Functional Design (1 question in total: U3 only; the limit is 1 per Unit)

**U1 `u1-walking-skeleton`: no questions.** Every corner is settled upstream: the races, the limits, live catch-up, the seed, the settings and the test hook. The remaining technical choices take the safe default and are listed in `rules.md`.

**U2 `u2-diner-screens`: no questions.** Everything is settled upstream: every screen state and its words, cart storage, the refusals, the live updates and the reset, and the card layout.

**U3 `u3-kitchen-board`: 1 question.**

## Q1. [Product Owner] Which orders does the board highlight as "★ New"?

FR6.2 keeps a new order highlighted "until a member of staff moves the order to Preparing". The board mockup, though, highlights #15 and not #14, which is also Pending.

A. Every Pending order, until it moves to Preparing or is cancelled. It reads the same on every staff screen and after a refresh, as FR6.2 says. The board mockup is updated so #14 is highlighted too. (Recommended)
B. Only orders that arrived while this board was open. That matches the mockup as drawn, but a refresh or a second staff screen loses the highlight.
C. Pending orders placed in the last 5 minutes.
D. Not yet defined.
X. Other (please specify)

Ask this as written. It assumes the board mockup highlights only one of the two Pending orders; if your mockup already highlights both, say so and ask it anyway.

**U4 `u4-bill-and-close`: no questions.** The bill and close rules follow from Requirements Q1, Q2 and Q5 and the refined mockups.

**Decision point: Bolt 4's design timing. This is not asked.** The project rules settle it: Functional Design runs for every remaining Unit first, then there is one grouped code-plan approval. Bolt 4 is designed now and built after Bolts 2 and 3 are merged and signed off. The AI does not ask whether Bolt 4's design should wait. If it does ask, the facilitator reply is **A. Design now, build later**. "Wait entirely" stops the parallel build of Bolts 2 and 3.

**Gate.** "Approve the Functional Design for Bolts 2, 3 and 4?" Facilitator reply: **Approve**

---

## 3.5 Code Generation (no questions besides the plan approvals and the sign-offs)

Each plan approval is asked on its own, never bundled with another question.

| Moment | Prompt | Facilitator reply |
|---|---|---|
| Bolt 1 code plan | "Approve the code plan for u1-walking-skeleton?" (`Approve Plan` / `Request Changes` / `I'll edit the files`) | **Approve Plan** |
| Bolt 1 sign-off (walking skeleton) | "Verified with `npm test && npm run test:e2e` (exit 0). Approve this completed u1-walking-skeleton?" (`Approve` / `Request Changes`) | **Approve** (after trying the app) |
| Commit after Bolt 1 | "Commit the approved walking skeleton now, so Bolts 2 and 3 can start from it?" (`Commit it` / `Not yet`) | **Commit it** |
| How to continue | "How should I continue building the remaining work?" (`Review each checkpoint` / `Continue automatically`) | **Review each checkpoint** |
| Bolts 2 and 3 code plans (one grouped approval) | Approve the code plans for u2-diner-screens and u3-kitchen-board | **Approve Plan** |
| Commit before the merge | "May I commit the approved documents in the main folder now … so Bolts 2 and 3 can merge back?" (`Commit it (Recommended)` / `Not yet`) | **Commit it** |
| Bolts 2 and 3 sign-off | Swarm batch approval (`Approve` / `Request Changes`) | **Approve** (after trying the app) |
| Bolt 4 code plan | Approve the code plan for u4-bill-and-close | **Approve Plan** |
| Commit before Bolt 4 merges | "May I commit the approved records in the main folder now, so Bolt 4 can merge in?" (`Commit it (Recommended)` / `Not yet`) | **Commit it** |
| Bolt 4 sign-off | Swarm batch approval (`Approve` / `Request Changes`) | **Approve** (after trying the app) |

If the parallel build fails, the team says: **build them one at a time instead**.

---

## 3.6 Build and Test (no questions besides the sign-off)

- Build and Test checks Chromium, Google Chrome and WebKit, plus a keyboard-only journey test. It asks no questions.
- **Sign-off.** Facilitator reply: **Approve**

---

## Any time

- To pause: type **Pause**.
- To carry on: type **Resume**, or run `/aidlc`.
