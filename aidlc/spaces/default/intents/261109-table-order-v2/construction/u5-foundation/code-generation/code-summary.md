# Code Summary: U5 Foundation

## What Was Built

- **Staff access:** `server/staff/service.js` holds the PIN, sessions, the lockout and `requireStaff`. Every staff-only route and the all-tables stream now need a session. `client/src/shell/PinScreen.jsx` and the gate in `StaffFrame.jsx` guard the staff pages.
- **Database:** `schema_upgrades`, an upgrade runner, and U5's four add-only steps, in `server/platform/db.js`. Details for all 12 dishes are in `server/platform/seed-data.js`, matched by name.
- **Diner access:** `GET /api/tables/:id/visit`, a diner stream filtered by the requested table id (not authenticated, an accepted limit of the no-diner-login decision BR2.1) plus the two no-table events, and `queue.changed` from the order service.
- **Shared seams:** `server/features/u6.js` and `u7.js`, `client/src/shared/allergyStore.js`, options in `cartStore.js`, four lazily loaded slots in `client/src/xfactors/`, and five empty mounts in `client/src/features/`.
- **Look:** `client/src/shared/design.css` restyles Menu, Cart, My orders and the PIN screen. The kitchen board and table bill keep v1's look.

## Test Results

| Run | Result |
|---|---|
| `npx vitest run`, at the code review, with `tests/client/staffGate.test.js` | 20 files, 311 tests passed, 0 failed; lines 97.88% |
| `npx playwright test --project=chromium`, all v1 and U5 specs | 142 passed, 7 failed |
| Rerun after fixing those 7 | **Incomplete: stopped by the system for low memory.** 88 passed and 10 failed with browser or worker crashes (`ERR_NETWORK_IO_SUSPENDED`, "Target crashed", worker exit 3221225794), and the rest did not run. No test failed on an assertion. |
| Full verification command, 2026-11-10 | 443 passed, 4 failed, all 4 in WebKit |
| The three WebKit spec files holding those 4, after the fixes | 21 passed, 0 failed |
| Full verification command, two later runs | Stopped by the 30-minute limit. Cause found: tests left their own browser contexts open, and WebKit slowed to minutes per test. `e2e/staff-login.ts` now closes them after each test |
| WebKit only, before that fix | 147 passed, 2 failed, 23.2 min |
| `pin.spec.ts` in WebKit after focusing the page first, three times over | 30 passed, 0 failed |
| Full verification command after those fixes | 447 browser tests passed in 9.9 min |
| Google Chrome | Not run; this belongs to Build and Test |

All 27 U5 browser tests passed in that run. The 7 failures were all v1 tests that the v2 changes had made out of date, and each is fixed below. The rerun showed five of those fixes working. `moves.spec.ts:27` and `close.spec.ts:93` are not confirmed. **The Unit's verification command still has to be run in full before sign-off.**

## v1 Tests Changed

Every change comes from a change the team chose in Scope Definition: the Staff PIN, or the new look on Menu, Cart and My orders.

