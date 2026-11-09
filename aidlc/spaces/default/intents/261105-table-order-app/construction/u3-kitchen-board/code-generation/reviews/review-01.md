## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-05T11:08:20Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | client/src/screens/kitchen/KitchenBoardScreen.jsx > `move` (ORDER_STATE_CONFLICT branch); client/src/screens/kitchen/boardLogic.js > `mergeOrder` | On a refused move the board does `applyChange({ ...order, status: error.details.currentStatus })`. If the refusal body lacks `currentStatus` (a proxy page, or any 409 without the field), `status` becomes `undefined`. `STATUS_RANK[undefined]` makes the comparison false, so the merge goes through, and `StatusChip` then calls `status.toLowerCase()` and throws during render. That would blank the whole board. The contract says the 409 carries the current status, so this is a robustness gap rather than a contract breach. | Guard the branch: if `currentStatus` is not one of the four statuses, treat it as a general failure (BR3.3) or reload the board. Add a test for a conflict without a status. | New |
| R-02 | Minor | client/src/screens/kitchen/AvailabilityPanel.jsx > `useLiveEvents({ onOpen: load, ... })` | The panel opens its own whole-restaurant event stream while it is open, in addition to the board's. Each staff tab with the panel open holds two long-lived HTTP connections to the server. Browsers cap connections per origin (about six on HTTP/1.1), shared across all tabs, so a kitchen running several staff or diner tabs can run out of slots and stall requests. The panel also reads the menu twice on opening (once on mount, once on stream open); the first is discarded by the read counter. | Share the board's stream with the panel, for example by passing `menu.item-updated` and reconnect events down as props. If the separate stream stays, note the connection cost in the code summary. | New |
| R-03 | Minor | client/src/screens/kitchen/AvailabilityPanel.jsx > `<aside>` and focus handling | The panel opens as a plain `aside`. Focus moves in and returns to its button on close, and Escape closes it, which is what BR5.1 asks. But focus is not contained: Tab leaves the panel into the board behind it, and the panel has no `role="dialog"`. A keyboard user can move into the board's buttons, change an order, and have the panel still open. The Escape listener is registered on `document`, so it also fires from the board. | Optional: give the panel a dialog role and keep Tab inside it, or confirm in the design that a non-modal panel is intended and say so in the code summary. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261105-table-order-app/construction/u3-kitchen-board/code-generation/code-summary.md > Known Issues; client/src/screens/kitchen/KitchenBoardScreen.jsx > `loadBoard`, `applyChange` | The summary itself flags that a replayed order event for a closed visit can briefly re-add that order, with no test. Reading the code, the exposure is small because `loadBoard` clears the buffered changes when it starts. But an `order.updated` that arrives while a read is already in flight is kept in `changes` and re-applied over the fresh board, even if that read already reflects a close of the same table. | Add the missing test, or drop buffered changes for a table named in `closedTableIds` when applying a read. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npx vitest run tests/client/boardLogic.test.js` | 1 file, 13 of 13 tests passed. | Matches the "13 new" in code-summary.md. |
| `npx playwright test e2e/u3-kitchen-board` | 31 passed (Chromium). | The Unit's browser tests pass, including both "regression:" focus tests and the keyboard move to "Open bill". |
| `npm test && npm run test:e2e` | `npm test`: 11 files, 186 of 186 passed, 98.75% lines (869 of 880). `npm run test:e2e`: 98 of 98 passed. | Matches code-summary.md exactly. Default ports; 3000 and 3050 untouched. I did not re-run the `E2E_PORT=5100` run the summary reports. |

### Summary

The code follows the design and its test claims check out. The newest-read-wins merge, the one-step move buttons, and the `aria-disabled` reading of BR3.1 and BR4.2 all hold, and the choice keeps keyboard focus on the control, which the two regression tests cover. The weaknesses are Minor: a refusal without a current status can crash the board, the panel's second event stream costs a browser connection, the panel does not hold focus, and the replay edge is untested.
