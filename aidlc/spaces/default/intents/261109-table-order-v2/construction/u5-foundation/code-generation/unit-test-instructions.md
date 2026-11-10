# Unit Test Instructions: U5 Foundation

## Framework

Vitest for server and client tests, and Playwright for browser tests, both already set up in this project.

## Run This Unit's Tests

Server and client tests:

```
npx vitest run tests/server/upgrade.test.js tests/server/staff.test.js tests/server/staff-api.test.js tests/server/diner-access.test.js tests/client/allergyStore.test.js tests/client/cartStore.test.js
```

Browser tests, in Chromium:

```
npx playwright test e2e/u5-foundation --project=chromium
```

## Coverage

Each component gets 5 to 8 tests. No coverage floor applies to this scope, and the existing suite stays green.

## Mocking

Server tests use a temporary database through `DB_FILE`, and pass an injected clock to test the 30-second lockout. Browser sound and storage failures are simulated in the page.

## Deployment Assumption

The PIN lockout counts wrong tries per `req.ip`, so the app is served directly. Behind a reverse proxy, every client would share one address until `trust proxy` is set.

## Test Data

v1's seed plus U5's details. The upgrade test builds a v1-shaped database first. Test servers get `STAFF_PIN` from the environment, and the lockout is reset between specs through the test-only route.
