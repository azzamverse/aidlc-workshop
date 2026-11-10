## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-09T17:17:02Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261109-table-order-v2/construction/u5-foundation/code-generation/code-summary.md > Test Results | The browser suite has no complete green run after the last fixes. The final rerun was killed for low memory (88 passed, 10 crashed, the rest never ran). The edits to e2e/u3-kitchen-board/moves.spec.ts:27 and e2e/u4-bill-and-close/close.spec.ts:93 are marked unconfirmed. This review did not run the browser suite either. Roughly 40 v1 specs were edited for the PIN, and none has been seen passing in a full pass after the final edits. | Run `npm test && npm run test:e2e` in full at the checkpoint, and confirm those two specs and the Chromium suite before sign-off. Treat any failure there as blocking. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/construction/u5-foundation/code-generation/code-summary.md > Test Results | The table is stale. `npx vitest run` now gives 20 files and 311 tests, all passed, with statements 97.82%, branches 92.68% and lines 97.88%. That run includes `tests/client/staffGate.test.js`, which the summary lists as "Not run" and gives a count of 301. | Update the table to the current vitest result so the gate reader sees accurate evidence. | New |
| R-03 | Minor | server/staff/service.js > `attempts` map and `recordWrongTry` | Entries are removed only when a lockout expires. An address with 1 to 4 wrong tries is never evicted. The map grows without bound under many source addresses, whereas `sessions` is capped at `MAX_SESSIONS`. Also, `req.ip` is the lockout key and no `trust proxy` setting is made. Behind a reverse proxy every client shares one address, so five wrong tries by anyone lock staff out for 30 seconds. | Cap the map's size or expire stale non-locked entries. State in the code or unit-test-instructions.md that the deployment is direct and not behind a proxy, or set `trust proxy` explicitly. | New |
| R-04 | Minor | server/app.js > `registerTableRoutes`, `registerOrderRoutes`, `registerLiveRoutes` (BR2.1, BR2.2) | "A stream for one table" is limited only by the caller-supplied `tableId` query. Any diner can open another table's stream, or read `GET /api/tables/:id/orders` or cancel an order there, by changing the id. This matches the no-diner-login decision (BR2.1), but the summary's "limited to its table" reads as stronger than it is. | Word the claim in code-summary.md as "filtered by the requested table id, not authenticated". Keep it recorded as an accepted limit of the no-diner-login decision. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npx vitest run` | PASS: 20 files, 311 tests passed, 0 failed. Coverage: statements 97.82%, branches 92.68%, functions 98.42%, lines 97.88%. | The server rules (PIN, lockout, live-stream filter, upgrades, seed details) and the client logic are covered. The 80% floor holds. |
| `npm run test:e2e` (browser suite) | NOT RUN: stopped earlier for low memory, and this pass was told not to run it. | The full `npm test && npm run test:e2e` is still owed at the checkpoint (see the Major row). |
| Source manifest check | Every changed or new source path outside `aidlc/` and `V2 Scope/` is listed in `source-manifest.json`, apart from `ideas/table-order-v2/`, which is the brief and not Unit code. | The manifest is complete. |

### Summary

U5 follows the design on a differential read. Staff-only routes and the all-tables stream sit behind `requireStaff`, the PIN is compared in constant time, the lockout and session handling match BR1.1 to BR1.5, the test-only reset route exists only when `isTestMode` is set, and the database upgrade is add-only with one transaction per step. The one item to weigh before sign-off is that the browser suite, including the heavily edited v1 specs, has not completed green since the last fixes.
