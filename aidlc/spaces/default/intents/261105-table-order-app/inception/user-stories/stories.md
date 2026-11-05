# User Stories: Table Order

Built from `requirements.md`. Personas are in `personas.md`. Every story is Must Have under MoSCoW. Stories are broken down by user journey within each feature, and each has 3 to 6 Given/When/Then criteria.

## Story Map

| Journey | Diner | Member of staff |
|---|---|---|
| Choose | US1.1, US1.2, US1.3, US1.4 | |
| Order | US1.5, US1.6 | US3.1 |
| Follow | US2.1, US2.2 | US3.2, US3.3 |
| Finish | US4.3 | US4.1, US4.2 |
| Set up and access | US5.2, US5.3 | US5.1 |

## Feature F1: Order from the table

### US1.1 Browse the menu by category

As a diner, I want to browse the menu by category, so that I can find what I fancy without waiting for staff.

- Priority: Must Have. Traces to: FR1.1, FR1.2, FR1.4. Depends on: none.
- **AC1.1.1** Given table 5 exists, when I open `/table/5`, then I see all 4 categories and their items.
- **AC1.1.2** Given the menu has loaded, when I look at any item, then I see its name, price, description and image.
- **AC1.1.3** Given the menu is still loading, when I look at the screen, then I see a loading view and not an empty menu.
- **AC1.1.4** Given the menu cannot be loaded, when the request fails, then I see an error message and a way to try again.

### US1.2 See what has sold out

As a diner, I want to see which items have sold out, so that I do not choose something I cannot have.

- Priority: Must Have. Traces to: FR1.3, FR8.2, NFR1. Depends on: none.
- **AC1.2.1** Given an item is marked sold out, when I view the menu, then it shows "Sold out".
- **AC1.2.2** Given an item shows "Sold out", when I try to add it, then it does not go in my cart.
- **AC1.2.3** Given my menu is open, when staff mark an item sold out or available again, then my menu shows the change within 2 seconds with no refresh.

### US1.3 Build my cart

As a diner, I want to add, remove and change items in a cart with a live total, so that I know what I am ordering and what it costs.

- Priority: Must Have. Traces to: FR2.1, FR2.2, FR2.3, FR2.5. Depends on: none.
- **AC1.3.1** Given an available item, when I add it, then it appears in my cart and the total includes it.
- **AC1.3.2** Given a line in my cart, when I change its quantity, then the line and the total update at once.
- **AC1.3.3** Given a line with a quantity of 20, when I try to go higher, then the quantity stays at 20; and it cannot go below 1.
- **AC1.3.4** Given a line in my cart, when I remove it, then it leaves the cart and the total drops by its amount.
- **AC1.3.5** Given my cart is empty, when I open it, then I see an empty message, a way to the menu, and no working "Place order".

### US1.4 Keep my cart through a refresh

As a diner, I want my cart to survive a page refresh, so that I do not lose my choices by accident.

- Priority: Must Have. Traces to: FR2.4. Depends on: none.
- **AC1.4.1** Given items in my cart, when I refresh the page, then the same items and quantities are shown.
- **AC1.4.2** Given my cart holds items, when another device at my table opens the same table, then that device's cart is its own and mine is unchanged.
- **AC1.4.3** Given items in my cart, when I close and reopen the tab while the table is still open, then the items are still there.

### US1.5 Place my order

As a diner, I want to place my cart as an order and get its number, so that I know the kitchen has it.

- Priority: Must Have. Traces to: FR3.1, FR3.2, FR3.4, FR3.5, FR3.6, NFR5, NFR11. Depends on: none.
- **AC1.5.1** Given a cart with available items, when I place the order, then I see its order number and my cart is empty.
- **AC1.5.2** Given two orders from different tables, when both are placed, then their numbers differ.
- **AC1.5.3** Given I press "Place order" twice, or retry after a lost response, when the requests arrive, then exactly one order exists.
- **AC1.5.4** Given the server cannot be reached, when I place the order, then I see an error and my cart is unchanged.
- **AC1.5.5** Given a request with an unknown item, an unknown table or a quantity outside 1 to 20, when the server receives it, then it is refused with a clear error, nothing is stored, and the failure is logged.
- **AC1.5.6** Given an item name containing markup reaches a screen, when it is shown, then it renders as plain text.

### US1.6 Find out an item sold out as I order

As a diner, I want to be told when something in my cart has just sold out, so that I can still order the rest.

