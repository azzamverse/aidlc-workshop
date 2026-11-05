# Requirements: Table Order

Traces to the intent statement (`ideation/intent-capture/intent-statement.md`, success measures SM1 to SM6), the scope document (`ideation/scope-definition/scope-document.md`, features F1 to F3), the brief (`ideas/table-order/IDEA.md`) and the answers in `requirements-analysis-questions.md` (Q1 to Q5).

## Intent Analysis

Diners should be able to order from their table at their own pace and see how each order is progressing, without waiting for staff. Staff should have one live view of every table, move orders through the kitchen, and finish a visit with a simple bill and close. The request is a new, multi-screen web app with a clear brief, at Standard depth. It is the workshop exercise, built and signed off in one session of about 5 hours.

The success measures check that the product is delivered and works. They do not measure restaurant outcomes.

## Functional Requirements

"Pass when" is the check for each requirement. A source marked "corner" is a recommended default from a sweep of unusual conditions (see Assumptions). A corner or assumption row traces to the feature named in its section heading: FR1 to FR4 and FR12 to F1, FR5 to F1 and open question 1, FR6 and FR7 to F2, FR8 to F1 and F2 through open question 4, FR9 and FR10 to F3, FR13 to SM6. Non-functional rows trace to the success measures and features they name, or to the features as a whole.

### FR1. Browse the menu (Feature F1)

| ID | Requirement | Pass when | Source |
|---|---|---|---|
| FR1.1 | The customer view at `/table/:id` shows the menu grouped by category. | Given table 5 exists, when a diner opens `/table/5`, then all 4 categories and their items are shown. | Brief, F1 |
| FR1.2 | Each menu item shows its name, price, description and image. | Every seeded item shows all four. | Brief, F1, SM5 |
| FR1.3 | A sold-out item shows as "Sold out" and cannot be added to the cart. | Given an item is marked sold out, when a diner views the menu, then it shows "Sold out" and has no working add action. | Q4 |
| FR1.4 | The menu has distinct loading and error views. | A failed menu load shows an error message with a way to try again, not an empty menu. | Corner |

### FR2. Cart (Feature F1)

| ID | Requirement | Pass when | Source |
|---|---|---|---|
| FR2.1 | A diner can add an item to the cart and remove it. | Adding shows the item in the cart; removing takes it out. | Brief, F1 |
| FR2.2 | A diner can change a line's quantity, from 1 to 20. | Quantity changes are kept; a value below 1 or above 20 cannot be set. | Brief, assumption |
| FR2.3 | The cart shows a live total. | The total equals the sum of price times quantity after every change. | Brief, F1 |
| FR2.4 | The cart survives a page refresh. Each device keeps its own cart. | Given items in the cart, when the page refreshes, then the same items and quantities are shown; a second device's cart is unaffected. | Brief, SM3, assumption |
| FR2.5 | An empty cart says so and leads back to the menu. | With no items, the cart shows an empty message, a way to the menu, and no working "Place order". | Corner |

### FR3. Place an order (Feature F1)

| ID | Requirement | Pass when | Source |
|---|---|---|---|
| FR3.1 | A diner can place the cart as an order and sees its order number. | Placing an order shows its number, and the cart is emptied. | Brief, F1 |
| FR3.2 | Order numbers are unique across the restaurant. | No two orders share a number, across all tables. | Assumption |
| FR3.3 | If an item in the cart has sold out, placing the order tells the diner which item sold out and takes it out of the cart. The rest of the cart is kept and no order is created. | Given a cart holding a sold-out item, when the diner places the order, then the item is named and removed, the other lines stay, and no order appears on the board. If it was the only item, the diner sees the same message and the empty cart view (FR2.5). | Q4 |
| FR3.4 | Submitting twice never creates two orders. | A double click, or a retry after a lost response, creates exactly one order. | Corner |
| FR3.5 | A failed placement keeps the cart and says what happened. | When the server cannot be reached, an error shows and the cart is unchanged. | Corner |
| FR3.6 | The server validates every order. | An order with an unknown item, an unknown table or a quantity outside 1 to 20 is refused with a clear error and is not stored. | Corner |

### FR4. My orders (Feature F1)

| ID | Requirement | Pass when | Source |
|---|---|---|---|
| FR4.1 | "My orders" shows the whole table's orders for the current visit, each with its number, items and status. | Two devices at one table both see both orders. | Brief, F1, assumption |
| FR4.2 | A status change appears on the diner's view within 2 seconds, with no refresh. | Given "My orders" is open, when staff change a status, then the new status shows within 2 seconds. | Brief, SM2, assumption |
| FR4.3 | With no orders, "My orders" says so. | A new visit shows an empty message, not a blank area. | Corner |
| FR4.4 | When the live connection drops, the view reconnects by itself and catches up. | After the connection returns, the view shows every change it missed. | Corner |

### FR5. Cancel an order (open question 1)

