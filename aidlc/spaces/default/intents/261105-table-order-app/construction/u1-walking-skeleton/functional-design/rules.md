# Business Rules: u1-walking-skeleton

From `requirements.md`, `stories.md` and `contract-summary.md`.

```yaml
rules:
  - { id: BR1.1, statement: The menu is served in category and item order, category: policy, applies_to: Menu, trigger: menu read, logic: "return every category by position, each with its items by position", violation: none, source: FR1.1 }
  - { id: BR1.2, statement: Each item carries its name, price, description, image and sold-out mark, category: constraint, applies_to: MenuItem, trigger: menu read, logic: "IF an item is served THEN all five are present", violation: none, source: FR1.2 }
  - { id: BR1.3, statement: A failed menu read returns the shared error shape, category: policy, applies_to: Menu, trigger: read failure, logic: "IF the read fails THEN return an error, never an empty menu", violation: "500 with a safe message, logged", source: FR1.4 }
  - { id: BR1.4, statement: Staff can set an item's sold-out mark, category: policy, applies_to: MenuItem, trigger: sold-out request, logic: "store the mark, then publish menu.item-updated after commit", violation: "404 ITEM_NOT_FOUND", source: "FR8.1, FR8.2" }
  - { id: BR2.1, statement: An order must be valid, category: validation, applies_to: Order, trigger: placement, logic: "IF lines are empty OR an item is unknown OR a quantity is outside 1 to 20 THEN refuse and store nothing", violation: "400 VALIDATION_FAILED", source: "FR3.6, NFR5" }
  - { id: BR2.2, statement: An order for an unknown table is refused, category: validation, applies_to: Order, trigger: placement, logic: "IF the table is not one of the 10 THEN refuse", violation: "404 TABLE_NOT_FOUND", source: FR12.1 }
  - { id: BR2.3, statement: An order must carry the current visit, category: constraint, applies_to: Order, trigger: placement, logic: "IF visitId is not the table's Open visit THEN refuse", violation: "409 TABLE_CLOSED", source: "FR10.5, FR10.7" }
  - { id: BR2.4, statement: A sold-out item stops the whole placement, category: constraint, applies_to: Order, trigger: placement, logic: "IF any line's item is sold out THEN create no order and name the items", violation: "409 ITEM_SOLD_OUT with soldOutItemIds", source: FR3.3 }
  - { id: BR2.5, statement: A repeated placement key returns the first order, category: constraint, applies_to: Order, trigger: placement, logic: "IF the placementKey exists THEN return its order with 200 and publish nothing", violation: none, source: FR3.4 }
  - { id: BR2.6, statement: Order numbers are unique across the restaurant, category: calculation, applies_to: Order, trigger: placement, logic: "number = highest number so far + 1, inside the transaction", violation: none, source: FR3.2 }
  - { id: BR2.7, statement: Placing is all or nothing, category: constraint, applies_to: Order, trigger: placement, logic: "write the order and lines in one transaction, then publish order.placed after commit", violation: "500 with a safe message, logged; nothing stored", source: "FR3.1, FR3.5, NFR2, NFR11" }
  - { id: BR3.1, statement: A diner can cancel only a Pending order of their table's current visit, category: authorization, applies_to: Order, trigger: cancel, logic: "IF the order is not in this table's Open visit THEN not found; IF not Pending THEN conflict", violation: "404 ORDER_NOT_FOUND or 409 ORDER_STATE_CONFLICT with current status", source: "FR5.1, FR5.2" }
  - { id: BR3.2, statement: Status moves one step forward, category: constraint, applies_to: Order, trigger: status change, logic: "allowed moves are Pending to Preparing and Preparing to Completed", violation: "400 VALIDATION_FAILED", source: "FR7.1, FR7.2" }
  - { id: BR3.3, statement: The first change to arrive wins, category: constraint, applies_to: Order, trigger: cancel or status change, logic: "apply only IF the order is still in the expected status", violation: "409 ORDER_STATE_CONFLICT with current status", source: "FR5.2, FR7.3" }
  - { id: BR3.4, statement: Every status change is published after commit, category: policy, applies_to: Order, trigger: successful change, logic: "publish order.updated", violation: none, source: "FR4.2, FR5.3, NFR1" }
  - { id: BR4.1, statement: Opening a table starts its visit when it has none, category: policy, applies_to: Visit, trigger: table read by a diner screen, logic: "IF no Open visit THEN start one; return the visit id", violation: "404 TABLE_NOT_FOUND", source: "FR12.1, FR12.2" }
  - { id: BR4.2, statement: Visit reads for the diner show the whole table's current orders, category: policy, applies_to: Order, trigger: orders read, logic: "return the Open visit's orders, newest first; none is an empty list", violation: "404 TABLE_NOT_FOUND", source: "FR4.1, FR4.3" }
  - { id: BR4.3, statement: The board read lists all 10 tables without starting visits, category: policy, applies_to: Table, trigger: board read, logic: "return every table with its Open visit's orders, or none", violation: none, source: "FR6.1, FR6.3, FR6.4, FR11.1" }
  - { id: BR4.4, statement: U1 can archive a visit for U4, category: policy, applies_to: Visit, trigger: archive call, logic: "mark it Closed with closedAt, inside the caller's transaction", violation: "error returned to the caller", source: FR10.3 }
  - { id: BR5.1, statement: Events are numbered and replayed, category: policy, applies_to: LiveEvent, trigger: publish or reconnect, logic: "send missed events after Last-Event-ID; IF older than one hour are needed THEN send resync", violation: none, source: "FR4.4, FR6.5" }
  - { id: BR5.2, statement: A table's stream carries its events and all menu events, category: policy, applies_to: LiveEvent, trigger: subscribe, logic: "filter by tableId when given, always including events with no table", violation: none, source: "FR4.2, FR8.2" }
  - { id: BR5.3, statement: Changes reach open screens within 2 seconds, category: constraint, applies_to: LiveEvent, trigger: publish, logic: "send immediately on commit", violation: "timed browser test fails", source: NFR1 }
  - { id: BR6.1, statement: The first run seeds once, category: policy, applies_to: Platform, trigger: start, logic: "IF there are no tables THEN create 10 tables, 4 categories and 12 items; ELSE change nothing", violation: "start fails with a clear message", source: "FR13.2, FR13.3" }
  - { id: BR6.2, statement: One command starts the app from settings, category: policy, applies_to: Platform, trigger: npm start, logic: "read PORT and DB_FILE, defaulting to 3000 and a local file; serve screens from any folder", violation: "start fails naming the bad setting", source: "FR13.1, NFR10" }
  - { id: BR6.3, statement: Data survives a restart, category: constraint, applies_to: Platform, trigger: restart, logic: "all writes are transactions in the database file", violation: none, source: NFR2 }
  - { id: BR6.4, statement: Text stays plain, category: validation, applies_to: all screens, trigger: display, logic: "show text as text, never as markup", violation: none, source: NFR5 }
  - { id: BR7.1, statement: U1 gives U4 its shared server calls, category: policy, applies_to: Platform and Tables, trigger: U4 close, logic: "provide withTransaction, getCurrentVisit, listVisitOrders, archiveVisit and publishEvent; events queued in a transaction are sent only after it commits and dropped if it rolls back", violation: "error returned to the caller", source: "NFR2, FR10.3" }
  - { id: BR7.2, statement: The server route list has a marked slot for U4, category: policy, applies_to: Platform, trigger: start, logic: "U4 registers its routes in the slot and edits nothing else", violation: none, source: FR10.3 }
  - { id: BR7.3, statement: Every screen address serves the app, category: policy, applies_to: Platform, trigger: page request, logic: "/table/:id, /table/:id/cart, /table/:id/orders, /staff and /staff/tables/:id all serve the shell using the sendFile root form", violation: none, source: "FR12.2, NFR10" }
  - { id: BR7.4, statement: Status checks run in a fixed order, category: validation, applies_to: Order, trigger: status change, logic: "first refuse a move that is not one step forward with 400, then refuse a stale from with 409", violation: "400 VALIDATION_FAILED or 409 ORDER_STATE_CONFLICT", source: FR7.2 }
  - { id: BR7.5, statement: The stream stays healthy, category: policy, applies_to: LiveEvent, trigger: timer, logic: "send a keep-alive every 25 seconds; delete events older than one hour on start and on each hour", violation: "failure is logged", source: "FR4.4, NFR11" }
  - { id: BR7.6, statement: Placement fields are required and a key belongs to its table, category: validation, applies_to: Order, trigger: placement, logic: "IF visitId or placementKey is missing THEN refuse; a repeated key returns the order only for the same table, otherwise refuse", violation: "400 VALIDATION_FAILED", source: "FR3.4, FR3.6" }
  - { id: BR7.7, statement: The seed runs as one transaction, category: constraint, applies_to: Platform, trigger: first start, logic: "all seed rows or none", violation: "start fails with a clear message", source: "FR13.2, NFR2" }
  - { id: BR7.8, statement: A test-only route publishes table.closed, category: policy, applies_to: LiveUpdates, trigger: POST /api/test/events, logic: "the route exists only when NODE_ENV=test", violation: "404 otherwise", source: FR10.7 }
```

## Rules Summary

| Group | Rules | Covers |
|---|---|---|
| BR1 | Menu reads and sold-out marks | FR1, FR8 |
| BR2 | Placing an order | FR3 |
| BR3 | Status and cancelling | FR5, FR7 |
| BR4 | Tables and visits | FR4, FR6, FR10.3, FR12 |
| BR5 | Live events | FR4.4, FR6.5, NFR1 |
| BR6 | Start-up and data | FR13, NFR2, NFR10 |

BR7 covers the shared calls and addresses other Units build on (C4, C5) and technical safeguards. The API's Order shape adds `tableId` and `totalCents`, worked out from the visit and lines rather than stored.

## Assumptions & Open Questions

No questions were asked for this Unit. These technical choices take the safe default:

- `DB_FILE` defaults to `data/table-order.db`.
- A new table's first read starts its visit, even if nobody orders.
- The first-to-arrive check uses the single SQLite writer.
