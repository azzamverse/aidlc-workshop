# Contract Summary: Table Order

Contracts between the Units in `unit-of-work.md`, following the edges in `unit-of-work-dependency.md`, the entities in `components.md` and the rules in `requirements.md`. There is no public API: the only consumers are the app's own screens. No questions were asked at this stage.

## Contracts

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| C1 | U1 `u1-walking-skeleton` | U2, U3 | Synchronous HTTP with JSON | U1 |
| C2 | U1 `u1-walking-skeleton` | U2, U3, U4 | Server-Sent Events | U1 |
| C3 | U4 `u4-bill-and-close` | U3 (link), U4's screen | Synchronous HTTP with JSON | U4 |
| C4 | U1 `u1-walking-skeleton` | U4 | Shared code in the one server | U1 |
| C5 | U1 `u1-walking-skeleton` | U2, U3, U4 | Screen addresses | U1 |

## Shared Rules

- Money is a whole number of cents in JSON.
- Every error has one shape: `{ "error": { "code": "...", "message": "..." } }`. `message` is safe to show.
- Each request has a 5-second timeout on the screen. A failed read offers Try again.
- Only placing an order is retried automatically, and it is safe to retry because of its placement key.

## C1: Order API

```yaml
openapi: 3.0.3
info: { title: Table Order API, version: 1.0.0 }
paths:
  /api/menu:
    get:
      summary: Categories in order, each with its items
      responses:
        '200':
          description: "{ categories: [{ id, name, items: [{ id, name, description, priceCents, image, soldOut }] }] }"
  /api/menu/items/{itemId}/sold-out:
    put:
      summary: Set an item's sold-out mark. Body { soldOut }
      responses:
        '200': { description: The item }
        '404': { description: ITEM_NOT_FOUND }
  /api/tables:
    get:
      summary: All 10 tables with their current orders, for the board
      responses:
        '200':
          description: "{ tables: [{ id, label, visitId, orders: [Order] }] }"
  /api/tables/{tableId}:
    get:
      summary: The table and its current visit, starting one if it has none
      responses:
        '200': { description: "{ id, label, visitId }" }
        '404': { description: TABLE_NOT_FOUND }
  /api/tables/{tableId}/orders:
    get:
      summary: The current visit's orders
      responses:
        '200': { description: "{ orders: [Order] }" }
        '404': { description: TABLE_NOT_FOUND }
    post:
      summary: Place an order. Retrying with the same placementKey returns the first order
      requestBody:
        description: "{ visitId, placementKey, lines: [{ itemId, quantity }] }"
      responses:
        '201': { description: The Order }
        '200': { description: The Order, when this placementKey was already used }
        '400': { description: "VALIDATION_FAILED: empty lines, unknown item or quantity outside 1 to 20" }
        '404': { description: TABLE_NOT_FOUND }
        '409': { description: "ITEM_SOLD_OUT with soldOutItemIds, or TABLE_CLOSED when visitId is not current" }
  /api/tables/{tableId}/orders/{orderId}/cancel:
    post:
      summary: Cancel a Pending order of this table's current visit
      responses:
        '200': { description: The Order }
        '404': { description: ORDER_NOT_FOUND }
        '409': { description: ORDER_STATE_CONFLICT with the current status }
  /api/orders/{orderId}/status:
    put:
      summary: Move an order one step. Body { from, to }
      responses:
        '200': { description: The Order }
        '400': { description: VALIDATION_FAILED for a move that isn't one step forward }
        '404': { description: ORDER_NOT_FOUND }
        '409': { description: ORDER_STATE_CONFLICT with the current status }
components:
  schemas:
    Order:
      description: "{ id, number, tableId, visitId, status, placedAt, totalCents, lines: [{ name, quantity, unitPriceCents }] }"
      status: [Pending, Preparing, Completed, Cancelled]
```

## C2: Live Events

```yaml
asyncapi: 2.6.0
info: { title: Table Order live events, version: 1.0.0 }
channels:
  /api/events:
    description: >
      Server-Sent Events. The optional tableId query narrows the stream to that table's events plus events with no table.
      Each event's SSE id is its sequence. On reconnect the browser sends Last-Event-ID and missed events are replayed.
      If they are older than one hour, a resync event tells the screen to reload its data.
    subscribe:
      message:
        oneOf:
          - name: order.placed
            payload: "{ sequence, tableId, order: Order }"
          - name: order.updated
            payload: "{ sequence, tableId, order: Order }"
          - name: menu.item-updated
            payload: "{ sequence, tableId: null, item: { id, soldOut } }"
          - name: table.closed
            payload: "{ sequence, tableId, visitId }"
          - name: resync
            payload: "{ sequence }"
```

Events are sent only after their change commits. U2 and U3 can be built and tested before U4, because `table.closed` is fixed here and U1 provides a test-only route to publish it, `POST /api/test/events` with body `{ type, tableId, visitId }`, which exists only when `NODE_ENV=test`.

`GET /api/tables/{tableId}` starts a visit when the table has none, so only the diner screens (U2) call it. The board uses `GET /api/tables` and the bill uses C3, neither of which starts a visit.

Cancelling an order that belongs to another table or to an archived visit returns `ORDER_NOT_FOUND`.

## C3: Bill and Close

```yaml
openapi: 3.0.3
info: { title: Table Order billing, version: 1.0.0 }
paths:
  /api/tables/{tableId}/bill:
    get:
      summary: The current visit's bill
      responses:
        '200':
          description: "{ tableId, orders: [Order without Cancelled], openOrders: [{ number, status }], totalCents, canClose }"
        '404': { description: TABLE_NOT_FOUND }
  /api/tables/{tableId}/close:
    post:
      summary: Archive the visit and publish table.closed. A repeat close changes nothing
      responses:
        '200': { description: "{ closed: true }" }
        '404': { description: TABLE_NOT_FOUND }
        '409': { description: "TABLE_NOT_READY: open orders remain, or the table has no orders" }
```

A table with no current visit returns an empty bill and `canClose: false`. Reading a bill does not start a visit.

Close outcomes: a current visit with finished orders closes (200). A current visit with open orders or no orders is refused (409). A table with no current visit, as after an earlier close, changes nothing and returns 200, which makes a repeat close safe.

## C4: Server Code U1 Gives U4

```yaml
shared-schema:
  provider: u1-walking-skeleton
  consumer: u4-bill-and-close
  functions:
    - withTransaction(work): runs work in one database transaction, then publishes its events after commit
    - getCurrentVisit(tableId): the visit, or none, without starting one
    - listVisitOrders(visitId): the Orders of a visit
    - archiveVisit(visitId): marks the visit closed and leaves the table with no current visit
    - publishEvent(event): queues an event for after the commit
  route_slot: U4 registers its routes in the marked slot of U1's route list
```

## C5: Screen Addresses

```yaml
shared-schema:
  provider: u1-walking-skeleton
  routes:
    /table/:id: Menu (U2)
    /table/:id/cart: Cart (U2)
    /table/:id/orders: My Orders (U2)
    /staff: Kitchen Board (U3)
    /staff/tables/:id: Table Bill (U4)
```

## Contract Ownership Rules

- U1 owns C1, C2, C4 and C5; U4 owns C3.
- Changes are additive: new fields and new event types may be added, and consumers ignore what they don't know.
- A breaking change is agreed at an approval point and written here before any code changes.

## Open Questions

| Contract | Question | Blocks |
|---|---|---|
| None | None | None |

## Assumptions & Open Questions

None.
