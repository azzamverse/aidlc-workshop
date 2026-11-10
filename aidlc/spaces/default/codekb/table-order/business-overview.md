# Business Overview

## Purpose

Table Order lets a restaurant's diners order from their own table on a phone. The kitchen sees orders live, and staff bill and close tables. `package.json` describes it as "Order from your table: a diner view, a live kitchen board, and a table bill."

It runs locally on one machine (`npm start`, http://localhost:3000). There is no cloud deployment, payment, diner account, email or SMS.

## Users

| User | Address | What they do |
|---|---|---|
| Diner | `/table/:id`, `/table/:id/cart`, `/table/:id/orders` | Browses the menu, builds a cart, places orders, follows their status, cancels a Pending order |
| Kitchen staff | `/staff` | Sees all 10 tables, moves orders forward, marks items sold out |
| Floor staff | `/staff/tables/:id` | Reads a table's bill, closes the table |

Neither group signs in. The address alone decides what a person can do.

## Business Concepts

| Concept | Meaning in the code |
|---|---|
| Table | One of 10 fixed tables, id 1 to 10, created by the seed |
| Visit | One sitting at a table. Opened when a diner screen first reads the table. Only one Open visit per table (database-enforced). Closing archives it; orders are kept. |
| Menu | 4 categories (Starters, Mains, Desserts, Drinks) holding 12 items. Prices are whole cents. An emoji is the item's image. |
| Sold out | A mark on an item. It takes effect live and refuses orders containing the item. |
| Cart | Held per table on the diner's own device (`localStorage`), never on the server, and tied to the visit. |
| Order | Placed from a cart, belongs to a visit, numbered once across the whole restaurant. Keeps a snapshot of each item's name and price. |
| Order status | `Pending` → `Preparing` → `Completed`; `Pending` → `Cancelled` by a diner. |
| Bill | Worked out on demand from the current visit's non-cancelled orders; never stored. |

## Key Rules

- Quantity per line is 1 to 20.
- A placement key makes placing an order safe to retry: a repeated key returns the first order.
- Any sold-out item refuses the whole order, naming the items; the cart removes them and says so.
- A diner can cancel only a Pending order of the table's current visit.
- Staff move an order exactly one step forward, naming the status they saw. If it has changed, they are refused and told the current status, so the first change to arrive wins.
- A table closes only if the visit has at least one order and none is Pending or Preparing. Repeating a close succeeds and changes nothing.
- Closing a table clears every open diner device for that visit. The next visit starts only when a diner presses a tab or refreshes.
- Changes reach open screens within 2 seconds; tests enforce that limit.

## What v2 Builds On

| v2 feature | What exists now | What is missing |
|---|---|---|
| Notifications | Order status changes reach every open screen for the table; new orders reach the board | Banner, sound or alert; any listener at shell level |
| Staff PIN | One `StaffFrame` wraps both staff screens | Any concept of identity, session or protected route |
| Allergy shield | Per-device storage precedent (the cart) | Allergen data on items; a diner profile; a cart warning |
| Make it yours | Order lines already snapshot name and price | Options data; price calculation with options; line identity beyond the item |
| Call the waiter / Ask for the bill | Table-scoped live events; board table cards | A stored request and its state; acknowledgement by staff |
| Animated order tracker | Live status on My orders; `placedAt` | Any record of when an order changed status, which an estimated wait would need |

Details of each seam are in `architecture.md` and `api-documentation.md`.
