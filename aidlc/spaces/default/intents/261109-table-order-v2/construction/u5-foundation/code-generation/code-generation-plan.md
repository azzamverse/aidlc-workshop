# Code Generation Plan: U5 Foundation

## Summary

- Builds: staff PIN and server checks, add-only database upgrade, allergens, options and moods data, diner live split, shared modules and slots, and the Midnight Supper Club look on Menu, Cart and My orders
- Touches: `server/` (app, context, db, staff, menu, tables, live, features), `client/src/` (App, shared, shell, diner screens, staff PIN, xfactors, features), `tests/`, `e2e/u5-foundation/`, and v1 staff tests through one login helper
- Tests: about 40 new server and client tests, about 12 browser tests, and a mockup-match spec for Menu, Cart, My orders and the PIN screen, with all v1 tests still running

## Design Decisions Settled From The Architect's Check

These close the findings on U5's design, and are built as written:

| Finding | Decision |
|---|---|
| Major: how U6 gets the staff check | `context.requireStaff` is Express middleware passed in the context to `registerRoutes`. With no valid session it answers 401, code `STAFF_REQUIRED`, and stops. U6 uses it on `GET /api/requests` and `POST /api/requests/:id/respond`. |
| Major: shared client modules | `allergyStore`: missing, unreadable or corrupt storage, or blocked storage, reads as an empty list and never throws. Unknown ids are dropped on read. `isUnsafe(item)` is true only when a chosen allergen is in the item's list, so an item with none is not unsafe. `cartStore.add`: unknown option ids are dropped, and a pick-one group left empty takes its default. A saved v1 line keeps no options until the menu is loaded, then takes its defaults when the cart is read with the menu. Its key doesn't change until then. |
| Minor: fifth mount and edit rights | BillExtras is the fifth mount, recorded here as the update to C14. U6 may edit `server/ordering/*`, `server/billing/*`, `server/tables/*` and the kitchen and bill screens. U7 edits none of these. |
| Minor: fifth wrong PIN | The fifth wrong try answers 429 `PIN_LOCKED`, and a test covers it. |
| Minor: memory and cookie | The cookie is `HttpOnly` and `SameSite=Strict`. Sessions are capped at 1000, dropping the oldest, and spent PIN-attempt entries are removed on each try. |
| Minor: table isolation | Accepted limit: `GET /api/tables/:id/orders` stays open by the Contract Design decision, with no accounts to tell diners apart. The isolation guarantee applies to the live stream and the visit read. |

Open mockup points built here: real 44 px touch areas, status words Pending, Preparing and Completed, PIN lockout state, PIN dots matching the entry count, and `aria-live` on live changes.

## Steps

### Setup

- [x] **Step 1:** Stop the app on port 3000. Confirm `npx vitest run tests/server/api.test.js` runs. (US8.1)

### Data

- [x] **Step 2:** In `server/platform/db.js`, add `schema_upgrades` and an upgrade runner taking U5, then U6, then U7 steps, each once, in its own transaction, failing fast with the step id logged. Add U5's steps for `item_allergens`, `item_moods`, `option_groups` and `options`. (US8.1: BR3.1)
- [x] **Step 3:** In `server/platform/seed-data.js`, add details for all 12 items, by name, without touching item rows: allergens, a mood each, spice and size pick-one groups, and extras, with extra cheese only on dairy items. (US3.2, US4.1, US12.1: BR3.2, BR4.1, BR4.2, BR4.3)
- [x] **Step 4:** Write and run data tests in `tests/server/upgrade.test.js`, including a real v1 database copy, a second start changing nothing, and seed coverage.

### Server

- [x] **Step 5:** Add `server/staff/service.js`: PIN from `STAFF_PIN` or a printed random one, constant-time compare, sessions, lockout, and `requireStaff`. (US2.1, US2.2: BR1.1 to BR1.5)
- [x] **Step 6:** Write and run `tests/server/staff.test.js`.
- [x] **Step 7:** Extend `server/menu/` so the menu read carries allergens, mood and optionGroups. Add `tables.getVisitForDiner`, and `queue.changed` publishing from the order service on place, status change and cancel. Limit the diner stream to its table and no-table events, with replay. (US2.2: BR2.2, BR2.3, BR3.3)
- [x] **Step 8:** Create empty `server/features/u6.js` and `u7.js`. In `server/app.js` and `context.js`, add `POST` and `GET /api/staff/session`, `GET /api/tables/:id/visit`, `requireStaff` on every staff-only route and on the all-tables stream, feature registration and the test-only lockout reset. (US2.2: BR1.1, BR1.7, BR2.1)
- [x] **Step 9:** Write and run `tests/server/staff-api.test.js`, `tests/server/diner-access.test.js` and the menu details tests. Add the shared sign-in to v1 server tests that call staff routes, and list each change under "v1 tests changed".

### Client

- [x] **Step 10:** Add `client/src/shared/allergyStore.js`, and extend `cartStore.js` with `lineKeyOf` and options, as decided above. Accept the new event names in `client/src/shared/live.js`. Move `useDinerSession` to the visit read. (BR5.1)
- [x] **Step 11:** Write and run `tests/client/allergyStore.test.js` and new `cartStore` tests.
- [x] **Step 12:** Add the PIN screen and a staff gate in `StaffFrame.jsx`, returning to the PIN screen on any 401. (US2.1: BR1.6)
- [x] **Step 13:** Add placeholders in `client/src/xfactors/` and empty mounts in `client/src/features/` (five, with BillExtras). Add the My orders switcher and the Menu's Chef's Dice button, each view lazily loaded.
- [x] **Step 14:** Add the design system tokens and components in a new `client/src/shared/design.css`, scoped to diner and PIN screens. Restyle Menu, Cart and My orders to the mockups, with visible depth. Keep the tab bar, sticky pills, touch areas, keyboard access and reduced motion. (US7.1: BR6.1, BR6.2)
- [x] **Step 15:** Write and run client tests for the staff gate logic.

### Browser Tests

- [x] **Step 16:** Add `e2e/staff-login.ts`, and have v1's staff specs sign in with it. List each under "v1 tests changed". Reset the lockout between specs.
- [x] **Step 17:** Add `e2e/u5-foundation/pin.spec.ts`, `diner-access.spec.ts` and `restyle.spec.ts`. (US2.1, US2.2, US7.1)
- [x] **Step 18:** Add `e2e/u5-foundation/mockup-match.spec.ts` for Menu, Cart, My orders and PIN, saving pairs to `test-results/mockup-match/u5-foundation/`. List the parts later Units own. (BR6.3)

### Finish

- [x] **Step 19:** Set `STAFF_PIN` for the test servers from the environment in `playwright.config`. Write `code-summary.md`, including "v1 tests changed" and "Bugs found by the tests and fixed".

## Story Traceability

| Story | Steps |
|---|---|
| US2.1 | 5, 6, 12, 17 |
| US2.2 | 5 to 9, 17 |
| US3.2 data | 3, 4 |
| US4.1 data | 3, 4 |
| US7.1 | 14, 17, 18 |
| US8.1 | 1, 2, 4, 9, 16 |
| US12.1 data | 3, 4 |

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

## Assumptions & Open Questions

- `three.js` is not installed here, since U7 is the Unit that uses it.
