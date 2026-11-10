# Unit Test Instructions: U7 3D X-factors

## Framework

Vitest for server and client tests, and Playwright for browser tests, both already set up in this project.

## Run This Unit's Tests

Server and client tests:

```
npx vitest run tests/server/u7-migrations.test.js tests/server/spin.test.js tests/client/xfactors.test.js
```

Browser tests, in Chromium, with this Unit's own port and database set through `E2E_PORT=5100` and `DB_FILE`:

```
npx playwright test e2e/u7-3d-xfactors --project=chromium
```

## Coverage

Each component gets 5 to 8 tests. This scope adds no coverage floor, and the existing suite stays green. Any project-wide threshold is judged by Build and Test on the full suite.

## Mocking

Server tests use a temporary database through `DB_FILE` and an injected clock for the 5-second window. Browser specs simulate missing WebGL, denied motion and reduced motion.

## Test Data

v1's seed plus U5's details. Tests that open their own browser contexts close them.
