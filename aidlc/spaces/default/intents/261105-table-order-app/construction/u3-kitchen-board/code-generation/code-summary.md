# Code Summary: u3-kitchen-board

## Files Created or Changed

- New: `client/src/screens/kitchen/boardLogic.js`, `client/src/screens/kitchen/AvailabilityPanel.jsx`
- Replaced U1's placeholder: `client/src/screens/kitchen/KitchenBoardScreen.jsx`
- `client/src/shared/styles.css`: additions only
- Tests: `tests/client/boardLogic.test.js`, `e2e/u3-kitchen-board/`

No server, shell, U1 spec or dependency changes. U3's app code imports nothing from U2.

## Key Decisions

- "★ New" means the status is Pending, and nothing is stored on the device.
- The newest read wins and re-applies changes that arrived after it started; a status never moves backwards.
- The board reads only `GET /api/tables`, and a test confirms it.
- `table.closed` reloads. If the reload fails, that table's orders are cleared locally and the error with Try again shows.
- The panel shares the board's live stream. It is a side panel, not a modal dialog, so Tab may leave it and the board stays usable.
- A conflict answer with no usable status counts as a general failure.
- Order events for a visit this board saw close are ignored.
- Wording not in the mockups: "We couldn't load the menu. Please try again." in the panel; refusal sentences lowercase the status.

## Test Results

From the developer's last run of `npm test && npm run test:e2e`:

| Check | Result |
|---|---|
| Unit and integration | 186 of 186 passed in 11 files, 13 of them new |
| Server coverage (no floor set; client code is not measured) | 98.75% lines |
| Browser, Chromium | 98 of 98 passed |
| Browser with `E2E_PORT=5100` and its own `DB_FILE` | 98 of 98 passed |

## Tests Written but Not Run Here

- Chrome and WebKit: these belong to Build and Test.

## Bugs Found by the Tests and Fixed

- Keyboard focus was lost whenever a control was disabled during its request. Fixed by using `aria-disabled` with a guard:
  - the switch, in `AvailabilityPanel.jsx`, tested by "regression: a switch keeps keyboard focus while it saves" in `availability.spec.ts`;
  - the move button, in `OrderCard` in `KitchenBoardScreen.jsx`, tested by "regression: a move keeps keyboard focus on its button, so the next move needs only Enter" in `moves.spec.ts`. The tests found the switch; the move button was inferred from it and its test written before the fix.
  - Both tests failed before the fix and pass with it.

## Deviations From the Plan

- "Disabled" in BR3.1 and BR4.2 is `aria-disabled`: requests cannot repeat and it looks disabled, but focus stays.
- A close in tests also archives the visit directly in the test database, because U1's route only publishes the event.

## Known Issues

- U2 may have the same focus problem: Place order, Cancel order and the Cart stepper use `disabled`. It matters for the keyboard-only test at Build and Test.
- A replayed order event that arrives before its table's replayed close could still briefly show that order until the close reloads the board. No test covers this.
- The two state screenshots (connection lost, change refused) were checked by word comparison.
