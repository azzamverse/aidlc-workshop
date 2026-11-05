# Code Summary: u1-walking-skeleton

## Files Created or Changed

- Project: `package.json`, `package-lock.json`, `.gitignore` (added `data/`), `vite.config.js`, `vitest.config.js`, `playwright.config.ts`
- Server: `server/` (`index.js`, `app.js`, `context.js`, `platform/`, `menu/`, `tables/`, `ordering/`, `live/`)
- Client: `client/` (`index.html`, `src/main.jsx`, `src/App.jsx`, `src/shell/`, `src/shared/`, `src/screens/`)
- Tests: `tests/server/`, `e2e/u1-walking-skeleton/`

## Key Decisions

- Live events are stored inside the caller's transaction and sent after commit, so a rollback removes them and replay works after a restart.
- `withTransaction` refuses async work and joins an outer transaction, so U4's close work must be synchronous.
- Conflict refusals carry `currentStatus` beside `code` and `message`.
- Seams: U2 calls `setCartCount` and replaces `screens/diner/`. U3 passes its button as a `StaffBar` child and replaces `screens/kitchen/`. U4 fills the Billing slot in `server/app.js` and replaces `screens/bill/`.

## Test Results

From the developer's last run of `npm test && npm run test:e2e`:

| Check | Result |
|---|---|
| Unit and integration | 138 of 138 passed in 7 files |
| Server coverage (no floor set) | 98.75% lines, 96.35% branches, 96.96% functions; `server/index.js` is not measured |
| Browser, Chromium | 12 of 12 passed: 6 skeleton, 6 mockup match |

## Tests Written but Not Run Here

- Chrome and WebKit: these belong to Build and Test.
- Parallel Bolt ports other than 4100: the browser tests passed 12 of 12 with `E2E_PORT=4100` and their own `DB_FILE`.
- A real start on port 3000: only the default value is unit-tested. A clean-install start was run on port 3555. The checkpoint's start is the first real proof on 3000.

## Bugs Found by the Tests and Fixed

None. Two first-run test failures were mistakes in the tests themselves.

One application bug was found by reading the code: a missing `dist/index.html` was reported as `400 VALIDATION_FAILED` instead of a logged 500. It is fixed in `toRefusal` in `server/app.js` and covered by "a missing build is reported as a logged 500" in `tests/server/api.test.js`. That test was later checked: it fails without the fix and passes with it.

## Review Follow-Ups

- `POST /api/test/events` exists only when `NODE_ENV=test`. U2 and U3's browser tests rely on it, and the Playwright server must run in that mode.
- Event replay and pruning both use one hour. Both are synchronous, so a prune cannot fall between the window check and the replay.
- The 7 development-only audit findings are accepted for this local workshop app.

## Deviations From the Plan

- Added beyond the plan: `react-router-dom`, `typescript`, `server/context.js`, `server/platform/logger.js`, `server/platform/seed-data.js`.
- Added beyond the contract: `/` redirects to `/staff`; `/api/events?tableId=` returns 404 for an unknown table; a new stream receives a bare `id:` frame; `archiveVisit` throws `409 VISIT_NOT_OPEN`.
- The developer ticked plan steps 3 to 8 with a shell command, against the brief. Only the ticks changed.

## Known Issues

- `npm audit` reports 7 vulnerabilities (5 moderate, 2 critical), all in development dependencies through Vitest 3. `npm audit --omit=dev` reports 0. Fixing them needs a breaking Vitest upgrade the plan does not name.
- On the plain board, an event arriving during a reload can be overwritten until the next reload. U3 replaces this file and should guard against it.
- On the Kitchen Board, "Live" sits at the far right until U3 adds the "Menu availability" button.
