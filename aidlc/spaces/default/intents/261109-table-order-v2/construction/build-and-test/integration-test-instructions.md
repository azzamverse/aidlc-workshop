# Integration Test Instructions

Sources: each Unit's `code-generation-plan.md`, `unit-test-instructions.md` and `code-summary.md`.

## Framework

Vitest with coverage (`vitest.config.js`, server code only) and Playwright (`playwright.config.ts`).

## Commands

| Check | Command |
|---|---|
| Server and client tests, coverage | `npm test` |
| All browser tests, all three browsers | `npm run test:e2e` |
| Approved Unit verification | `npm test && npx playwright test --project=chromium` |
| Screen widths and keyboard for v2 | `npx playwright test e2e/build-and-test/v2-widths-and-keyboard.spec.ts` |

## Cross-Unit boundaries covered

- U5 slots loading U7's views: `e2e/u5-foundation/diner-access.spec.ts`.
- U6 additions on v1 screens and U6's option pricing through ordering and billing: `e2e/u6-diner-staff-features/`.
- v1 flows still working with v2 merged: `e2e/u1-walking-skeleton` to `e2e/u4-bill-and-close`.

## Coverage target

The server-code line floor is 80%.

## Test data

Each spec owns its table and archives the open visit first. Browser tests use their own `DB_FILE` and `E2E_PORT`, never port 3000's database.
