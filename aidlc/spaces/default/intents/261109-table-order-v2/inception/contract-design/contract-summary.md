# Contract Summary: Table Order v2

Contracts between the Units in `unit-of-work.md`, along the edges in `unit-of-work-dependency.md`, using the entities in `components.md` and the rules in `requirements.md`. No external consumers exist, because the app runs locally.

## Contracts

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| C10 | U5 | U6, U7 | Shared server seams | U5 |
| C11 | U5 | U6, U7 | REST: menu with details, diner table read, session | U5 |
| C12 | U5 | U6, U7 | Server-Sent Events: event registry and stream scope | U5 |
| C13 | U5 | U6, U7 | Shared client modules | U5 |
| C14 | U5 | U7 | Screen slots | U5 |
| C15 | U6 | U6 screens | REST and events: options, requests, estimates | U6 |
| C16 | U7 | U7 screens | REST and events: bottle spin | U7 |

## C10: Shared Server Seams

U5 changes the shared files once, so U6 and U7 never edit them. U5 creates `server/features/u6.js` and `server/features/u7.js` as empty modules, and `server/app.js` registers both. Each exports `registerRoutes(app, context)`, and `migrations()` returning its own list of add-only SQL steps.

```yaml
shared-schema:
  owner: u5-foundation
  doNotEditInU6OrU7:
    - server/app.js
    - server/context.js
    - server/platform/db.js
    - client/src/App.jsx
    - client/src/shared/live.js
    - client/src/shared/styles.css
  featureModule:
    path: server/features/<unit>.js
    exports:
      registerRoutes: (app, context) => void
      migrations: () => [{ id: string, sql: string }]
  upgrade:
    owner: u5-foundation
    table: schema_upgrades
    columns: [id, applied_at]
    order: U5 steps, then U6 steps, then U7 steps
    rerunSafe: a step whose id is recorded is skipped
```

## C11: REST From U5

Staff-only routes need the session cookie, or answer 401. Staff-only: `GET /api/tables`, `GET /api/tables/:id/bill`, `POST /api/tables/:id/close`, `PUT /api/orders/:id/status`, `PUT /api/menu/items/:id/sold-out`, and the all-tables stream. `GET /api/tables/:id/orders` stays open because it serves one table only.

```yaml
openapi: 3.0.3
info: { title: Table Order v2 foundation, version: 2.0.0 }
paths:
  /api/staff/session:
    post:
      summary: Enter the PIN
      requestBody: { content: { application/json: { schema: { type: object, required: [pin], properties: { pin: { type: string } } } } } }
      responses:
        '204': { description: Session cookie set, HttpOnly, no expiry so it ends with the browser }
        '401': { description: Wrong PIN, code PIN_WRONG }
        '429': { description: Locked out for 30 seconds, code PIN_LOCKED }
    get:
      summary: Is there a session
      responses: { '204': { description: Yes }, '401': { description: No } }
  /api/tables/{tableId}/visit:
    get:
      summary: This table's current visit, for the diner, starts no visit
      responses: { '200': { description: "{ id, label, visitId }; visitId is null when none is open" }, '404': { description: Unknown table } }
  /api/menu:
    get:
      summary: v1 shape, each item gains allergens, mood and optionGroups
      responses: { '200': { description: "item adds allergens: string[], mood: string, optionGroups: [{ id, name, kind: one|any, options: [{ id, name, priceDeltaCents, isDefault }] }]" } }
```

The lockout counter resets on server start. A test-only route to reset it exists only when `NODE_ENV` is `test`, like v1's existing test-only route.

## C12: Live Events

U5's event registry in `client/src/shared/live.js` accepts these names up front, so U6 and U7 don't edit it. A stream with `tableId` gets that table's events and the no-table events below. Only these two event types have no table, and neither carries order or bill data.

