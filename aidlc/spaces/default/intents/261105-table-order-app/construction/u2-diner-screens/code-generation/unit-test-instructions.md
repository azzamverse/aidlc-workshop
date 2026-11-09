# Unit Test Instructions: u2-diner-screens

## Framework

Vitest with V8 coverage for the cart store and session logic. Playwright with Chromium for browser tests.

## Run This Unit's Tests

```
npx vitest run tests/client
npx playwright test e2e/u2-diner-screens
```

Vitest writes `test-results/unit.json` and `coverage/coverage-summary.json`. Playwright writes `test-results/e2e.json`.

## Expected Coverage

5 to 8 tests per component: cart store, diner session, Menu, Cart, My orders. The screens are covered by browser tests. This plan sets no line-coverage floor: the scope adds none.

## Mocking

Unit tests use an in-memory storage object. Browser tests use the real server with their own temporary `DB_FILE`. A close is published through `POST /api/test/events`, which exists only with `NODE_ENV=test`. Lost connections are simulated with Playwright's offline mode.

## Test Data

The seed provides 10 tables, 4 categories and 12 items. Browser tests use `E2E_PORT` (default 3100), never port 3000.
