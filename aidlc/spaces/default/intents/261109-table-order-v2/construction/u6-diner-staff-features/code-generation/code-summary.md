# Code Summary: U6 Diner and Staff Features

## What Was Built

- **Order-ready banners and kitchen alerts, with mute.** A banner on every diner screen, one shared banner for orders that finished while away, and a new-order alert on the board. Sound and vibration never block a banner. Diner and kitchen each keep their own mute.
- **Allergy shield.** The eight-allergen panel, "Contains X" on the Menu, a warning on the Cart, and an in-page confirmation before placing an unsafe order.
- **Make it yours.** "+ Add" uses the defaults, and Customize shows the choices and a running price. The server prices each line from option ids and refuses bad choices with 400 `INVALID_OPTIONS`. Options show in words on the Cart, My orders, the ticket and the bill.
- **Requests.** Call the waiter and Ask for the bill, one waiting per kind, held by a database guard. The board's card pulses, with one Respond per request. Closing the table clears them.
- **Tracker.** A three-step bar and "About N min", re-read on `queue.changed`.

## Files

Every application file is listed in `source-manifest.json`. Server work is in `server/features/u6.js`, `server/ordering/` and `server/tables/service.js`. Client work is in `client/src/features/`, with small changes to the diner, kitchen and bill screens, `shared/api.js` and `shell/DinerFrame.jsx`. No file in C10's do-not-edit list was changed, and nothing U7 owns was touched.

## Decisions Made While Building

- **One stream per screen.** The banner and request buttons follow the screen's existing live stream through `features/dinerEvents.js`, so a diner tab does not open a second connection.
- **Cart test ids.** A line of plain defaults keeps the dish's own id, as in v1. A line with choices adds its line key. This lets one dish have two lines without changing a v1 test.
- **The repo tolerates a database without U6's table.** v1 tests open the database with no feature steps, so `server/ordering/repo.js` checks that `order_line_options` exists before reading it.
- **New file `server/ordering/options.js`** holds the option validation and pricing.
- **New file `client/src/features/features.css`** holds U6's styles, because `shared/styles.css` is on C10's do-not-edit list.

## Differences From the Plan and Design

- **BR4.7, sold out.** BR4.7 names "sold-out event or refusal" as triggers. The Cart removes every line of a sold-out dish on the refusal only. Removing lines on the live event would change v1 behaviour the team did not choose to change, and would break the v1 test "names the item, removes it, keeps the rest". AC4.2.5 is met at the refusal.
- **Mute position.** Kitchen and diner Mute sit in a row below the heading, through `BoardExtras` and `OrderExtras` as the plan says. The mockups show them in the heading. This is listed in the mockup-match `left-out.txt`.

## v1 Tests Changed

None.

## Bugs Found by the Tests and Fixed

| What went wrong | Where it was fixed | Regression test |
|---|---|---|
| The "About N min" estimate used the `.price` style, so an order card appeared to have two prices. The v1 test "lists number, items, status word and icon, newest first" failed on it. | `client/src/features/OrderTracker.jsx` (the estimate's class) and `client/src/features/features.css` (`.estimate`) | "regression: the estimate is not styled as a second price on the order card" in `e2e/u6-diner-staff-features/tracker.spec.ts`, checked to fail without the fix |

## Test Results

Both runs used `E2E_PORT=4100` and a database inside the worktree.

| Run | Server and client | Browser | Result |
|---|---|---|---|
| Final, after the fix (`aidlc engine swarm check`) | 411 passed, 1 skipped | Chromium only: 194 passed | Converged |
| Before the fix (`aidlc engine swarm check`) | 411 passed, 1 skipped | Chromium, Google Chrome and WebKit: 576 passed, 3 failed | Not converged. The 3 failures were the one bug above, once per browser |

- Coverage in the final run: 98.17% of lines and 93.85% of branches.
- The final run was Chromium only because the intent's recorded Construction Verification Command had become `npm test && npx playwright test --project=chromium` by then.
- The fix and its regression test have therefore not been run in Google Chrome or WebKit. Build and Test covers those browsers.
