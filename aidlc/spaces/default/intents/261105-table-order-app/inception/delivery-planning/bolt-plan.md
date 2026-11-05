# Bolt Plan: Table Order

A Bolt is one build pass over a piece of the work, ending in something that runs. Each Bolt here is one Unit from `unit-of-work.md`. The order follows `unit-of-work-dependency.md`, covers `requirements.md`, `stories.md` (through `unit-of-work-story-map.md`) and `mockups.md`, builds the `components.md` design and honours `contract-summary.md`.

| Bolt | Name | Unit | Code Generation timebox | How it is built | Test port |
|---|---|---|---|---|---|
| 1 | Walking skeleton | U1 `u1-walking-skeleton` | 45 min | First and alone, in the main folder | 3100 |
| 2 | Diner screens | U2 `u2-diner-screens` | 30 min | In parallel with Bolt 3, in its own worktree | 4100 |
| 3 | Kitchen board | U3 `u3-kitchen-board` | 30 min | In parallel with Bolt 2, in its own worktree | 5100 |
| 4 | Bill and close | U4 `u4-bill-and-close` | 25 min | Alone, after Bolts 2 and 3 merge and are signed off | 3100 |

## Bolt 1: Walking Skeleton

The walking skeleton is the smallest working end-to-end slice, built first to prove the pieces fit.

- **Definition of Done:** `npm test && npm run test:e2e` passes, the team has tried it and signed it off, and the approved work is committed.
- **Confidence hypothesis:** an order placed for a table reaches an open staff page within 2 seconds, through the real database and live stream, from one start command.
- **Expected demo:** run `npm install && npm start`, open `/table/5` and `/staff`, place an order on a plain page and watch it appear.
- **Real check:** `npm test && npm run test:e2e`, including a browser test of that journey.

## Bolt 2: Diner Screens

- **Definition of Done:** all tests and the Menu, Cart and My Orders mockup match pass, and the code is reviewed.
- **Confidence hypothesis:** a diner can complete the whole order journey on a 360 px screen with live status, built only on the skeleton.
- **Expected demo:** browse, fill the cart, refresh, order, watch status change and cancel.

## Bolt 3: Kitchen Board

- **Definition of Done:** all tests and the Kitchen Board mockup match pass, and the code is reviewed.
- **Confidence hypothesis:** staff can run service from one live board, built only on the skeleton.
- **Expected demo:** see a new order highlighted, move it through its statuses and mark an item sold out.

## Bolt 4: Bill and Close

- **Definition of Done:** all tests and the Table Bill mockup match pass, the merged app passes the checkpoint routine, and the code is reviewed.
- **Confidence hypothesis:** a visit can finish cleanly and open diner screens reset within 2 seconds.
- **Expected demo:** open a bill, see that Close table waits for open orders, finish them, close and watch the diner's screen reset.

## Assumptions & Open Questions

- The biggest risk is the 5-hour session.
- Each Bolt uses the team's checkpoint routine before sign-off.
