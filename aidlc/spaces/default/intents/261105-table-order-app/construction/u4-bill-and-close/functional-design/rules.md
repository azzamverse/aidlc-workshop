# Rules: u4-bill-and-close

```yaml
rules:
  - id: BR1.1
    statement: The bill lists each non-cancelled order of the current visit with its number, items, quantities, prices and subtotal.
    category: calculation
    applies_to: Bill
    trigger: GET /api/tables/:id/bill
    logic: read the current visit's orders and leave out Cancelled ones, oldest first; IF the table is unknown THEN 404 TABLE_NOT_FOUND
    violation: not applicable
    source: FR9.1, FR9.2, FR9.4
  - id: BR1.2
    statement: The table total is the exact sum of the listed orders' subtotals in whole cents, including orders still open.
    category: calculation
    applies_to: Bill
    trigger: bill read
    logic: totalCents = sum(order.totalCents) over the listed orders
    violation: not applicable
    source: FR9.3
  - id: BR1.3
    statement: Pending and Preparing orders are named as still open.
    category: policy
    applies_to: Bill
    trigger: bill read
    logic: openOrders lists them; the screen shows "Still open: #12 Preparing, #15 Pending. The table can be closed once these are finished."
    violation: not applicable
    source: FR9.5
  - id: BR1.4
    statement: A table with no orders, or no current visit, shows "No orders for this table" and a total of $0.00, and reading a bill never starts a visit.
    category: constraint
    applies_to: Bill
    trigger: bill read
    logic: IF there is no current visit THEN an empty bill with canClose false; use getCurrentVisit only
    violation: not applicable
    source: FR9.6
  - id: BR2.1
    statement: A close succeeds only when the current visit has orders and none is open.
    category: validation
    applies_to: Close
    trigger: POST /api/tables/:id/close
    logic: first, IF the table is unknown THEN 404 TABLE_NOT_FOUND; then inside one transaction, IF any order is Pending or Preparing, or the visit has no orders THEN 409 TABLE_NOT_READY and nothing changes; IF all orders are Cancelled THEN it closes with a total of zero
    violation: 409 TABLE_NOT_READY
    source: FR10.1, FR10.2
  - id: BR2.2
    statement: A close archives the visit and publishes table.closed in one transaction, the event being sent only after it commits.
    category: constraint
    applies_to: Close
    trigger: close accepted
    logic: withTransaction runs archiveVisit and publishEvent with tableId and visitId, all synchronous
    violation: a failure rolls back both and answers 500 with a log line
    source: FR10.3, FR10.7, NFR11
  - id: BR2.3
    statement: Closing a table with no current visit changes nothing and answers success.
    category: policy
    applies_to: Close
    trigger: repeat close
    logic: IF no current visit THEN 200 { closed true } and no event
    violation: not applicable
    source: FR10.6
  - id: BR2.4
    statement: Archived visits appear on no screen.
    category: constraint
    applies_to: Bill
    trigger: bill read
    logic: only the current visit is read
    violation: not applicable
    source: FR10.4
  - id: BR3.1
    statement: The Table Bill screen shows skeletons, then the bill, or an error with Try again, and "Close table" is available only when canClose is true.
    category: policy
    applies_to: Table Bill screen
    trigger: screen opened
    logic: use the mockup's words; "We couldn't load this bill. Please try again."; an unknown table shows "Table not found"; the Close table button uses aria-disabled while unavailable, with the reason beside it; each order shows its status as a word and an icon; no transition runs under reduced motion; every action works by keyboard
    violation: not applicable
    source: FR9.1, FR10.1, FR10.2, NFR6
  - id: BR3.2
    statement: The open bill stays current without a refresh.
    category: policy
    applies_to: Table Bill screen
    trigger: order.placed, order.updated, table.closed, resync, new connection
    logic: read the bill again, the newest read winning; while the stream is down show "Reconnecting…"
    violation: not applicable
    source: NFR1
  - id: BR3.3
    statement: After a close the screen shows "Table 5 closed. It's ready for the next diner." and returns to the board.
    category: policy
    applies_to: Table Bill screen
    trigger: close succeeded
    logic: show the message on the bill screen in place of the bill, and move focus to it; it stays until staff press "Back to board", as a timed page change would fail NFR6; the board's code does not change; a close with no answer says "We couldn't confirm the close. The bill below shows where it stands." and reads the bill again; a refused close shows the server's message and reads the bill again; any other failure shows "We couldn't close this table. Please try again."
    violation: not applicable
    source: FR10.3, FR10.6, NFR11
```

## Summary

| Group | Covers |
|---|---|
| BR1 | The bill calculation |
| BR2 | The close rule and the table-closed event |
| BR3 | The Table Bill screen |