```yaml
asyncapi: 2.6.0
info: { title: Table Order v2 events, version: 2.0.0 }
channels:
  /api/events:
    subscribe:
      message:
        oneOf:
          - name: menu.item-updated
            summary: No table. v1 shape, item id and sold-out mark only.
          - name: queue.changed
            summary: No table, empty payload. Tells screens to re-read estimates.
          - name: table-request.updated
            summary: "Table-scoped. { tableId, kind: waiter|bill, status: waiting|responded }"
          - name: spin.started
            summary: "Table-scoped. { tableId, question, seats, resultSeat, startedAt }"
```

## C13: Shared Client Modules

These are built by U5, and used by U6 and U7.

```yaml
shared-schema:
  owner: u5-foundation
  allergyStore:
    path: client/src/shared/allergyStore.js
    storageKey: table-order.allergies
    shape: string[] of allergen ids
    exports: [getAllergies, setAllergies, isUnsafe(item)]
    rule: isUnsafe reads the dish's allergens only, never its options
  cartLines:
    path: client/src/screens/diner/cartStore.js
    lineKey: itemId plus sorted option ids
    exports: [add(item, optionIds = defaults), lineKeyOf]
    v1Carts: lines with no options load with the default choices
```

## C14: Screen Slots

U5 builds the switcher and buttons, and each slot lazily loads a file that U7 replaces. U5 ships each file with a placeholder.

```yaml
shared-schema:
  owner: u5-foundation
  slots:
    - client/src/xfactors/LivingTable.jsx
    - client/src/xfactors/KitchenTheatre.jsx
    - client/src/xfactors/SpinTheBottle.jsx
    - client/src/xfactors/ChefsDice.jsx
  props: "{ table, orders, onAddToCart }"
  u6Mounts:
    - client/src/features/MenuExtras.jsx
    - client/src/features/CartExtras.jsx
    - client/src/features/OrderExtras.jsx
    - client/src/features/BoardExtras.jsx
```

## C15: U6 Routes

```yaml
openapi: 3.0.3
info: { title: Table Order v2 features, version: 2.0.0 }
paths:
  /api/tables/{tableId}/orders:
    post:
      summary: v1 route; each line may add optionIds
      responses: { '400': { description: "Unknown option or two in a pick-one group, code INVALID_OPTIONS" } }
    get:
      summary: Each open order adds estimateMinutes, worked out on each read from placed_at order
  /api/tables/{tableId}/requests:
    get: { summary: This table's waiting requests }
    post:
      summary: "Body { kind: waiter|bill }; repeat is safe"
      responses: { '200': { description: The waiting request }, '409': { description: No open visit } }
  /api/requests:
    get: { summary: All waiting requests, staff only }
  /api/requests/{id}/respond:
    post: { summary: Clears one request, staff only }
```

## C16: U7 Routes

```yaml
openapi: 3.0.3
info: { title: Table Order v2 spin, version: 2.0.0 }
paths:
  /api/tables/{tableId}/spin:
    get: { summary: The current spin or null }
    post:
      summary: "Body { question, seats 2 to 8 }"
      responses: { '201': { description: The spin }, '400': { description: Bad seats or question }, '409': { description: "Already spinning, or no open visit" } }
```

## Contract Ownership Rules

- Each spec is owned by the provider listed in the table.
- U6 and U7 don't edit the shared files in C10. Anything more that they need there goes through U5 first.
- Additive changes are safe, and consumers ignore unknown fields. A field new in v2 is left out when empty, and an order with no options keeps v1's shape.
- A breaking change needs both Units agreed before either builds.

## Build Order Within U5

Server and data first: upgrade step, then menu details, then staff checks and live split. Then shared client modules, seams and slots, which gate U6 and U7. The design system and restyle come last.

## Open Questions

| Contract | Question | Blocks |
|---|---|---|
| None | None | None |

## Assumptions & Open Questions

- U5 grows to include the allergy store and the cart line rule, because Chef's Dice and the Allergy shield both need them.
- `GET /api/tables` becoming staff-only means `useDinerSession` moves to the new diner read, which is a listed change of U5.
