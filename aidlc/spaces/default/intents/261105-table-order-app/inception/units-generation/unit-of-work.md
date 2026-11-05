# Units of Work: Table Order

Groups the components in `components.md`, under the decisions in `decisions.md`, into exactly 4 Units as the team's rules require. It implements `requirements.md` and `stories.md`.

| Unit ID | Directory | Kind | Size | Deployment | Components |
|---|---|---|---|---|---|
| U1 | `u1-walking-skeleton` | service | L | Shared: the one app | Platform, LiveUpdates, Menu, Tables, Ordering, app shell |
| U2 | `u2-diner-screens` | ui | M | Embedded in the one app | DinerApp |
| U3 | `u3-kitchen-board` | ui | M | Embedded in the one app | StaffApp: Kitchen Board and Menu availability panel |
| U4 | `u4-bill-and-close` | service | S | Embedded in the one app | Billing, StaffApp: Table Bill |

One command starts one app: an Express server that serves the React screens, with one SQLite database.

## U1: Walking Skeleton

**Delivers:** everything the other Units share, as the smallest working integrated slice.

- The data model, seed (10 tables, 4 categories, 12 items), settings from `PORT`, `E2E_PORT` and `DB_FILE`, one error shape, logging and transactions.
- The order API: menu reads and sold-out marks, table and visit reads, placing, cancelling and moving orders.
- The live event stream with catch-up.
- The React app shell: routes, the bottom tab bar, the staff frame and shared styles from the mockups' tokens.
- One command, `npm install && npm start`, and the test setup, including Playwright with Chromium.

**End-to-end slice:** a plain page lists the menu and places an order for a table, and a plain staff page shows it arrive live.

**Constraint:** screen routes serve the page with `res.sendFile('index.html', { root: distDir })`, so the server works from any folder.

**Shared seams, so later Units don't edit each other's work:**

- The shell fixes every screen address, including `/staff/tables/:id`, and points each at a placeholder screen file. U2, U3 and U4 each replace only their own screen files, in their own folders.
- The server has one route list with a marked slot for Billing, which U4 fills in.
- U1 exposes the visit archive and the transaction helper that U4's close needs, and tests them directly.

## U2: Diner Screens

**Delivers:** the Menu, Cart and My orders screens with their states, the cart on the device, cancelling, sold-out handling and the reset when a table closes.

**Constraint:** it uses only U1's code. It reacts to the table-closed event by its contract, without needing U4's code; its tests publish that event through U1.

## U3: Kitchen Board

**Delivers:** the live board of 10 tables, the new-order highlight, status moves, the Menu availability panel and the refused-change message.

**Constraint:** it uses only U1's code. "Open bill" links to the address of the bill screen, which U4 fills in.

## U4: Bill and Close

**Delivers:** Billing (the bill calculation, the close rule and the table-closed event) and the Table Bill screen.

**Constraint:** its code uses only U1's code. It runs after U2 and U3 only because the team chose that build order.

## Assumptions & Open Questions

None. Unit boundaries come from the team's rules and the approved plan (`units-generation-questions.md`).
