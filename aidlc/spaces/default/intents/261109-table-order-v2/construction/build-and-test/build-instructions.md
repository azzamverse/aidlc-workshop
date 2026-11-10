# Build Instructions

Inputs: each Unit's `code-generation-plan.md`, `unit-test-instructions.md` and `code-summary.md` for `u5-foundation`, `u6-diner-staff-features` and `u7-3d-xfactors`.

## Install

`npm install` (includes `three`, added by U7). Playwright browsers: Chromium and WebKit through `npx playwright install`; Google Chrome is the installed browser. Firefox is not installed.

## Settings

| Setting | Default | Use |
|---|---|---|
| `PORT` | 3000 | The app the team uses, main folder only |
| `E2E_PORT` | 3100 | Browser tests (+100 and +200 for specs with their own server) |
| `DB_FILE` | see `server/platform/settings.js` | SQLite file |
| `STAFF_PIN` | random, logged at start | 4-digit staff PIN |

## Build and run

- Build: `npm run build`
- Start: `npm start`, then open `/table/<n>` for a diner and `/staff` for staff.

## Verify the build

The build ends with "built in" and no error. Vite warns that one chunk is over 500 kB. That chunk is the three.js code, loaded only when a 3D view opens (NFR13).

## Troubleshooting

- "is already used" from Playwright: a stopped run left a server on `E2E_PORT`. Stop it and run again.
- A missing `three` import: run `npm install`.
