# Unit Test Instructions: U6 Diner and Staff Features

## Framework

Vitest for server and client tests, and Playwright for browser tests, both already set up in this project.

## Run This Unit's Tests

Server and client tests:

```
npx vitest run tests/server/u6-migrations.test.js tests/server/options.test.js tests/server/requests.test.js tests/server/estimate.test.js tests/client/u6
```

Browser tests, in Chromium, with this Unit's own port and database set through `E2E_PORT=4100` and `DB_FILE`:

```
npx playwright test e2e/u6-diner-staff-features --project=chromium
```

## Coverage

Each component gets 5 to 8 tests. This scope adds no coverage floor, and the existing suite stays green. Any project-wide threshold is judged by Build and Test on the full suite.

## Mocking

Server tests use a temporary database through `DB_FILE`. Browser sound, vibration and storage failures are simulated in the page.

## Test Data

v1's seed plus U5's details. Tests that open their own browser contexts close them.
