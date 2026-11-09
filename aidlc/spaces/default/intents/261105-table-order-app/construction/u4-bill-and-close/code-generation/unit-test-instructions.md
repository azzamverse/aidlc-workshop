# Unit Test Instructions: u4-bill-and-close

## Framework

Vitest with V8 coverage and Supertest for Billing. Playwright with Chromium for browser tests.

## Run This Unit's Tests

```
npx vitest run tests/server/billing.test.js tests/server/billing-api.test.js
npx playwright test e2e/u4-bill-and-close
```

Vitest writes `test-results/unit.json` and `coverage/coverage-summary.json`. Playwright writes `test-results/e2e.json`.

## Expected Coverage

5 to 8 tests per component: Billing service, Billing API, Table Bill screen. This plan sets no line-coverage floor: the scope adds none.

## Mocking

No mocks of the database: each server test uses a fresh temporary SQLite file through `DB_FILE`. Browser tests use the real server and the real close route. A lost connection uses a real server stopped and restarted on `E2E_PORT` + 200.

## Test Data

The seed provides 10 tables, 4 categories and 12 items. Browser tests use `E2E_PORT` (default 3100), never port 3000.
