# Code Generation Plan: U6 Diner and Staff Features

## Summary

- Builds: order-ready banners and kitchen alerts with mute, the Allergy shield, Make it yours options with server pricing, Call the waiter and Ask for the bill with Respond, and the order tracker with estimated wait
- Touches: `server/features/u6.js`, `server/ordering/`, `server/tables/service.js`, `client/src/features/`, the diner screens, the kitchen board and table bill screens, `tests/`, `e2e/u6-diner-staff-features/`
- Tests: about 45 server and client tests, about 16 browser tests, and a mockup-match spec for each refined mockup this Unit builds, with all v1 and U5 tests still running

## Build Notes

- U6 is built in its own worktree, with `E2E_PORT=4100` and its own `DB_FILE` inside the worktree. It uses only v1 and U5, and touches nothing U7 owns (`client/src/xfactors/`, `server/features/u7.js`, `package.json`).
- The files in C10's do-not-edit list stay untouched.
- Any v1 test a chosen change makes out of date is listed in `code-summary.md` under "v1 Tests Changed".
- Every bug the tests catch gets a test named "regression: …", checked to fail without the fix, and is listed under "Bugs Found by the Tests and Fixed".

## Steps

### Setup

- [x] **Step 1:** Confirm the runner works with `npx vitest run tests/server/ordering.test.js`, and record the Unit's command in `unit-test-instructions.md`.

### Data

- [x] **Step 2:** In `server/features/u6.js`, return add-only `migrations()` for `order_line_options` and `table_requests`, with a partial unique index allowing one waiting request per visit and kind. (US4.2, US5.1: BR5.2)
- [x] **Step 3:** Write and run data tests in `tests/server/u6-migrations.test.js`: tables are added to a v1-shaped database, data is kept, and a second start changes nothing.

### Options and Pricing

- [x] **Step 4:** In `server/ordering/repo.js`, store option snapshots with each line, and add `options` to a line in the order mapping only when it has some. (US4.3: BR4.8, BR4.9)
- [x] **Step 5:** In `server/ordering/service.js`, validate `optionIds` inside the placing transaction before the sold-out check, apply defaults for groups left out, work out the unit price, and record non-default or priced choices. Refuse invalid choices with 400 `INVALID_OPTIONS`. (US4.2: BR4.4, BR4.5)
- [x] **Step 6:** Write and run `tests/server/options.test.js`, including exact cents, each refusal, a free-default order matching v1's shape exactly, and options on the bill.

### Requests and Wait

- [x] **Step 7:** In `server/features/u6.js`, add the table request service and routes from C15: create-or-return, the diner read, the all-requests read and Respond behind `context.requireStaff`. Reads return only requests of Open visits. Respond answers 404 for an unknown id and returns the request unchanged on a repeat. Publish `table-request.updated`. (US5.1, US5.2: BR5.1, BR5.2, BR5.4, BR5.5)
- [x] **Step 8:** In `server/tables/service.js`, add `estimateMinutes` to Pending and Preparing orders in the diner's order read. (US6.2: BR6.2)
- [x] **Step 9:** Write and run `tests/server/requests.test.js` and `tests/server/estimate.test.js`, including two presses at once, 401 without a session, closing a table, and both estimate examples.

### Diner Screens

- [x] **Step 10:** Add the notification logic and `ReadyBanner` with `MuteSwitch`: last-seen status saved on every read and event, dismissals, the shared banner, and sound and vibration that never block a banner. (US1.1, US1.3: BR1.1 to BR1.5, BR1.7)
- [x] **Step 11:** Add `AllergyPanel` and `ContainsTag` on the Menu, and `AllergyWarning` with an in-page confirmation on the Cart. (US3.1, US3.2, US3.3: BR3.1 to BR3.4)
- [x] **Step 12:** Add `CustomizePanel` with the running price and the "Customize" link, send option ids when placing, remove every line of a sold-out dish, and show option words on the Cart and My orders. Change cart test ids so one dish can have two lines. (US4.1, US4.2, US4.3: BR4.1 to BR4.3, BR4.6 to BR4.8)
- [x] **Step 13:** Add `RequestButtons` and `OrderTracker` with "About N min", re-reading on `queue.changed`. (US5.1, US6.1, US6.2: BR5.1, BR6.1, BR6.3)
- [x] **Step 14:** Write and run client tests in `tests/client/` for notification logic, unsafe-cart logic, the running price and the tracker's steps.

### Staff Screens

- [x] **Step 15:** Add `KitchenAlerts` and the kitchen mute through `BoardExtras`, and `RequestStrip` with one Respond per request on the board's cards. Show option words on tickets and on the bill through `BillExtras` or the existing lines, keeping v1's look. (US1.2, US1.3, US4.3, US5.1, US5.2: BR1.6, BR4.8, BR5.3, BR5.4)
- [x] **Step 16:** Write and run client tests for the alert and request-strip logic.

### Browser Tests

- [x] **Step 17:** Add Playwright specs in `e2e/u6-diner-staff-features/`: `notifications.spec.ts`, `allergy.spec.ts`, `options.spec.ts`, `requests.spec.ts` and `tracker.spec.ts`, closing every extra browser context. (All stories)
- [x] **Step 18:** Add `e2e/u6-diner-staff-features/mockup-match.spec.ts` for `allergies.html`, `customize.html`, the U6 parts of `menu.html`, `cart.html` and `my-orders.html`, `kitchen-board.html` and `table-bill.html`, saving pairs to `test-results/mockup-match/u6-diner-staff-features/` and listing parts left out.

### Finish

- [x] **Step 19:** Write `code-summary.md`, `source-manifest.json` and `traceability.json`.

## Story Traceability

| Story | Steps |
|---|---|
| US1.1 | 10, 14, 17 |
| US1.2 | 15, 16, 17 |
| US1.3 | 10, 15, 17 |
| US3.1, US3.2, US3.3 | 11, 14, 17 |
| US4.1 | 12, 14, 17 |
| US4.2 | 2, 3, 5, 6, 12, 17 |
| US4.3 | 4, 6, 12, 15, 17 |
| US5.1 | 2, 7, 9, 13, 15, 17 |
| US5.2 | 7, 9, 15, 16, 17 |
| US6.1 | 13, 14, 17 |
| US6.2 | 8, 9, 13, 17 |

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