| ID | Requirement | Pass when | Source |
|---|---|---|---|
| FR5.1 | A diner can cancel an order while it is Pending. | Cancelling a Pending order makes it Cancelled. | Q1 |
| FR5.2 | Once an order is Preparing or later, it cannot be cancelled. | No cancel action is shown; if the kitchen moved it just before the request, the request is refused and the diner sees the current status. | Q1, corner |
| FR5.3 | A cancelled order shows as Cancelled under "My orders" and on the kitchen board, and is left off the bill. | The word "Cancelled" appears in both views, and the bill total excludes it. | Q1 |

### FR6. Live kitchen board (Feature F2)

| ID | Requirement | Pass when | Source |
|---|---|---|---|
| FR6.1 | The staff view at `/staff` shows a grid of table cards, and a new order appears on its table's card within 2 seconds, with no refresh. | Given the board is open, when a diner places an order, then it appears within 2 seconds. | Brief, F2, SM1 |
| FR6.2 | A new order is highlighted until a member of staff moves the order to Preparing. | The highlight shows on arrival and goes when the order moves to Preparing. | Brief, SM1, assumption |
| FR6.3 | Each order on the board shows its number, items, quantities and status. | All four are visible on the card. | Brief, F2 |
| FR6.4 | A table with no orders shows as empty, and the board still shows all 10 tables. | With no orders, 10 cards show, each marked as having no orders. | Corner |
| FR6.5 | The board reconnects by itself after a dropped connection and catches up. | After the connection returns, the board shows every order and change it missed. | Corner |

### FR7. Change order status (Feature F2)

| ID | Requirement | Pass when | Source |
|---|---|---|---|
| FR7.1 | Staff move an order forward one step at a time: Pending, Preparing, Completed. | Each action moves the order exactly one step. | Brief, F2, assumption |
| FR7.2 | Statuses never move backward or skip a step, and a Completed or Cancelled order does not change again. | The server refuses any other change and the status stays as it was. | Assumption |
| FR7.3 | If a diner cancels at the same moment staff move the order, one action wins and the other is told. | The final status is the same on every screen. | Corner |

### FR8. Mark items sold out (open question 4)

| ID | Requirement | Pass when | Source |
|---|---|---|---|
| FR8.1 | Staff can mark an item as sold out, and back again, from the staff view. | The change is kept after a refresh. | Q4 |
| FR8.2 | The change reaches open diner menus within 2 seconds. | An open menu shows or clears "Sold out" with no refresh. | Q4, corner |

### FR9. Table bill (Feature F3)

| ID | Requirement | Pass when | Source |
|---|---|---|---|
| FR9.1 | Staff can open any table to see its bill. | Opening a table from the board shows its bill. | Brief, F3 |
| FR9.2 | The bill lists each order with its number, items, quantities, prices and subtotal. | Each non-cancelled order shows all five. | Q5 |
| FR9.3 | The bill ends with one combined total for the table. | The total equals the sum of the order subtotals, to the cent. | Q5 |
| FR9.4 | Cancelled orders are left off the bill. | A cancelled order adds nothing to the bill. | Q1 |
| FR9.5 | The bill screen says which orders are still open. | Each Pending or Preparing order is named as open. | Q2 |
| FR9.6 | A table with no orders shows an empty bill message. | The bill says there are no orders, with a total of zero. | Corner |

### FR10. Close a table (Feature F3)

| ID | Requirement | Pass when | Source |
|---|---|---|---|
| FR10.1 | "Close table" is unavailable until every order at the table is Completed or Cancelled. | With any Pending or Preparing order, the button is unavailable and the server refuses the action. | Q2 |
| FR10.2 | "Close table" is unavailable when a table has no orders. | A table with no orders cannot be closed. A table whose orders are all Cancelled has orders, so it can be closed, with a bill total of zero. | Assumption |
| FR10.3 | Closing a table archives the visit and resets the table for the next diner. | After closing, the board shows the table empty and its orders are stored as archived. | Brief, F3, SM4 |
| FR10.4 | Archived visits are stored but shown nowhere. | No screen shows an archived visit. | Brief out of scope, assumption |
| FR10.5 | After a table is closed, its customer view shows an empty cart and no orders, ready for the next diner. Each cart lives on its device (FR2.4), so a device's saved cart from before the close is cleared. | A customer view opened after the close shows an empty cart and an empty "My orders", including on a device that still held a saved cart. | Intent statement assumption, review R-01 |
| FR10.6 | Closing the same table twice has the same result as closing it once. | A second close changes nothing and reports no failure to staff. | Corner |
| FR10.7 | The close reaches open devices live: within 2 seconds every open customer view for that table empties its cart, clears "My orders" and shows "This table was closed". A device that was offline does the same when it reconnects. | Given a diner's view is open with items in the cart, when staff close the table, then within 2 seconds the cart and "My orders" are empty and the message shows; a device offline during the close does the same on reconnecting. | Review R-01 decision, F3, SM4 |

### FR11. Staff access (open question 3)

| ID | Requirement | Pass when | Source |
|---|---|---|---|
| FR11.1 | The staff view opens directly, with no PIN or login. | Opening `/staff` shows the board straight away. | Q3 |

### FR12. Tables and addresses