| File | Change | Reason |
|---|---|---|
| `tests/server/context-helper.js` | Adds a test PIN and `signInStaff` | Staff PIN |
| `tests/server/api.test.js` | Staff routes and the all-tables stream sign in | Staff PIN |
| `tests/server/billing-api.test.js` | Bill, close and status calls sign in | Staff PIN |
| `tests/server/ordering.test.js` | The event count ignores `queue.changed` | v2 sends this event with each order change |
| `e2e/build-and-test/keyboard-journey.spec.ts` | Signs in with `e2e/staff-login.ts` | Staff PIN |
| `e2e/u2-diner-screens/cart.spec.ts` | Signs in; the "Placing…" test switches off the app's 5-second request limit | Staff PIN; flaky test: the limit could run out in a loaded WebKit before the test read "Placing…". This one is a flaky-test fix, not a chosen change |
| `e2e/u3-kitchen-board/availability.spec.ts` | Signs in; waits for the visit read | Staff PIN; `/api/tables` is now staff-only |
| `e2e/u3-kitchen-board/moves.spec.ts` | Signs in; waits for the visit read | Staff PIN; `/api/tables` is now staff-only |
| `e2e/u3-kitchen-board/board.spec.ts` | Signs in, including the second screen and after a server restart | Staff PIN; a restart ends sessions |
| `e2e/u3-kitchen-board/mockup-match.spec.ts` | Signs in, and again after using its own server | Staff PIN |
| `e2e/u4-bill-and-close/bill.spec.ts` | Signs in, and again after a server restart | Staff PIN; a restart ends sessions |
| `e2e/u4-bill-and-close/close.spec.ts` | Signs in; waits for the visit read | Staff PIN; `/api/tables` is now staff-only |
| `e2e/u4-bill-and-close/mockup-match.spec.ts` | Signs in | Staff PIN |
| `e2e/u2-diner-screens/helpers.ts` | `liveReady` waits for the visit read | `/api/tables` is now staff-only |
| `e2e/u2-diner-screens/orders.spec.ts` | Signs in; waits for the visit read | Staff PIN; `/api/tables` is now staff-only |
| `e2e/u2-diner-screens/table-closed.spec.ts` | Signs in; blocks the visit read instead of the board read | Staff PIN; `/api/tables` is now staff-only |
| `e2e/u2-diner-screens/menu.spec.ts` | Signs in; the "+ Add" size is compared in whole pixels. The 32 px and 44 px targets are unchanged | Card tilt moves a measured box by about 0.06 px |
| `e2e/u2-diner-screens/mockup-match.spec.ts` | Signs in; the Menu skips the two top-bar words | The v2 Menu mockup heads the screen with the table's name |
| `e2e/u1-walking-skeleton/skeleton.spec.ts` | Signs in; the Menu heading is "Table 3" | Staff PIN; v2 Menu mockup |
| `e2e/u1-walking-skeleton/mockup-match.spec.ts` | Signs in; the tab bar's colours are no longer compared with v1's mockups | Staff PIN; new look |

## Bugs Found by the Tests and Fixed

None. Every test failure was a v1 test made out of date by a chosen change, a flaky test, or a mistake in a new test, so no "regression:" test was added. WebKit also measured the "+ Add" touch area at 43.996 px; `client/src/shared/design.css` now extends it, and `e2e/u5-foundation/restyle.spec.ts` covers it at the unchanged 44 px limit.

## Parts Later Units Own

Left out of the mockup match, and listed in `test-results/mockup-match/u5-foundation/left-out.txt`:

- **Menu (U6):** Allergies, Call the waiter, Ask for the bill, allergy tags and Customize links.
- **Cart (U6):** the allergy warning and chosen options under a line.
- **My orders (U6):** the ready banner, Mute, the tracker and "About N min".

## Notes for U6 and U7

- `registerRoutes(app, context)` receives the Express app, so routes use full paths such as `/api/requests`. Bodies are already parsed.
- Cart test ids still use the item id, so U6 must change them when one dish can have two lines.
- Chef's Dice receives `orders` as an empty list, because the Menu doesn't read orders.

## Traceability

| Story | Where |
|---|---|
| US2.1 | `server/staff/service.js`, `client/src/shell/PinScreen.jsx`, `e2e/u5-foundation/pin.spec.ts` |
| US2.2 | `server/app.js`, `server/live/service.js`, `tests/server/staff-api.test.js`, `tests/server/diner-access.test.js` |
| US3.2, US4.1, US12.1 data | `server/platform/seed-data.js`, `tests/server/upgrade.test.js` |
| US7.1 | `client/src/shared/design.css`, `e2e/u5-foundation/restyle.spec.ts`, `e2e/u5-foundation/mockup-match.spec.ts` |
| US8.1 | `server/platform/db.js`, `tests/server/upgrade.test.js`, `e2e/staff-login.ts` |
