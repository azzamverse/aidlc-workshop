# Code Generation Plan: u1-walking-skeleton

## Summary

- Builds: the server (data, order API, live stream, seed), the React app shell with its navigation, and a plain page for each side that proves an order reaches staff live
- Touches: `package.json`, `server/`, `client/`, `tests/`, `e2e/u1-walking-skeleton/`, `vite.config.js`, `vitest.config.js`, `playwright.config.ts`
- Tests: about 35 unit and integration tests across the 5 server components, plus Playwright browser tests including the mockup match

## Design Inputs

`functional-spec.md`, `rules.md`, `entities.md`, `contract-summary.md` (C1, C2, C4, C5), `unit-of-work.md`, `requirements.md`.

## Key Choices

- **SQLite through Node's built-in `node:sqlite`**, so `npm install` needs no native compile. Node 24 is installed here, and `package.json` declares Node 22.13 or later.
- **JavaScript (ES modules)** for the server and React with JSX. Playwright specs are TypeScript, as the team's rules name `mockup-match.spec.ts`.
- **Vitest** with V8 coverage and **Supertest** for server tests. **Vite** builds the client. `npm start` builds the client, then starts the server.

## Steps

- [x] Step 1: Project structure and configuration. Create `package.json` with scripts `start`, `build`, `test`, `test:e2e`; `.gitignore` additions for `dist/`, `data/`, `coverage/`, `test-results/`, `playwright-report/`; `vite.config.js`. (US5.1)
- [x] Step 2: Test runner. Create `vitest.config.js` writing `test-results/unit.json` and `coverage/coverage-summary.json`, and `playwright.config.ts` writing `test-results/e2e.json` and using `E2E_PORT` and its own temporary `DB_FILE`. Install Playwright with Chromium. (US5.1)
- [x] Step 3: Data model. Implement `server/platform/db.js` (open from `DB_FILE`, schema, one-transaction seed of 10 tables, 4 categories and the mockups' 12 items), `settings.js`, `errors.js` and `transaction.js` (`withTransaction`, events after commit). (US5.1; BR6.1, BR6.3, BR7.1, BR7.7)
- [x] Step 4: Data model tests. Write and run `tests/server/platform.test.js`. (US5.1)
- [x] Step 5: Repositories. Implement `server/menu/repo.js`, `server/tables/repo.js`, `server/ordering/repo.js`, `server/live/repo.js`. (US1.1, US1.5, US2.1, US3.1)
- [x] Step 6: Repository tests. Write and run `tests/server/repos.test.js`.
- [x] Step 7: Business logic. Implement `server/menu/service.js`, `server/tables/service.js` (visit start, `getCurrentVisit`, `archiveVisit`), `server/ordering/service.js` (placement, status rules, cancelling, first change wins) and `server/live/service.js` (publish, replay, resync, keep-alive, pruning). (US1.2, US1.5, US1.6, US2.2, US3.2, US3.3; BR2.1 to BR5.3, BR7.4 to BR7.6)
- [x] Step 8: Business logic tests. Write and run `tests/server/menu.test.js`, `tables.test.js`, `ordering.test.js`, `live.test.js`, including a concurrent cancel and move.
- [x] Step 9: API. Implement `server/app.js`, the C1 routes, `GET /api/events`, the test-only `POST /api/test/events`, the marked Billing route slot, and every C5 screen address using `res.sendFile('index.html', { root: distDir })`. (US1.1, US1.5, US2.1, US2.2, US3.1, US3.2, US3.3, US5.2; BR7.2, BR7.3, BR7.8)
- [x] Step 10: API tests. Write and run `tests/server/api.test.js`, covering each route's success and refusals with the shared error shape.
- [x] Step 11: App shell and plain pages. Implement `client/` with routes for every C5 address, the design tokens from the mockups' `styles.css`, the bottom tab bar (Menu, Cart, My orders), the staff frame, a shared API and live-stream helper, and one placeholder file per screen. The Menu and Kitchen Board placeholders are the plain pages that place an order and show it arrive. Later Units replace only these files. (US5.2, US3.1; BR6.4)
- [x] Step 12: Browser tests. Write and run `e2e/u1-walking-skeleton/skeleton.spec.ts` (order from `/table/5` shows on `/staff` within 2 seconds; table not found; restart keeps orders) and `e2e/u1-walking-skeleton/mockup-match.spec.ts`. The mockup match compares only what U1 owns, the tab bar and staff frame, saves pairs in `test-results/mockup-match/u1-walking-skeleton/`, and lists the parts later Units own.
- [x] Step 13: Environment and start. Confirm `npm install && npm start` from a clean checkout serves http://localhost:3000, and that `PORT`, `E2E_PORT` and `DB_FILE` are honoured from any folder. (US5.1; BR6.2)
- [x] Step 14: Documentation and traceability. Write this Unit's notes for `code-summary.md`.

## Story Traceability

| Story | Steps |
|---|---|
| US1.1, US1.2 | 5, 7, 9 (server) |
| US1.5, US1.6 | 5, 7, 9, 11, 12 |
| US2.1, US2.2 | 5, 7, 9 (server) |
| US3.1, US3.2, US3.3 | 5, 7, 9, 11, 12 |
| US5.1 | 1 to 4, 13 |
| US5.2 | 9, 11, 12 |

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
