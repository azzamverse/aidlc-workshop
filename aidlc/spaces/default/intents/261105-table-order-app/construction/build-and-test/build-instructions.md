# Build Instructions: Table Order

## Prerequisites

Node 22.13 or later (the database uses Node's built-in `node:sqlite`).

## Install and Start

```
npm install
npm start
```

`npm start` builds the screens with Vite and serves the app at http://localhost:3000.

## Settings

| Variable | Default | Use |
|---|---|---|
| `PORT` | 3000 | The app |
| `E2E_PORT` | 3100 | Browser tests; specs with their own server use + 100 and + 200 |
| `DB_FILE` | a file under `data/` | The SQLite database |

## Verify the Build

Open http://localhost:3000/staff and http://localhost:3000/table/5.

## Troubleshooting

- `EADDRINUSE`: another copy holds the port. Stop it or set `PORT`.
- Browser tests cannot launch: run `npx playwright install chromium webkit`. Google Chrome must be installed. Firefox is not used.
- WebKit on Windows is slow: a full run of all three browsers takes over 20 minutes.
