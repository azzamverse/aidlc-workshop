# Code Generation Plan: u4-bill-and-close

## Summary

- Builds: the bill calculation and the close rule on the server, with the table-closed event, and the Table Bill screen
- Touches: `server/billing/`, the marked Billing slot in `server/app.js`, `client/src/screens/bill/`, `client/src/shared/api.js` and `client/src/shared/styles.css` (additions only), `tests/server/`, `e2e/u4-bill-and-close/`
- Tests: unit and API tests for Billing, plus Playwright browser tests for every main flow and the mockup match

## Design Inputs

`functional-spec.md`, `rules.md`, `entities.md`, `contract-summary.md` (C2, C3, C4, C5), `unit-of-work.md`, `requirements.md`, and the refined mockups `table-bill.html` and `states.html`.

## Key Choices

- **Billing uses only `context.shared` and `tables.requireTable`.** Its close work is synchronous, because `withTransaction` refuses async work.
- **No new dependencies, and no changes to the board or the diner screens.**

## Steps

- [x] Step 1: Project structure. Confirm the Billing slot in `server/app.js`. No new runner: the commands are `npx vitest run tests/server/billing.test.js` and `npx vitest run tests/server/billing-api.test.js`.
- [x] Step 2: Business logic. Implement `server/billing/service.js`: the bill, the open orders, the total, `canClose` and the close with its outcomes. (US4.1, US4.2; BR1.1 to BR1.4, BR2.1 to BR2.4)
- [x] Step 3: Business logic tests. Write and run `tests/server/billing.test.js`, including a failed close rolling back with no event, and reading a bill not starting a visit.
- [x] Step 4: API. Register `GET /api/tables/:id/bill` and `POST /api/tables/:id/close` in the marked slot, and wire Billing into the app using `context.shared`. (C3)
- [x] Step 5: API tests. Write and run `tests/server/billing-api.test.js`, covering each route's success and refusals with the shared error shape.
- [x] Step 6: Screen. Replace `TableBillScreen.jsx` with skeletons, the error with Try again, "Table not found", order tables, status chips, "Still open", the total, the empty bill, Close table, live updates, reconnecting, and the closed message followed by the return to the board after 2 seconds. Add `getBill` and `closeTable` to `api.js`. (US4.1, US4.2; BR3.1 to BR3.3)
- [x] Step 7: Browser tests. Write and run `e2e/u4-bill-and-close/bill.spec.ts` and `close.spec.ts`, covering the total to the cent, cancelled orders, open orders, Close table unavailable, an all-cancelled table, a repeat close, the real close reaching an open diner screen and the board within 2 seconds with a device offline during the close, keyboard use and reduced motion. (US4.3, US5.3)
- [x] Step 8: Mockup match. Write and run `e2e/u4-bill-and-close/mockup-match.spec.ts` for `table-bill.html` and the bill states in `states.html`, saving pairs in `test-results/mockup-match/u4-bill-and-close/`.
- [x] Step 9: Environment. Run `npm test && npm run test:e2e`, also with `E2E_PORT=6100` and its own `DB_FILE`. Keep the app on port 3000 stopped.
- [x] Step 10: Documentation and traceability. Write this Unit's notes for `code-summary.md`, including any "Bugs found by the tests and fixed", each with its "regression: …" test, checked to fail without the fix.

## Story Traceability

| Story | Steps |
|---|---|
| US4.1 | 2 to 8 |
| US4.2 | 2 to 8 |
| US4.3 | 2, 7 |
| US5.3 | 6, 7 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "dpl-workshop",
  "test_strategy": "standard",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "project",
      "text": "These notes add to the methodology the framework sets; they don't change it.\n- **Browser tests:** besides unit and integration tests, every Unit adds Playwright tests in `e2e/<unit>/` for its main flows. The walking skeleton installs Playwright with Chromium.\n- **Verification command:** `npm test && npm run test:e2e`.\n  - `npm test` writes `test-results/unit.json` and `coverage/coverage-summary.json`.\n  - `npm run test:e2e` writes `test-results/e2e.json`.\n  - The workshop dashboard reads these files.\n- **Mockup match:**\n  - Every Unit adds `e2e/<unit>/mockup-match.spec.ts`. For each refined mockup the Unit builds, it sets up the same state and checks that the screen shows the mockup's headings, labels, buttons, messages and status words.\n  - It saves the mockup and app screenshots side by side in `test-results/mockup-match/<unit>/`.\n  - Parts that a later Unit owns are left out of the comparison and listed.\n- **Browsers checked at Build and Test:**\n  - Chromium, the installed Google Chrome, and WebKit (Safari's engine).\n  - Firefox is not installed or tested.\n  - Build and Test also adds a keyboard-only test of the whole journey, for NFR6.\n- **Ports and database:** every port and the SQLite database file come from environment variables, so Bolts built in parallel never share either:\n  - `PORT`, default 3000: the app the team uses, in the main folder only.\n  - `E2E_PORT`, default 3100: the browser tests. Specs that need their own server use `E2E_PORT` + 100 and + 200 (3200 and 3300 by default).\n  - `DB_FILE`: the database file.\n  - Each parallel Bolt runs its tests with its own `E2E_PORT`: 4100, 5100, 6100 and 7100, in batch order. It also uses its own `DB_FILE` inside its worktree.\n- **A flaky test** is fixed in the test code; a threshold is never lowered."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:1802929429da4c7ecc1af400cd69f52c6f6b9645e66cf102fb8cb6c1c4e3e978",
  "contract_sha256": "sha256:b4cb807649ab2c72fee4d5b1b31c7ff4f1392743ea63e3079156fb0ca689734d"
}
```
