# Code Summary: u2-diner-screens

## Files Created or Changed

- New screens code in `client/src/screens/diner/`: `cartStore.js`, `sessionLogic.js`, `useDinerSession.js`, `parts.jsx`
- Replaced U1's placeholders: `MenuScreen.jsx`, `CartScreen.jsx`, `MyOrdersScreen.jsx`
- `client/src/shared/styles.css`: additions only
- Tests: `tests/client/`, `e2e/u2-diner-screens/`
- `e2e/u1-walking-skeleton/skeleton.spec.ts`: orders are now placed from the Cart and read from My orders; it proves the same things

No server, shell or dependency changes. `vitest.config.js` needed no change.

## Key Decisions

- A tab press while closed is detected by a capture-phase click listener on `nav.tabs a`, so the shell did not change. It calls `reloadTable`, and a small module-level marker ignores events and visit checks until the new table arrives.
- Reconnect checks use only `GET /api/tables`, with up to 3 tries 2 seconds apart. A resync also runs a check, because it can hide a close.
- The current category pill comes from the scroll position plus an "at the bottom" rule, because Drinks may never reach the mockup's band.
- Replayed order events cannot move an order back to an earlier status.
- Wording not in the mockups: "We couldn't load your orders. Check your connection and try again." and "We couldn't cancel Order #N. Please try again."

## Test Results

From the developer's last run of `npm test && npm run test:e2e`:

| Check | Result |
|---|---|
| Unit and integration | 172 of 172 passed in 9 files, 34 of them new |
| Server coverage (no floor set; client code is not measured) | 98.75% lines |
| Browser, Chromium | 64 of 64 passed |

## Tests Written but Not Run Here

- Chrome and WebKit: these belong to Build and Test.
- `E2E_PORT=4100` with its own `DB_FILE`: 63 of 63 passed, before the last test ("Table not found") was added. That test has only run on the default port.

## Bugs Found by the Tests and Fixed

None. All first-run failures were mistakes in the tests themselves.

## Review Follow-Ups

- The reconnecting notice no longer flashes on a tab press; a real outage still carries across tabs. A browser test covers it.
- A failed restart shows the frame's Try again, which adopts the new visit. A browser test covers it.
- A placement answered after a close keeps the closed card. A browser test covers it.
- A saved line with no image is accepted. A unit test covers it.
- The 98.75% is server coverage only. The screens are covered by browser tests.

## Deviations From the Plan

- Lost connections use a real server stopped and restarted on `E2E_PORT` + 200, not Playwright's offline mode, which leaves an open event stream running.
- U1's test route only publishes the close, so `archiveOpenVisit` in `e2e/u2-diner-screens/helpers.ts` also marks the visit Closed in the test database.
- "Cart: item sold out while choosing" is not compared: its text in `states.html` is a note about the mockup. It is listed in `left-out.txt`.
- `parts.jsx` was added inside the planned folder.

## Known Issues

- Two browser tabs on one device share a saved cart, but a tab sees the other's changes only after a reload. The design does not ask for this.
- The session hook's React behaviour is covered by browser tests only; its decision logic also has unit tests.
- This Unit was built serially in the main folder, not in a worktree.