- Priority: Must Have. Traces to: FR3.3. Depends on: none.
- **AC1.6.1** Given my cart holds a sold-out item and others, when I place the order, then I am told which item sold out and it leaves my cart.
- **AC1.6.2** Given the same situation, when the message shows, then the other lines remain and no order appears on the board.
- **AC1.6.3** Given the sold-out item was my only item, when I place the order, then I see the same message and the empty cart view.
- **AC1.6.4** Given an item in my cart sells out while I am still choosing, when I look at my cart, then the line stays in place until I place the order, when AC1.6.1 applies.

## Following an order

### US2.1 See my table's orders live

As a diner, I want to see my table's orders and their status update live, so that I do not have to ask how they are progressing.

- Priority: Must Have. Traces to: FR4.1, FR4.2, FR4.3, FR4.4, NFR1. Depends on: none.
- **AC2.1.1** Given two devices at my table have each placed an order, when I open "My orders", then I see both, each with its number, items and status.
- **AC2.1.2** Given "My orders" is open, when staff change a status, then the new status shows within 2 seconds with no refresh.
- **AC2.1.3** Given my table has no orders this visit, when I open "My orders", then I see an empty message.
- **AC2.1.4** Given my connection drops and returns, when it reconnects, then I see every change I missed without refreshing.

### US2.2 Cancel an order before the kitchen starts

As a diner, I want to cancel an order while it is still Pending, so that I can change my mind before the kitchen starts.

- Priority: Must Have. Traces to: FR5.1, FR5.2, FR5.3, FR7.3. Depends on: none.
- **AC2.2.1** Given my order is Pending, when I cancel it, then it shows as Cancelled under "My orders" and on the kitchen board.
- **AC2.2.2** Given my order is Preparing or Completed, when I view it, then there is no cancel action.
- **AC2.2.3** Given the kitchen moved my order to Preparing just before my cancel arrived, when the server receives it, then it is refused and I see the current status.
- **AC2.2.4** Given my order was cancelled, when the table's bill is opened, then the order adds nothing to it.
- **AC2.2.5** Given my table has a Pending order placed from another device, when I view "My orders", then I can cancel it too, because the visit is shared by the table.

## Feature F2: Live kitchen board

### US3.1 See new orders as they arrive

As a member of staff, I want every table on one board with new orders appearing and highlighted, so that nothing gets missed.

- Priority: Must Have. Traces to: FR6.1, FR6.2, FR6.3, FR6.4, FR6.5, FR11.1, NFR1. Depends on: none.
- **AC3.1.1** Given I open `/staff`, when the board loads, then I go straight in with no PIN or login and see all 10 table cards, with each empty table marked as having no orders.
- **AC3.1.2** Given the board is open, when a diner places an order, then it appears on that table's card within 2 seconds with no refresh, showing its number, items, quantities and status.
- **AC3.1.3** Given a new order has arrived, when I look at the board, then it is highlighted until it moves to Preparing or is cancelled.
- **AC3.1.4** Given the board's connection drops and returns, when it reconnects, then it shows every order and change it missed.

### US3.2 Move an order through the kitchen

As a member of staff, I want to move an order from Pending to Preparing to Completed, so that everyone can see where it is.

- Priority: Must Have. Traces to: FR7.1, FR7.2, FR7.3, NFR1. Depends on: none.
- **AC3.2.1** Given a Pending order, when I move it on, then it becomes Preparing; and a Preparing order becomes Completed.
- **AC3.2.2** Given any status change, when the server receives one that moves backward or skips a step, then it is refused and the status stays as it was.
- **AC3.2.3** Given a Completed or Cancelled order, when I look at it, then I am offered no status change.
- **AC3.2.4** Given a diner cancels at the same moment I move the order, when both arrive, then one wins, the other person is told, and every screen shows the same status.

### US3.3 Mark an item sold out

As a member of staff, I want to mark an item sold out and back again, so that diners stop ordering what the kitchen has run out of.

- Priority: Must Have. Traces to: FR8.1, FR8.2. Depends on: none.
- **AC3.3.1** Given an available item, when I mark it sold out from the staff view, then it stays sold out after a refresh.
- **AC3.3.2** Given a sold-out item, when I mark it available, then diners can add it again.
- **AC3.3.3** Given a diner's menu is open, when I change an item's mark, then the menu shows the change within 2 seconds.

## Feature F3: Bill and close table

### US4.1 See a table's bill

As a member of staff, I want to open a table and see its bill listed per order with one total, so that I can settle up with the table.

