# Technology Stack

## Present in the Repo

| Technology | Version | Use |
|---|---|---|
| Markdown | n/a | Brief and question script |
| git | n/a | Version control, `.gitignore` |

No programming language is present. The workspace scan recorded Python, but the repo contains no `.py` files, so that entry should not guide later stages.

## Required by the Brief (Not Installed)

No versions are stated and nothing is pinned, so the versions are open for later stages to choose.

| Technology | Version | Use | Source |
|---|---|---|---|
| React | Not stated | Single-page app for both views | `IDEA.md` line 38 |
| Node.js | Not stated | Server runtime | `IDEA.md` line 38 |
| Express | Not stated | HTTP server | `IDEA.md` line 38 |
| SQLite | Not stated; driver not chosen | Storage | `IDEA.md` line 38 |
| Server-Sent Events | Browser standard | Live updates | `IDEA.md` line 38 |
| npm | Not stated | `npm install && npm start` | `IDEA.md` line 40 |

The brief does not choose between JavaScript and TypeScript, and does not name a bundler or CSS approach.

## Implied for Testing (Not Installed)

| Technology | Evidence |
|---|---|
| Playwright | `playwright-report/` in `.gitignore` line 34 |
| Chromium, Google Chrome, WebKit | Browsers checked at Build and Test, `QUESTIONS.md` line 412 |
| An npm test runner with coverage output | `npm test && npm run test:e2e` at `QUESTIONS.md` line 343; `coverage/` and `test-results/` in `.gitignore` lines 32-33. The unit test runner is not named. |

## Infrastructure

None. The brief runs locally only, at http://localhost:3000, and puts cloud deployment out of scope.
