# API Documentation

Base path `/api`. JSON bodies, 100 kB limit. No route has authentication, authorization or rate limiting. Defined in `server/app.js`.

## Error Shape

Every error is `{ "error": { "code", "message", ...details } }` (`server/platform/errors.js`).

| Status | Code | Extra field | Raised by |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | none | Bad input, malformed JSON, malformed address |
| 404 | `TABLE_NOT_FOUND` | none | Table id is not digits or does not exist |
| 404 | `ORDER_NOT_FOUND` | none | Unknown order, or cancel from another table or an archived visit |
| 404 | `ITEM_NOT_FOUND` | none | Unknown menu item on sold-out |
| 404 | `NOT_FOUND` | none | Unknown `/api` address |
| 409 | `TABLE_CLOSED` | none | Placing against a visit that is not the open one |
| 409 | `ITEM_SOLD_OUT` | `soldOutItemIds` | Placing with a sold-out item |
| 409 | `ORDER_STATE_CONFLICT` | `currentStatus` | Stale move or cancel |
| 409 | `TABLE_NOT_READY` | none | Close with open orders or no orders |
| 409 | `VISIT_NOT_OPEN` | none | `archiveVisit` on a visit not open (internal) |
| 500 | `INTERNAL_ERROR` | none | Anything else; message is generic, the detail is logged |

## Shapes

```text
MenuItem  { id, name, description, priceCents, image, soldOut }
Order     { id, number, tableId, visitId, status, placedAt, totalCents, lines: [Line] }
Line      { name, quantity, unitPriceCents }
```

## REST Endpoints

| Method and path | Request | Success | Used by | Audience |
|---|---|---|---|---|
| `GET /menu` | none | 200 `{ categories: [{ id, name, items: [MenuItem] }] }` | MenuScreen, AvailabilityPanel | Both |
| `PUT /menu/items/:itemId/sold-out` | `{ soldOut: boolean }` | 200 MenuItem | AvailabilityPanel | **Staff** |
| `GET /tables` | none | 200 `{ tables: [{ id, label, visitId, orders: [Order] }] }`; starts no visit | KitchenBoardScreen **and diner `checkVisit`** | **Both** |
| `GET /tables/:tableId` | none | 200 `{ id, label, visitId }`; **starts a visit if none is open** | DinerFrame | Diner |
| `GET /tables/:tableId/orders` | none | 200 `{ orders: [Order] }` newest first | MyOrdersScreen | Diner |
| `POST /tables/:tableId/orders` | `{ visitId, placementKey (max 200), lines: [{ itemId, quantity 1 to 20 }] }` | 201 Order, or 200 for a repeated key | CartScreen | Diner |
| `POST /tables/:tableId/orders/:orderId/cancel` | none | 200 Order | MyOrdersScreen | Diner |
| `PUT /orders/:orderId/status` | `{ from, to }`, one step forward | 200 Order | KitchenBoardScreen | **Staff** |
| `GET /tables/:tableId/bill` | none | 200 `{ tableId, orders (oldest first, no Cancelled), openOrders: [{ number, status }], totalCents, canClose }`; starts no visit | TableBillScreen | **Staff** |
| `POST /tables/:tableId/close` | none | 200 `{ closed: true }`, repeat safe | TableBillScreen | **Staff** |

Test mode only (`NODE_ENV=test`): `POST /test/events` with `{ type: 'table.closed', tableId, visitId }` gives 201 `{ sequence }`. Any other type gives 400.

## Live Event Stream

`GET /api/events?tableId=<id>`. Omitting `tableId` gets the whole restaurant. An unknown table gets a 404 before the stream opens.

Frame: `id: <sequence>`, `event: <type>`, `data: { sequence, tableId, ...payload }`. A first connection gets a bare `id:` frame carrying the latest sequence. A keep-alive comment goes out every 25 seconds.