| ID | Requirement | Pass when | Source |
|---|---|---|---|
| FR12.1 | A table address that does not exist shows a clear message. | `/table/99`, or any id that is not one of the 10 tables, shows "table not found" and takes no orders. | Corner |
| FR12.2 | Opening `/table/:id` stands in for scanning a QR code. | Each of the 10 tables opens by its address. | Brief |

### FR13. Start-up and seed data

| ID | Requirement | Pass when | Source |
|---|---|---|---|
| FR13.1 | One command, `npm install && npm start`, starts everything, and the app opens at http://localhost:3000. | From a clean checkout, the command brings up the app at that address. | Brief, SM6 |
| FR13.2 | The first run seeds 10 tables, 4 categories and 12 menu items. | A first run with no database shows exactly those. | Brief |
| FR13.3 | A later start keeps existing data and does not seed twice. | After a restart, orders remain and the menu still has 12 items. | Corner |

## Non-Functional Requirements

| ID | Requirement | Pass when | Source |
|---|---|---|---|
| NFR1 | Live updates are fast: a new order, a status change and a sold-out mark each reach open screens within 2 seconds. | A timed browser test passes for each, on the local machine. | Brief, SM1, SM2 |
| NFR2 | Data is durable: accepted orders survive a server restart, and a multi-step write is all or nothing. | After a restart mid-service, every accepted order is present and no order is half-written. | Corner |
| NFR3 | The five built screens (Menu, Cart, My Orders, Kitchen Board, Table Bill) match their mockups. | The mockup-match checks pass for every screen. | Brief, SM5 |
| NFR4 | Responsive layout: diner screens work at 360 px wide and staff screens at 1024 px wide. | No horizontal scroll and no clipped controls at those widths. | Brief |
| NFR5 | Inputs are validated and escaped. All input is checked on the server, and text shown on screen cannot run as code. The staff view has no protection, by decision (FR11.1), which is acceptable only because the app runs locally. | Invalid requests are refused, and markup in any input renders as plain text. | Q3, corner |
| NFR6 | Accessibility: WCAG 2.1 AA for contrast and labels; the whole journey works by keyboard; status is shown with words or icons, never by colour alone. | A keyboard-only browser test completes the whole journey, and every status has a word or icon. | Project rules, assumption |
| NFR7 | Motion stops when the device asks for reduced motion. | With reduced motion on, no transition runs. | Project rules |
| NFR8 | Money is exact: prices are held in a whole number of cents, in one currency, with no tax or service charge. | Totals have no rounding error across a bill. | Assumption |
| NFR9 | Browsers: the app works in Chromium, Google Chrome and WebKit. Firefox is not supported. | The browser tests pass in all three. | Project rules |
| NFR10 | Testability and settings: ports and the database file come from settings, and the verification command `npm test && npm run test:e2e` runs every test. | Two copies run side by side with different settings and never share a port or database. | Project rules |
| NFR11 | Failures are visible: a failed server operation is logged and the person using the screen sees a clear message. | A forced failure produces a log line and a message on screen. | Corner, construction rules |

## Constraints

- Technology: React single-page app, Node.js with Express, SQLite, and Server-Sent Events for live updates (brief).
- It runs locally only (intent statement, Q4).
- One responsive web app with two views: customer `/table/:id` and staff `/staff` (brief).
- Five screens: Menu, Cart, My Orders, Kitchen Board, Table Bill (brief).
- High-fidelity HTML mockups come first, and the built app must match them (brief).
- The whole app is built, tested and signed off within the workshop session of about 5 hours (scope document, Q3).
- The team's build rules apply: 4 Units built as 4 Bolts, with the walking skeleton first (project rules).

## Assumptions

Each takes the recommended choice. Accepted at this stage's approval, or turned back into a question.

- A status change reaches the diner within 2 seconds. Reason: this confirms the time limit the intent statement left open for SM2.
- Each device keeps its own cart, and "My orders" shows the whole table's orders for the visit. Reason: diners at one table share a visit but order from their own phones.
- Order numbers are unique across the restaurant. Reason: staff can name any order without saying its table.
- A cart line holds 1 to 20 of an item. Reason: this stops mistyped quantities.
- A new order stays highlighted until it moves to Preparing. Reason: staff act on what the highlight shows.
- Statuses only move forward, one step at a time. Reason: the brief's order of statuses.
- A sold-out mark is not menu management. Reason: menu management is out of scope, but Q4 needs this one switch.
- Prices use one currency, with no tax or service charge. Reason: payments are out of scope. The currency itself is chosen at Refined Mockups, before any screen is built, and the prices held as whole cents do not depend on which one it is.
- Archived visits are stored but shown nowhere. Reason: past-visit history is out of scope.
- "Close table" is unavailable when a table has no orders. Reason: there is no visit to archive.
- Status is shown with words or icons, never by colour alone. Reason: accessibility.
- The corner-case requirements are recommended defaults. Reason: they settle unusual conditions the brief does not cover, and the team can change any of them.

## Out of Scope

Payments, QR code generation, multi-language, menu management, past-visit history, notifications and cloud deployment (intent statement, scope document). Firefox is not tested (project rules).

## Open Questions

None.
