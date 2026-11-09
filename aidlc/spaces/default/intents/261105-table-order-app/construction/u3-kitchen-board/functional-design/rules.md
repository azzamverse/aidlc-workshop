# Rules: u3-kitchen-board

Screen rules for the staff board. The server rules belong to U1. Words on screen come from the refined mockups.

```yaml
rules:
  - id: BR1.1
    statement: The board opens with no login and shows all 10 tables, each empty table saying "No orders", and each table linking to its bill with "Open bill".
    category: policy
    applies_to: Kitchen Board
    trigger: board loaded
    logic: read GET /api/tables, which starts no visit; show skeleton cards while reading, and an error with Try again on failure, never an empty board
    violation: not applicable
    source: FR6.4, FR11.1
  - id: BR1.2
    statement: Each order shows its number, items, quantities and status, with the status as a word and an icon.
    category: constraint
    applies_to: Kitchen Board
    trigger: rendering
    logic: use the same status words and icons as the mockup, as plain text, newest first on each table; a Cancelled order stays on the board with its word and icon (FR5.3); at 1024 px wide the board has 3 columns with no horizontal scroll or clipped controls (NFR4)
    violation: not applicable
    source: FR6.3, NFR5, NFR6
  - id: BR2.1
    statement: Placed and updated orders appear within 2 seconds with no refresh.
    category: policy
    applies_to: Kitchen Board
    trigger: order.placed, order.updated
    logic: replace the order with the same id or add it to its table; a replayed event never moves an order back to an earlier status
    violation: not applicable
    source: FR6.1
  - id: BR2.2
    statement: Every Pending order is highlighted with "★ New" until it moves to Preparing or is cancelled.
    category: calculation
    applies_to: Kitchen Board
    trigger: rendering
    logic: highlighted = status is Pending; nothing is stored on the device, so every staff screen and a refresh agree
    violation: not applicable
    source: FR6.2, functional-design-questions.md Q1
  - id: BR2.3
    statement: The board reconnects by itself and catches up, saying "Reconnecting… the board will catch up by itself." while down.
    category: policy
    applies_to: Kitchen Board
    trigger: connection lost or regained, resync
    logic: IF the stream drops THEN show the notice, and U1's indicator changes from "● Live" to "↻ Reconnecting…"; on each connection or resync THEN reload the board. A reload that started before a live event never overwrites that event
    violation: not applicable
    source: FR6.5
  - id: BR2.4
    statement: A closed table empties on the board.
    category: policy
    applies_to: Kitchen Board
    trigger: table.closed
    logic: reload the board, or clear that table's orders if the reload fails
    violation: not applicable
    source: FR10.3, FR10.4
  - id: BR3.1
    statement: Pending offers "Start preparing", Preparing offers "Mark completed", and Completed and Cancelled offer nothing.
    category: constraint
    applies_to: Kitchen Board
    trigger: rendering
    logic: the only move offered is one step forward, disabled while its request is running, sent with its from and to statuses
    violation: the server refuses any other move
    source: FR7.1, FR7.2
  - id: BR3.2
    statement: A refused move shows the current status and says what happened.
    category: policy
    applies_to: Kitchen Board
    trigger: ORDER_STATE_CONFLICT
    logic: apply currentStatus to the order; IF Cancelled THEN "Order #N was just cancelled by the diner, so it can't be moved on."; otherwise "Order #N is already <status>, so it can't be moved on."
    violation: not applicable
    source: FR7.3
  - id: BR3.3
    statement: Any other failed move leaves the order as it was and says so.
    category: policy
    applies_to: Kitchen Board
    trigger: no answer or other refusal
    logic: show "We couldn't update Order #N. Please try again."
    violation: not applicable
    source: NFR11
  - id: BR4.1
    statement: The "Menu availability" panel lists all 12 items, each with a Sold out switch showing its saved mark.
    category: policy
    applies_to: Availability panel
    trigger: panel opened
    logic: read GET /api/menu; show an error with Try again on failure; live menu.item-updated events keep switches current, and while open the panel reads the menu again on each new connection and on resync
    violation: not applicable
    source: FR8.1
  - id: BR4.2
    statement: A switch saves the mark through the server and shows the saved result.
    category: policy
    applies_to: Availability panel
    trigger: switch changed
    logic: disable it while saving; on success show the returned mark; on failure return to the earlier mark and show "We couldn't save that change. Please try again."
    violation: not applicable
    source: FR8.1, FR8.2, NFR11
  - id: BR5.1
    statement: Everything works by keyboard, with no colour-only signal.
    category: constraint
    applies_to: all U3 screens
    trigger: use
    logic: real buttons, links and checkboxes; Space toggles a switch; Escape or Close dismisses the panel; focus moves into the panel and returns to its button
    violation: not applicable
    source: NFR6
  - id: BR5.2
    statement: Under reduced motion no transition runs.
    category: constraint
    applies_to: all U3 screens
    trigger: prefers-reduced-motion
    logic: IF the device asks for it THEN use no animation
    violation: not applicable
    source: NFR7
```

## Summary

| Group | Covers |
|---|---|
| BR1 | Opening the board and showing orders |
| BR2 | Live updates, the highlight, reconnecting and closed tables |
| BR3 | Moving orders and refusals |
| BR4 | The Menu availability panel |
| BR5 | Keyboard and reduced motion |
