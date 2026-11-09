# Code Summary: u4-bill-and-close

## Files Created or Changed

- New: `server/billing/service.js`, `tests/server/billing.test.js`, `tests/server/billing-api.test.js`, `e2e/u4-bill-and-close/`
- Changed: `server/app.js` (the Billing slot, plus one import line), `client/src/screens/bill/TableBillScreen.jsx`, `client/src/shared/api.js` (`getBill`, `closeTable`), `client/src/shared/styles.css` (additions only)

## Key Decisions

- Billing takes only `context.shared` and `tables.requireTable`. The close is synchronous inside `withTransaction`.
- `canClose` counts all the visit's orders, so an all-cancelled visit closes at $0.00.
- The live stream mounts after a first successful read. Every event re-reads the bill, and the newest read wins.
- Close table uses `aria-disabled` with a guard.
- Wording not in the mockups: "Please check the table number.", "Reconnecting… the bill will catch up by itself."

## Test Results

From the developer's runs:

| Check | Result |
|---|---|
| Unit and integration | 206 of 206 passed in 13 files, 20 of them new |
| Server coverage (no floor set; client code is not measured) | 98.8% lines |
| Browser, Chromium | 120 of 120 passed |
| Browser with `E2E_PORT=6100` and its own `DB_FILE` | 120 of 120 passed |

## Tests Written but Not Run Here

- Chrome, WebKit and the keyboard-only journey: these belong to Build and Test.

## Bugs Found by the Tests and Fixed

None. The only failure was a mistake in a test.

## Deviations From the Plan

- `server/app.js` has one import line outside the marked slot, because `createApp` is synchronous.
- The offline device test stops the server to break the stream, blocks `/api/events`, restarts, closes through the real route, then lifts the block.

## Known Issues

- This differs from the interaction spec, which returns to the board after a close: the review found a timed page change fails NFR6, so staff press "Back to board".
- U2's disabled buttons may lose focus; checked at Build and Test.
