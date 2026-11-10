# Code Structure

## Layout

```text
client/
  index.html
  src/
    main.jsx, App.jsx           entry point, route table
    shell/                      DinerFrame, StaffFrame
    screens/diner/              MenuScreen, CartScreen, MyOrdersScreen, parts,
                                useDinerSession, cartStore, sessionLogic
    screens/kitchen/            KitchenBoardScreen, AvailabilityPanel, boardLogic
    screens/bill/               TableBillScreen
    shared/                     api, live, money, cartCount, styles.css
server/
  index.js, app.js, context.js  bootstrap, routes, wiring
  platform/                     db, seed-data, transaction, settings, errors, logger
  menu/, tables/, ordering/     service.js and repo.js in each
  live/                         service.js and repo.js
  billing/                      service.js only
tests/server/, tests/client/    Vitest
e2e/                            Playwright, one folder per Unit, plus build-and-test
```

## File Classification

| Category | Files |
|---|---|
| Model/Entity | SQL schema in `server/platform/db.js`; row mappers `toItem`, `toVisit`, `toOrder`, `toEvent` in the repos |
| Controller/Handler | `server/app.js` |
| Service/UseCase | `server/{menu,tables,ordering,billing,live}/service.js` |
| Repository/DAO | `server/{menu,tables,ordering,live}/repo.js` |
| Utility/Helper | `server/platform/{errors,logger,transaction}.js`; `client/src/shared/{api,live,money,cartCount}.js` |
| Configuration | `server/platform/settings.js`, `server/context.js`, `package.json`, `vite.config.js`, `vitest.config.js`, `playwright.config.ts`, `tsconfig.json` |
| Middleware | Inline in `server/app.js`: `express.json`, 404 fallback, error handler |
| UI components | `client/src/screens/**/*.jsx`, `client/src/shell/*.jsx` |
| Client logic without React | `cartStore.js`, `sessionLogic.js`, `boardLogic.js` |
| Migration | None |
| Seed | `server/platform/seed-data.js` |
| Static/Asset | `client/index.html`, `client/src/shared/styles.css` |
| Test | `tests/**`, `e2e/**` |

## Code Patterns

- **Factory functions with injected dependencies**: `createMenuService({ repo, transactions, publishEvent })`. Time is injected as `now`, which is how the tests control the clock.
- **Prepared statements created once** in each repo factory.
- **Refusals as a typed error**: services throw `AppError(status, code, message, details)`. The handler in `app.js` turns it into `{ error: { code, message, ...details } }`. Unknown errors are logged and answered with a generic 500.
- **Transaction joining**: a nested `withTransaction` joins the open one; `afterCommit` queues side effects.
- **Decisions kept out of React**: logic that needs testing sits in plain modules (`sessionLogic`, `boardLogic`, `cartStore`) and is unit-tested directly.
- **Latest read wins**: screens number their reads and ignore stale responses; live changes that arrive during a read are re-applied (`boardLogic.applyRead`).
- **Accessibility conventions**: `aria-disabled` rather than `disabled` where focus must stay on the control; status words shown beside icons; `role="status"` or `role="alert"` on notices.
- **Test ids**: `data-testid` on interactive elements, kebab-case, mostly derived from a domain id (`menu-add-${item.id}`, `board-order-${number}`).
- **Parallel-Unit marks**: `// ROUTE SLOT: Billing (U4)` in `server/app.js:125-131`, and comments naming which Unit owns which file. These reflect how v1 was built in parallel.

## Naming

camelCase for JS identifiers, PascalCase for components, kebab-case for test ids and API words, snake_case in SQL. API JSON is camelCase; repos do the mapping. Money is always integer cents with a `Cents` suffix.

## Conventions a New Unit Must Follow

- Every port and the database file come from `PORT`, `E2E_PORT`, `DB_FILE`, through `readSettings`.
- Page routes use `res.sendFile('index.html', { root: distDir })`, because a Bolt's worktree path passes through a dot-folder.
- Browser tests go in `e2e/<unit>/`, with a `mockup-match.spec.ts`, and save screenshots to `test-results/mockup-match/<unit>/`.
- Parallel Bolts share neither port nor database file.
