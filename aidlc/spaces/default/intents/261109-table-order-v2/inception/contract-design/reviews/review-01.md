## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-09T16:03:47Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261109-table-order-v2/inception/contract-design/contract-summary.md > C14 u6Mounts and C15 | FR4.6 requires chosen options in words on the bill, and the bill read is staff-only and owned by v1. C14 lists mount places for Menu, Cart, My orders and the board, but none for the table bill. C15 does not change `GET /api/tables/:id/bill`, so the line shape and totals with option price deltas are not defined. A U6 developer cannot tell where the bill change goes or what the bill lines look like. | Add a bill mount place (for example `BillExtras.jsx`) to C14 and add the bill read to C15 or C11 with its line shape (options in words, line price including deltas). State who edits the v1 bill code. | New |
| R-02 | Major | aidlc/spaces/default/intents/261109-table-order-v2/inception/contract-design/contract-summary.md > C10 featureModule and C15 | C15 changes v1 routes `POST` and `GET /api/tables/:id/orders` (options, 400 INVALID_OPTIONS, estimateMinutes), but the only seam given to U6 is `registerRoutes(app, context)` on a module that `app.js` registers. Express answers with the first matching route, so a duplicate route registered after v1's would never run. The contract also does not say that U6 edits v1's order code, and those v1 files are not in `doNotEditInU6OrU7`. Which side wins is left for the developer to guess. | State how U6 changes these routes: either `app.js` registers `u6.js` before v1's routes, or U6 edits v1's order module directly and that is listed as an allowed edit. Also list the v1 files U6 and U7 may touch. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/inception/contract-design/contract-summary.md > C14 props | `ChefsDice` and the other slots get `{ table, orders, onAddToCart }`. Chef's Dice must pick a dish by mood, sold-out state and allergens (FR12.2), so it needs the menu with `mood` and `allergens`, but the props do not carry it and no menu hook is named. | Add the menu (or a shared menu hook from the client modules) to the props, or name the module Chef's Dice must read it from. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/inception/contract-design/contract-summary.md > C12 | `queue.changed` is a no-table event, and diners need it because they cannot see other tables' order events. The contract does not name who publishes it or when (order placed, status changed, cancelled). `/api/events` also does not define the `tableId` query parameter or the 401 for the all-tables stream, though C11 relies on both. | Name the publisher and triggers of `queue.changed`. Add the stream parameter and 401 response to C12 or C11. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/inception/contract-design/contract-summary.md > C15 requests | FR5.7 says closing a table clears its waiting requests, and FR5.4 says pulses stop on every open board. The contract does not say that `GET /api/requests` and the board only count requests of open visits, or which event tells open screens at close time. | State that requests of a closed visit are not returned or counted, and name the event or refetch that clears the pulse and the diner buttons on close. | New |
| R-06 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/inception/contract-design/contract-summary.md > C11 menu and C13 allergyStore | The allergen ids and mood values are shared between server data, `allergyStore` and Chef's Dice, but they are typed as plain strings. The "Surprise me" mood is not an item mood. | List the eight allergen ids and the item mood values once in C11, and say how "Surprise me" is resolved. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| None listed | Not run | Cross-checked by hand: C10 to C16 map to the U5, U6 and U7 edges in unit-of-work-dependency.md, which is acyclic. FR2, FR3, FR4, FR5, FR6, FR9 to FR12 were traced against the contracts. The gaps are the ones above. |

### Summary

The contracts follow the acyclic U5 to U6 and U5 to U7 edges, and the shared seams, event registry and slots are mostly well pinned. Two Major gaps should be fixed before approval: the bill has no mount place or contract for options (FR4.6), and the contract does not say how U6's order routes take effect over v1's. Neither blocks a build once settled, so the verdict is READY with these to weigh.
