# Code Quality Assessment

This scan only read the code. No test suite, build or coverage tool was run, so every statement below comes from the source, and none is a measured result.

## Summary

| Area | Rating | Basis |
|---|---|---|
| Naming clarity | Good | Names are self-explanatory; money always carries `Cents` |
| Function size | Good | Short functions. The largest components are `TableBillScreen` and `KitchenBoardScreen` |
| Error handling | Good | One error type and shape; failures logged; client states for each failure |
| Test presence | Good | Every domain and screen has tests, including races and reconnects |
| Duplication | Fair | Status helpers and test helpers are repeated |
| Dead code | Good | None material; `.panel:target` in the stylesheet exists for the mockups |
| Tooling | Poor | No linter, formatter, CI or type-check script |

## Tests

| Suite | Location | Declarations |
|---|---|---|
| Server unit and API | `tests/server/` (9 test files) | 128 `it`/`test` declarations |
| Client logic | `tests/client/` (4 test files) | 42 |
| Browser | `e2e/` (15 spec files) | about 119, plus a few from loops, each across 3 browsers |

These count declarations in the source; an `it.each` counts as one.

Coverage is configured for `server/**/*.js`, except `server/index.js`. **No `thresholds` key is set in `vitest.config.js`**, so the tool does not enforce a floor. Client code is not measured by coverage; it is exercised by Playwright.

Test practices worth keeping: real SQLite and real HTTP rather than mocks, regression tests named "regression: …", a clock injected for time-based logic, live-update limits timed in the page.

## v1 Tests Pinned to Exact Shapes

A `toEqual` assertion fails when a field is added. Under the Protecting v1 rule, a v1 test changes only when a chosen change makes it out of date.

| Shape | Assertion | Way to avoid changing the test |
|---|---|---|
| Order, API response | `tests/server/api.test.js:101` | Add the field only when it has a value |
| Order, repo | `tests/server/repos.test.js:85` | Same |
| Order lines | `tests/server/ordering.test.js:34`, `:58` | Same |
| Menu item, repo | `tests/server/repos.test.js:46` | Add at service level, or only when it has a value |
| Board table | `tests/server/tables.test.js:39` | Add only when it has a value |
| Opened table | `tests/server/api.test.js:80` | Add only when it has a value |
| Empty bill | `tests/server/billing.test.js:60`, `tests/server/billing-api.test.js:48` | Add only when it has a value |
| Live frame, exact text | `tests/server/live.test.js:39`, `:92`, `tests/server/api.test.js:269`, `tests/server/menu.test.js:49` | Keep existing payloads; use new event types |
| Saved cart line | `tests/client/cartStore.saved.test.js:13` | Do not rewrite old lines on load |

Assertions with `toMatchObject`, `toHaveProperty` or field checks tolerate additions.

## v1 Tests Sensitive to Screen Changes

| Change | Test that notices | Detail |
|---|---|---|
| Fourth bottom tab | `e2e/u1-walking-skeleton/mockup-match.spec.ts:38-54,78-81` | Compares tab labels and grid columns with `menu.html` |
| New button in the staff bar | `e2e/u3-kitchen-board/mockup-match.spec.ts:83` (`.staff-bar .btn`), `e2e/u4-bill-and-close/mockup-match.spec.ts:65` (`.staff-bar` text) | Exact text lists |
| Button in a table card header | `e2e/u3-kitchen-board/mockup-match.spec.ts:83` (`.table-card header .btn`) | Exact text list |
| New text in a menu card `<p>` | `e2e/u2-diner-screens/mockup-match.spec.ts:89` (`article.item p`) | Exact text list |
| New `.notice` or `.status` on My orders | `e2e/u2-diner-screens/mockup-match.spec.ts:136` | Exact text list |
| Extra `article.card` on My orders, extra `section.card` on the bill | `e2e/u2-diner-screens/cart.spec.ts:76`, `orders.spec.ts`, `e2e/u4-bill-and-close/mockup-match.spec.ts:61` | Counts |
| `+ Add` opening a sheet instead of adding | Nearly every diner flow, through the `add` helper (`e2e/u2-diner-screens/helpers.ts:108`) | Used with most seeded items |
| More seeded items, categories or tables | `tests/server/platform.test.js:25`, `tests/server/menu.test.js:17`, `e2e/u2-diner-screens/menu.spec.ts:24`, `e2e/u3-kitchen-board/availability.spec.ts:11`, `e2e/u1-walking-skeleton/skeleton.spec.ts:68,119` | Exact counts |
| A login step on staff pages | Listed in `api-documentation.md` | Plus `e2e/u3-kitchen-board/board.spec.ts:11`, "opens with no login" |

## Tooling and Documentation

- **Linting and formatting**: none configured.
- **Type checking**: no script. `e2e/` has a lenient config.
- **CI/CD**: none.
- **Documentation**: no README. Doc comments are good, but cite IDs (C2, C4, C5, BR…) defined only in the v1 intent record.
- **Debt markers**: no TODO, FIXME, HACK or lint-suppression comments.

## Security Notes

| Finding | Location | Note |
|---|---|---|
| No authentication on any route, staff included | `server/app.js` | Deliberate in v1. Staff PIN addresses part of it |
| Any device can read all tables' orders | `GET /api/tables`, `GET /api/events` with no `tableId` | Includes every table's items |
| Table access is by guessable address | `/table/1` to `/table/10` | `GET /api/tables/:id` returns the `visitId` needed to order |
| A GET that changes data | `GET /api/tables/:id` starts a visit | Deliberate, and tests guard when it is called |
| Good practice present | Body-size limit, input validation at the boundary, generic 500 messages, parameterised SQL, React escaping with a test for it, `x-powered-by` off | Keep |

## Technical Debt

| Item | Location | Effect on v2 |
|---|---|---|
| No migrations | `server/platform/db.js` | Must be built first; every data feature needs it |
| Seed runs only on an empty database | `server/platform/db.js:82-94` | Needs a separate backfill |
| Status knowledge in about 6 places | `STATUS_ICONS` ×3, `STATUS_RANK` ×2, `NEXT_STATUS`, `NEXT_MOVE`, SQL `CHECK`, CSS | Avoid new statuses, or expect wide edits and a non-additive table change |
| No record of when a status changed | `orders` has only `placed_at` | An estimated wait has no history to draw on; `live_events` is pruned after an hour |
| Streams opened per screen | `useDinerSession.js`, `live.js` | Notifications need a decision on where to listen |
| Routes listed twice | `server/app.js`, `client/src/App.jsx` | Each new address is two edits |
| Duplicated test helpers | `e2e/*/helpers.ts`, `savePair` ×4 | A PIN step would be repeated unless centralised |
| Board read scales per table and per order | `server/tables/service.js:51-62` | Small at 10 tables; runs on each diner tab change |
| `ApiError` drops `cause` | `client/src/shared/api.js:5,36` | Minor |
| No `busy_timeout` or WAL on the server connection | `server/platform/db.js` | Low; e2e helpers write from another process |
