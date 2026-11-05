# Intent Backlog: Table Order

Prioritised with MoSCoW. It follows the scope in `scope-document.md` and the success measures in the intent statement (`ideation/intent-capture/intent-statement.md`). No scoring model is used, because every item is Must Have (Q1, Q2).

## Backlog

| ID | Capability | Feature | Priority | Success measure | Depends on |
|---|---|---|---|---|---|
| IB1 | Browse the menu by category, showing name, price, description and image | F1 | Must Have | SM5 | None |
| IB2 | Cart: add, remove, change quantity, live total | F1 | Must Have | SM5 | IB1 |
| IB3 | The cart survives a page refresh | F1 | Must Have | SM3 | IB2 |
| IB4 | Place an order and see its order number | F1 | Must Have | SM1 | IB2 |
| IB5 | "My orders": this visit's orders with live status | F1 | Must Have | SM2, SM5 | IB4, IB7 |
| IB6 | Kitchen board: a grid of table cards, with a new order appearing within 2 seconds, highlighted | F2 | Must Have | SM1, SM5 | IB4 |
| IB7 | Change an order's status from Pending to Preparing to Completed, updating the diner's view | F2 | Must Have | SM2 | IB6 |
| IB8 | Open a table to see its itemised bill and total | F3 | Must Have | SM5 | IB4 |
| IB9 | "Close table" archives the visit and resets the table for the next diner | F3 | Must Have | SM4 | IB8 |
| IB10 | One command starts everything, and the app opens locally | All | Must Have | SM6 | None |

## Won't Have (this time)

Payments, QR code generation, multi-language, menu management, past-visit history, notifications and cloud deployment, as confirmed in the intent statement.

## Sequencing

The team's project rules set the build order: the walking skeleton comes first, then the rest in parallel. Units and Bolts are decided at Units Generation and Delivery Planning. The dependencies above only show which capability needs which.

## Deadline

Every item shares one deadline: the workshop session of about 5 hours (Q3).

## Assumptions & Open Questions

- If the session runs short, the team decides what to cut at the next approval point. Nothing is marked droppable in advance.
- The brief's five open questions stay open until Requirements Analysis, so this backlog may gain items then.
