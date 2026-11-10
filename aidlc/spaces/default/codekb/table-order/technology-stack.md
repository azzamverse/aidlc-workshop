# Technology Stack

Versions are those resolved in `package-lock.json`.

## Runtime and Languages

| Technology | Version | Notes |
|---|---|---|
| Node.js | >= 22.13.0 (`engines`) | Needed for built-in `node:sqlite` |
| JavaScript (ESM) | ES2022 | Server and client; JSX on the client |
| TypeScript | 5.9.3 | `e2e/` and `playwright.config.ts` only; `strict: false`; never compiled by a script |
| SQL (SQLite) | via `node:sqlite` | `DatabaseSync`, one connection, synchronous |

## Server

| Package | Version | Use |
|---|---|---|
| express | 5.3.0 | Routes, JSON parsing, static files |

No ORM, migration tool, validation library, authentication library or cookie parser. SSE is written directly on the response.

## Client

| Package | Version | Use |
|---|---|---|
| react, react-dom | 19.3.1 | UI, in StrictMode |
| react-router-dom | 7.18.5 | Routing |
| vite | 7.3.7 | Build; a runtime dependency because `npm start` builds |
| @vitejs/plugin-react | 5.2.0 | JSX |

No CSS framework, state library or data-fetching library. Styling is one hand-written stylesheet. Item images are emoji, so there are no image assets.

## Testing

| Package | Version | Use |
|---|---|---|
| vitest | 5.1.0 | Unit and API tests, Node environment |
| @vitest/coverage-v8 | 5.1.0 | Coverage of `server/**` |
| supertest | 7.3.1 | HTTP tests without a port |
| @playwright/test | 1.64.1 | Browser tests: Chromium, installed Chrome, WebKit |
| @types/node | 22.20.5 | Types for `e2e/` |

## Configuration

| Setting | Default | Read by |
|---|---|---|
| `PORT` | 3000 | `server/platform/settings.js` |
| `E2E_PORT` | 3100 | `settings.js`, `playwright.config.ts`, e2e helpers (+100, +200) |
| `DB_FILE` | `data/table-order.db` | `settings.js`; a relative path resolves from the working folder |
| `NODE_ENV` | none | `test` enables `POST /api/test/events` |

## Commands

| Command | Does |
|---|---|
| `npm start` | Builds the client, starts the server |
| `npm run build` | `vite build` to `dist/` |
| `npm test` | `vitest run`; writes `test-results/unit.json` and `coverage/coverage-summary.json` |
| `npm run test:e2e` | `playwright test`; builds and starts its own server; writes `test-results/e2e.json` |

## Generated, Git-Ignored Folders

`node_modules/`, `dist/`, `data/`, `coverage/`, `test-results/`, `playwright-report/`.

## Not Present

Docker, infrastructure code, CI pipeline, linter, formatter, README.
