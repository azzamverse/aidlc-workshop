# Unit Test Instructions: u1-walking-skeleton

## Framework

Vitest with V8 coverage and Supertest for server tests. Playwright with Chromium for browser tests.

## Run This Unit's Tests

```
npx vitest run tests/server
npx playwright test e2e/u1-walking-skeleton
```

Vitest writes `test-results/unit.json` and `coverage/coverage-summary.json`. Playwright writes `test-results/e2e.json`.

## Expected Coverage

5 to 8 tests per server component: Platform, Menu, Tables, Ordering, LiveUpdates. This plan sets no line-coverage floor: the scope adds none.

## Mocking

No mocks of the database: each test uses a fresh temporary SQLite file through `DB_FILE`. The clock may be stubbed to test the one-hour event window.

## Test Data

The seed provides 10 tables, 4 categories and 12 items. Browser tests use their own temporary `DB_FILE` and `E2E_PORT` (default 3100), never port 3000.
