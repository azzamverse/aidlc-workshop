# Bolt Plan: Table Order v2

A Bolt is one build pass over a piece of the work, ending in something that runs. Each Bolt here is one Unit from `unit-of-work.md`. The order follows `unit-of-work-dependency.md`, covers `requirements.md`, `stories.md` (through `unit-of-work-story-map.md`) and `mockups.md`, builds the `components.md` design and honours `contract-summary.md`.

| Bolt | Name | Unit | How it is built | Test port |
|---|---|---|---|---|
| 5 | Foundation | U5 `u5-foundation` | First and alone, in the main folder | 3100 |
| 6 | Diner and staff features | U6 `u6-diner-staff-features` | In parallel with Bolt 7, in its own worktree | 4100 |
| 7 | 3D X-factors | U7 `u7-3d-xfactors` | In parallel with Bolt 6, in its own worktree | 5100 |

No Bolt 8 is planned, because no work needs both U6 and U7.

## Bolt 5: Foundation

Bolt 5 is v2's walking skeleton, the smallest working end-to-end slice, built first to prove the pieces fit.

- **Definition of Done:** `npm test && npm run test:e2e` passes with v1's tests included, the team has tried it and signed it off, and the approved work is committed.
- **Confidence hypothesis:** v1's data upgrades cleanly, staff pages are truly protected on the server, and diner screens still get live updates in the new look.
- **Expected demo:** open a staff page and enter the PIN, then place an order on a restyled diner screen and watch it reach the board.
- **Real check:** `npm test && npm run test:e2e`.

## Bolt 6: Diner and Staff Features

- **Definition of Done:** all tests and the mockup match pass, and the code is reviewed.
- **Confidence hypothesis:** an order with options and an allergy warning flows from Menu to kitchen ticket to bill with exact prices, and staff requests clear live.
- **Expected demo:** set an allergy, customize a dish, place the order, follow the tracker, see the ready banner, then call the waiter and respond.

## Bolt 7: 3D X-factors

- **Definition of Done:** all tests and the mockup match pass, each scene has a working text version, and the code is reviewed.
- **Confidence hypothesis:** real 3D scenes follow live order status on a phone without slowing the Menu's first load.
- **Expected demo:** spin The Living Table, watch a ticket travel in Kitchen Theatre, spin the bottle on two phones, and roll Chef's Dice.

## Mob

All Bolts are built by the AI developer, with the team signing off each checkpoint.

## Assumptions & Open Questions

- After Bolts 6 and 7 merge, the checkpoint routine runs again in the main folder before the team tries them.