- Priority: Must Have. Traces to: FR9.1, FR9.2, FR9.3, FR9.4, FR9.5, FR9.6, NFR8. Depends on: none.
- **AC4.1.1** Given a table with orders, when I open it from the board, then I see each non-cancelled order with its number, items, quantities, prices and subtotal.
- **AC4.1.2** Given the bill is open, when I read the total, then it equals the sum of the subtotals, to the cent.
- **AC4.1.3** Given a table with a cancelled order, when I open its bill, then that order adds nothing.
- **AC4.1.4** Given a table with Pending or Preparing orders, when I open its bill, then those orders are named as still open.
- **AC4.1.5** Given a table with no orders, when I open its bill, then it says there are no orders, with a total of zero.

### US4.2 Close a table

As a member of staff, I want to close a table when its orders are finished, so that the visit is archived and the table is ready for the next diner.

- Priority: Must Have. Traces to: FR10.1, FR10.2, FR10.3, FR10.4, FR10.6. Depends on: none.
- **AC4.2.1** Given every order at a table is Completed or Cancelled, when I press "Close table", then the visit is archived and the board shows the table empty.
- **AC4.2.2** Given any order at the table is Pending or Preparing, when I view the bill, then "Close table" is unavailable, and the server refuses a direct request.
- **AC4.2.3** Given a table with no orders, when I view it, then "Close table" is unavailable.
- **AC4.2.4** Given a table whose orders are all Cancelled, when I press "Close table", then it closes, with a bill total of zero.
- **AC4.2.5** Given a table was just closed, when the close is requested again, then nothing changes and I see no failure.
- **AC4.2.6** Given a visit was archived, when I look at the Menu, Cart, My Orders, Kitchen Board and Table Bill screens for that table, then none of them shows its orders.

### US4.3 See that my table was closed

As a diner, I want my screen to reset when my table is closed, so that the next diner starts fresh and I know the visit is over.

- Priority: Must Have. Traces to: FR10.5, FR10.7, NFR1. Depends on: none.
- **AC4.3.1** Given my customer view is open with items in my cart, when staff close my table, then within 2 seconds my cart and "My orders" are empty and I see "This table was closed".
- **AC4.3.2** Given my device was offline during the close, when it reconnects, then it does the same.
- **AC4.3.3** Given a device still holds a saved cart from before the close, when a customer view opens on it, then it shows an empty cart and an empty "My orders".
- **AC4.3.4** Given a device has not yet heard that its table closed, when it places an order from its old cart, then the order is refused, the device shows "This table was closed", and its cart is emptied.

## Set up and access

### US5.1 Start the app with one command

As a member of staff, I want one command to start everything, so that the app is ready with no setup steps.

- Priority: Must Have. Traces to: FR13.1, FR13.2, FR13.3, NFR2. Depends on: none.
- **AC5.1.1** Given a clean checkout, when I run `npm install && npm start`, then the app opens at http://localhost:3000.
- **AC5.1.2** Given a first run with no database, when the app starts, then it has 10 tables, 4 categories and 12 menu items.
- **AC5.1.3** Given existing orders, when the app restarts, then the orders remain, none is half-written, and the menu still has 12 items.

### US5.2 Open my table by its address

As a diner, I want my table's address to open my table, so that I can start ordering straight away.

- Priority: Must Have. Traces to: FR12.1, FR12.2. Depends on: none.
- **AC5.2.1** Given any of the 10 tables, when I open its address, then I see that table's menu.
- **AC5.2.2** Given an address such as `/table/99`, when I open it, then I see "table not found".
- **AC5.2.3** Given a table address that does not exist, when an order is sent for it, then the order is refused.

### US5.3 Use the app by keyboard and without colour

As a diner or a member of staff, I want every action to work by keyboard, with status shown in words or icons, so that the app works for me however I use it.

- Priority: Must Have. Traces to: NFR6, NFR7. Depends on: none.
- **AC5.3.1** Given only a keyboard, when I go through the whole journey from ordering to closing a table, then I can complete every step.
- **AC5.3.2** Given any order status, when it is shown, then it has a word or an icon, never colour alone.
- **AC5.3.3** Given my device asks for reduced motion, when I use the app, then no transition runs.

## INVEST Notes

Each story states its own starting condition in its criteria, so it can be tested on its own, with test data setting up what it needs. "Depends on: none" means the story can be tested alone. Build order comes later, at Units Generation. Stories are small enough to fit one build slice, and the criteria are written for browser and unit tests.

## Requirements Without a Story

These apply to the whole app, so they are checked later rather than in one story. NFR3 (mockup match) and NFR4 (360 px and 1024 px widths) are set at Refined Mockups and checked by each Unit's mockup-match tests. NFR9 (browsers) and NFR10 (ports and database settings) are checked at Build and Test.

## Assumptions & Open Questions

- Stories are grouped by journey; the build slices come at Units Generation.
- The one-command start story is written for staff.
- No questions were asked.