| Event | `tableId` | Payload |
|---|---|---|
| `order.placed` | the table | `order` (Order) |
| `order.updated` | the table | `order` (Order) |
| `menu.item-updated` | `null` (all clients) | `item: { id, soldOut }` |
| `table.closed` | the table | `visitId` |
| `resync` (not stored) | not sent | `{ sequence }` only: "reload, I cannot replay" |

A client stream with a `tableId` gets its own table's events and events with no table. Replay comes from `live_events` for one hour. **Adding a new type also requires adding it to `EVENT_TYPES` in `client/src/shared/live.js:3`.**

Who listens: all three diner screens (table stream, through `useDinerSession`), the board (whole restaurant), the bill (table stream).

## Internal Contract: `shared` (C4)

`server/context.js:38-44`, consumed by `server/billing/service.js`: `withTransaction`, `getCurrentVisit(tableId)`, `listVisitOrders(visitId)`, `archiveVisit(visitId)`, `publishEvent(event)`.

## Screen Addresses (C5)

`/table/:id`, `/table/:id/cart`, `/table/:id/orders`, `/staff`, `/staff/tables/:id`. `/` redirects to `/staff`. Any other non-API address gets Express's default 404. The list is in `server/app.js:6-12` and repeated in `client/src/App.jsx`.

## What Staff PIN Must Cover

If the PIN is to protect the data and not only hide the pages:

| Route | Situation |
|---|---|
| `PUT /menu/items/:id/sold-out`, `PUT /orders/:id/status`, `GET /tables/:id/bill`, `POST /tables/:id/close` | Staff only; straightforward to protect |
| `GET /tables` | Diners use it for the visit check. Locking it needs a new diner-safe read, and changes `useDinerSession.js:61` |
| `GET /events` (no `tableId`) | Whole-restaurant stream used by the board. `EventSource` cannot send a header. A diner can also simply omit `tableId` today |
| `GET /menu` | Both; stays open |
| Page addresses `/staff`, `/staff/tables/:id` | Client gate in `StaffFrame`, or server gate before `sendFile` |

No cookie helper is installed; Express's `res.cookie` writes cookies, but reading one needs manual parsing or a new dependency.

## Tests That Call Staff Routes or Open Staff Pages

**Open a staff page in a browser**

- `e2e/u1-walking-skeleton/skeleton.spec.ts` (lines 19, 60, 67, 116, 125)
- `e2e/u1-walking-skeleton/mockup-match.spec.ts` (137, 147)
- `e2e/u3-kitchen-board/helpers.ts:93` (`openBoardLive`, used by `board.spec.ts`, `moves.spec.ts`, `availability.spec.ts`, `mockup-match.spec.ts`), and `board.spec.ts:30` directly
- `e2e/u4-bill-and-close/bill.spec.ts` (every test), `close.spec.ts` (every test except the offline-device test at line 118; line 101 also opens the board), `mockup-match.spec.ts` (60, 79, 91, 102)
- `e2e/build-and-test/keyboard-journey.spec.ts` (41, 50)

**Call staff APIs without a browser**

- `moveByApi`: `e2e/u2-diner-screens/helpers.ts:93`, `e2e/u3-kitchen-board/helpers.ts:69`, `e2e/u4-bill-and-close/helpers.ts:20`
- `setSoldOut`: `e2e/u2-diner-screens/helpers.ts:98`, `e2e/u3-kitchen-board/helpers.ts:79`
- `resetTable` calls `POST /close` before every test in U4 (`e2e/u4-bill-and-close/helpers.ts:44`)
- `tests/server/api.test.js` and `tests/server/billing-api.test.js` through supertest

**Asserts there is no PIN**

- `e2e/u3-kitchen-board/board.spec.ts:11`, titled "opens with no login".

**Unaffected by a route-level gate**

- Service-level tests (`tests/server/{ordering,menu,tables,billing,live}.test.js`) call services directly.

Hooks that exist for giving tests a way past a PIN: `webServer.env` in `playwright.config.ts`, the `NODE_ENV=test` mode, and the four places tests spawn their own server (all pass `...process.env`).
