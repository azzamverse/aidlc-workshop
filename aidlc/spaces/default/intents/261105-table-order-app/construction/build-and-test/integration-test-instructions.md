# Integration Test Instructions: Table Order

## Framework

Vitest and Supertest for the server, against a real temporary SQLite file. Playwright for browser journeys against the real server, in real browser engines: Chromium, Google Chrome and WebKit.

## Run

```
npm test && npm run test:e2e
```

One browser only: `npx playwright test --project=webkit`.

## Cross-Unit Boundaries Covered

| Boundary | Test |
|---|---|
| Diner to board, order placed | `e2e/u1-walking-skeleton/skeleton.spec.ts` |
| Board to diner, status move | `e2e/u3-kitchen-board/moves.spec.ts` |
| Availability panel to open menu | `e2e/u3-kitchen-board/availability.spec.ts` |
| Bill close to diner and board | `e2e/u4-bill-and-close/close.spec.ts` |
| The whole journey by keyboard | `e2e/build-and-test/keyboard-journey.spec.ts` |

## Test Data

The seed provides 10 tables, 4 categories and 12 items. Each run uses its own temporary database. There is no coverage floor in this scope.
