# Developer Code Scan: Table Order v1

Repo: `table-order` (unrecorded project-root repo). Commit: `324e1c6d57fbe8ac8737ea0d1abb3cfa4f7f31a4`. Scan date: 2026-11-09. Breadth: full. Depth: Standard. Code was read only; no test, build or program was run, so no test result or coverage figure below is measured.

## Developer Code Scan Results

### Scan Coverage

- **Analyzed deeply**:
  - `server/` (all 19 files)
  - `client/index.html`, `client/src/` (all 22 files, `styles.css` included)
  - `tests/server/`, `tests/client/` (all 15 files)
  - `e2e/` (all 19 files)
  - `package.json`, `playwright.config.ts`, `vite.config.js`, `vitest.config.js`, `tsconfig.json`, the app's own part of `.gitignore`
  - `V2 Scope/V2-BRIEF.md` (read in full as the intent's context; it is not application code)
- **Skimmed only**:
  - `package-lock.json` (resolved versions of the direct dependencies only)
  - `V2 Scope/V2-SETUP.md` and `V2 Scope/GUIDE.md` (first lines only)
- **Left out** (not opened, or excluded by the brief):
  - `node_modules/`
  - `dist/`
  - `data/`
  - `coverage/`
  - `test-results/`
  - `playwright-report/`
  - `.claude/`, `.kiro/`, `.codex/`, `.cursor/`, `.opencode/`, `.aidlc/`, the `aidlc/` workspace (AI-DLC's own install)
  - AI-DLC's marked block of `.gitignore`
  - `ideas/`

### Packages Found

- `table-order` — single npm package, ESM (`"type": "module"`) — JavaScript and JSX, TypeScript for browser tests only — one Node.js process serving a JSON API, a Server-Sent Events stream and a built React single-page app.
- `server/` — Express API, organised by domain (`menu`, `tables`, `ordering`, `billing`, `live`) over `platform/`.
- `client/` — Vite root; React screens under `src/screens/{diner,kitchen,bill}`, frames under `src/shell`, helpers under `src/shared`.
- `tests/` — Vitest unit and integration tests. `e2e/` — Playwright browser tests.

### Build System

- **Type**: npm scripts; Vite builds the client, the server runs unbuilt on Node.js.
- **Config Files**: `package.json`, `package-lock.json`, `vite.config.js`, `vitest.config.js`, `playwright.config.ts`, `tsconfig.json`.
- **Build Dependencies**: `npm start` = `npm run build && node server/index.js`. The server refuses to start without `dist/index.html` (`server/index.js:10`). Playwright's web server runs the same build, with `NODE_ENV=test`.
- **Runtime requirement**: Node.js >= 22.13.0 (`package.json`), because the database driver is the built-in `node:sqlite`.

### APIs Discovered

- REST/JSON — `server/app.js` and its registrars — 11 product routes under `/api` (menu 2, tables 3, orders 3 including cancel, billing 2, plus a catch-all 404), and 1 test-only route `POST /api/test/events` registered only when `NODE_ENV=test`.
- Server-Sent Events — `GET /api/events` (`server/app.js:47-64`, `server/live/service.js`) — 4 stored event types plus `resync`.
- Screen addresses — `SCREEN_ROUTES` in `server/app.js:6-12`, mirrored by hand in `client/src/App.jsx` — 5 addresses, plus `/` redirecting to `/staff`.
- Internal contract C4 (`shared` in `server/context.js:38-44`) — 5 functions the billing module builds on.

### Frameworks & Libraries

Resolved versions from `package-lock.json`.

- express — 5.3.0 — HTTP server, JSON body parsing, static files
- react, react-dom — 19.3.1 — UI
- react-router-dom — 7.18.5 — client routing
- vite — 7.3.7 and @vitejs/plugin-react — 5.2.0 — client build (runtime dependencies, because `npm start` builds)
- node:sqlite (built in) — database
- vitest — 5.1.0, @vitest/coverage-v8 — 5.1.0, supertest — 7.3.1 — unit and API tests
- @playwright/test — 1.64.1 — browser tests
- typescript — 5.9.3, @types/node — 22.20.5 — editor support for `e2e/` only

### Test Coverage

- **Test Directories**: `tests/server` (9 test files, 2 helpers), `tests/client` (4 test files), `e2e/` (15 spec files in 5 folders, 3 helper files, `timing.ts`).
- **Test Frameworks**: Vitest with supertest; Playwright on Chromium, installed Google Chrome and WebKit.
- **Coverage Config**: present (`vitest.config.js`), V8, `server/**/*.js` except `server/index.js`, enabled on every run. No `thresholds` key exists, so no coverage floor is enforced by the tool. Client code is not measured.
- **Volume by declaration count (not run)**: 170 `it`/`test` declarations in `tests/`, about 119 `test` declarations in `e2e/` (loops add a few more cases, and each runs in 3 browsers).

### Code Quality Indicators

- **Linting**: none. No ESLint, Prettier or other formatter config, and no lint script. `tsconfig.json` covers only `e2e/` and `playwright.config.ts`, with `strict: false`, and no script runs `tsc`.
- **CI/CD**: none. There is no `.github/` folder and no pipeline file.
- **Documentation**: no README in the repo. Doc comments are consistent and explain why, and cite contract and rule IDs (C2, C4, C5, BR…) defined in the v1 intent record.
- **Debt markers**: no `TODO`, `FIXME`, `HACK`, `eslint-disable` or coverage-ignore comments in `server/`, `client/`, `tests/`, `e2e/`.

### Technical Debt Signals

- No schema migration mechanism: `SCHEMA` is `CREATE TABLE IF NOT EXISTS` (`server/platform/db.js:6-62`); there is no `ALTER TABLE`, no `user_version`, no migrations folder. A changed `CREATE TABLE` never reaches an existing database.
- Seed data runs only on an empty database (`seedIfEmpty`, `server/platform/db.js:82-94`), so data added to `seed-data.js` never reaches an existing database.
- No authentication or authorization of any kind; staff routes are open (`server/app.js`). This was a v1 decision, and a test asserts it (`e2e/u3-kitchen-board/board.spec.ts:11`).
- `GET /api/tables` is used by staff and diners (`client/src/screens/diner/useDinerSession.js:61`) and returns every table's orders.
- Status knowledge is repeated: `STATUS_ICONS` and `StatusChip` in 3 files, `STATUS_RANK` and `mergeOrder` in 2, the SQL `CHECK` on `orders.status`, `NEXT_STATUS` on the server, `NEXT_MOVE` on the client.
- Screen routes are listed twice (`server/app.js:6-12`, `client/src/App.jsx`).
- Test helpers are duplicated across Units (`createOwnServer` 3 times plus an inline copy in `skeleton.spec.ts`, `placeByApi` 3 times, `archiveOpenVisit` 2 times, `savePair` 4 times).
- `ApiError` receives `{ cause }` but drops it (`client/src/shared/api.js:5,36`).
- `listBoard` runs one orders query per table and one lines query per order (`server/tables/service.js:51-62`), and each diner tab change triggers it through the visit check.
- The server connection sets no `busy_timeout` or WAL; the e2e helpers write to the same file from another process (`e2e/u2-diner-screens/helpers.ts:12-23`).

## Handoff Summary

- **Intent-relevant finding**: every v2 feature lands on one of a few seams, and the tightest constraint is v1's own tests, not the code.
  - **Data**: `server/platform/db.js` needs a new additive migration step, and existing rows need a separate backfill, because neither `CREATE TABLE IF NOT EXISTS` nor `seedIfEmpty` touches an existing database.
  - **Exact-shape tests**: `toEqual` assertions pin the Order (`tests/server/api.test.js:101`, `tests/server/repos.test.js:85`), order lines (`tests/server/ordering.test.js:34,58`), the repo's menu item (`tests/server/repos.test.js:46`), board table (`tests/server/tables.test.js:39`), opened table (`tests/server/api.test.js:80`), and empty bill (`tests/server/billing.test.js:60`, `tests/server/billing-api.test.js:48`). A new field must be absent when empty, or be added above the repo, or be listed as a chosen v1 test change.
  - **Live events**: the client drops any event type not in `EVENT_TYPES` (`client/src/shared/live.js:3`).
  - **Staff PIN**: `EventSource` cannot send headers, so a header-based PIN cannot protect `GET /api/events`; `GET /api/tables` cannot simply be locked because diners call it; and every staff-page test opens the page directly (full list in `api-documentation.md` and `code-quality-assessment.md` of the candidate).
  - **Cart**: lines are keyed by `itemId` alone (`client/src/screens/diner/cartStore.js:69-112`), so two option choices of one dish would merge.
- **Risks / follow-up**:
  - v1 protection rules forbid changing v1 tests unless a Scope Definition choice makes them out of date. Staff PIN is the one v2 feature that makes a large group of v1 tests out of date unless tests get a sanctioned way past the PIN.
  - The mockup-match specs compare whole lists of text and even bar styles against v1's mockups (`e2e/u3-kitchen-board/mockup-match.spec.ts:83`, `e2e/u4-bill-and-close/mockup-match.spec.ts:65`, `e2e/u1-walking-skeleton/mockup-match.spec.ts:43-54`). A new button in the staff bar or a fourth tab changes those results.
  - The v1 seed must stay at 10 tables, 4 categories and 12 items; several tests count them.
  - No coverage figure could be confirmed in this scan, and the tool enforces no floor.
