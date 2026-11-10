# Code Generation Plan: U7 3D X-factors

## Summary

- Builds: The Living Table, Kitchen Theatre, Spin the Bottle with its server rules, and Chef's Dice, each loaded on demand with a text version
- Touches: `server/features/u7.js`, `client/src/xfactors/`, `package.json` (adds three.js), `tests/`, `e2e/u7-3d-xfactors/`
- Tests: about 25 server and client tests, about 12 browser tests, and a mockup-match spec for each of the four scene mockups, with all v1 and U5 tests still running

## Build Notes

- U7 is built in its own worktree, with `E2E_PORT=5100` and its own `DB_FILE` inside the worktree. It uses only v1 and U5, and touches nothing U6 owns.
- Three.js is added as a dependency, as Domain Design names it, and loaded only when a scene opens.
- WebGL may be unavailable in the test browsers, so browser specs cover the text version directly and check that a scene opens with no error.
- Every bug the tests catch gets a test named "regression: …", checked to fail without the fix, and is listed under "Bugs Found by the Tests and Fixed".

## Steps

### Setup

- [x] **Step 1:** Add three.js to `package.json`, install it, and confirm `npx vitest run tests/server/diner-access.test.js` runs. Record the Unit's command in `unit-test-instructions.md`.

### Data and Server

- [x] **Step 2:** In `server/features/u7.js`, return an add-only migration for `spins`. (US11.1)
- [x] **Step 3:** Write and run a data test in `tests/server/u7-migrations.test.js`.
- [x] **Step 4:** Add the spin service and routes from C16. Validate the table, visit, seats and question. Inside one transaction check the 5-second window, pick the seat with a secure random number and store the spin. Publish `spin.started` after commit with `elapsedMs` 0, and return the server's `elapsedMs` on reads. (US11.1: BR11.1 to BR11.6)
- [x] **Step 5:** Write and run `tests/server/spin.test.js`: each refusal, two spins at once, the 5-second window on an injected clock, the read during and after a spin, an unknown table, and no name or payment fields.

### Scene Logic

- [x] **Step 6:** Add pure logic modules in `client/src/xfactors/logic/`: plates from orders with the 12 cap, tickets and stations, the time left for a spin held between 0 and 5 seconds, and the dice choice. (BR9.1, BR9.2, BR10.1, BR11.5, BR12.1, BR12.3)
- [x] **Step 7:** Write and run `tests/client/xfactors.test.js`.

### Scenes

- [x] **Step 8:** Add a shared scene host: WebGL check, text fallback when 3D can't start or fails, reduced-motion still scenes, and releasing 3D resources on close. (BR9.4, BR9.5, BR9.6)
- [x] **Step 9:** Replace `LivingTable.jsx`: plates, covers and steam, drag and arrow keys, and a text summary of every unit. (US9.1: BR9.1 to BR9.3)
- [x] **Step 10:** Replace `KitchenTheatre.jsx`: tickets on a rail with number and status in words. (US10.1: BR10.1, BR10.2)
- [x] **Step 11:** Replace `SpinTheBottle.jsx`: seats and question form, shared result from `spin.started` and the read, and plain refusal messages. (US11.1: BR11.1 to BR11.5)
- [x] **Step 12:** Replace `ChefsDice.jsx`: mood choice, roll by tap, Enter or shake where allowed, "Add to cart", "Roll again", and the no-match message, reading the `menu` prop. (US12.1: BR12.1 to BR12.3)

### Browser Tests

- [x] **Step 13:** Add Playwright specs in `e2e/u7-3d-xfactors/`: `living-table.spec.ts`, `kitchen-theatre.spec.ts`, `spin.spec.ts` and `dice.spec.ts`, including two screens sharing one spin, the text version, reduced motion, and the Menu's first load fetching no 3D code. Close every extra browser context.
- [x] **Step 14:** Add `e2e/u7-3d-xfactors/mockup-match.spec.ts` for `living-table.html`, `kitchen-theatre.html`, `bottle.html` and `dice.html`, saving pairs to `test-results/mockup-match/u7-3d-xfactors/` and listing parts left out.

### Finish

- [x] **Step 15:** Write `code-summary.md`, `source-manifest.json` and `traceability.json`.

## Story Traceability

| Story | Steps |
|---|---|
| US9.1 | 6 to 9, 13, 14 |
| US10.1 | 6 to 8, 10, 13, 14 |
| US11.1 | 2 to 8, 11, 13, 14 |
| US12.1 | 6 to 8, 12, 13, 14 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "dpl-workshop",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "project",
      "text": "These notes add to the methodology the framework sets; they don't change it.\n- **Browser tests:** besides unit and integration tests, every Unit adds Playwright tests in `e2e/<unit>/` for its main flows. The walking skeleton installs Playwright with Chromium.\n- **Verification command:** `npm test && npm run test:e2e`.\n  - `npm test` writes `test-results/unit.json` and `coverage/coverage-summary.json`.\n  - `npm run test:e2e` writes `test-results/e2e.json`.\n  - The workshop dashboard reads these files.\n- **Mockup match:**\n  - Every Unit adds `e2e/<unit>/mockup-match.spec.ts`. For each refined mockup the Unit builds, it sets up the same state and checks that the screen shows the mockup's headings, labels, buttons, messages and status words.\n  - It saves the mockup and app screenshots side by side in `test-results/mockup-match/<unit>/`.\n  - Parts that a later Unit owns are left out of the comparison and listed.\n- **Browsers checked at Build and Test:**\n  - Chromium, the installed Google Chrome, and WebKit (Safari's engine).\n  - Firefox is not installed or tested.\n  - Build and Test also adds a keyboard-only test of the whole journey, for NFR6.\n- **Ports and database:** every port and the SQLite database file come from environment variables, so Bolts built in parallel never share either:\n  - `PORT`, default 3000: the app the team uses, in the main folder only.\n  - `E2E_PORT`, default 3100: the browser tests. Specs that need their own server use `E2E_PORT` + 100 and + 200 (3200 and 3300 by default).\n  - `DB_FILE`: the database file.\n  - Each parallel Bolt runs its tests with its own `E2E_PORT`: 4100, 5100, 6100 and 7100, in batch order. It also uses its own `DB_FILE` inside its worktree.\n- **In v2,** the verification command runs v1's tests and v2's together, so every Bolt also proves v1 still works.\n- **A flaky test** is fixed in the test code; a threshold is never lowered."
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
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
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
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
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
  "input_sha256": "sha256:99068bcd5e8a3a7477bcd10a6b27eb5b29307bb0df4fc9bbb8a003e6be05fb85",
  "contract_sha256": "sha256:4415290c94eaf99f82ff06b8c2fc50d31261035382150726851998650218e35d"
}
```
