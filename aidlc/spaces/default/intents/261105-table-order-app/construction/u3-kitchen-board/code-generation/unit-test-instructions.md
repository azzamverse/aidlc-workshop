# Unit Test Instructions: u3-kitchen-board

## Framework

Vitest for the board logic. Playwright with Chromium for browser tests.

## Run This Unit's Tests

```
npx vitest run tests/client/boardLogic.test.js
npx playwright test e2e/u3-kitchen-board
```

Vitest writes `test-results/unit.json` and `coverage/coverage-summary.json`. Playwright writes `test-results/e2e.json`.

## Expected Coverage

5 to 8 tests per component: board logic, board, order moves, availability panel. The screens are covered by browser tests. This plan sets no line-coverage floor: the scope adds none.

## Mocking

Browser tests use the real server with their own temporary `DB_FILE`. A close is published through `POST /api/test/events`, which exists only with `NODE_ENV=test`. A lost connection uses a real server stopped and restarted on `E2E_PORT` + 200.

## Test Data

The seed provides 10 tables, 4 categories and 12 items. Browser tests use `E2E_PORT` (default 3100), never port 3000.
