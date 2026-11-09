## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-05T10:35:37Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | client/src/screens/diner/useDinerSession.js > `everConnected` (module level) and `reconnecting: isReconnecting({ connected, everConnected })`; client/src/shared/live.js > `useState(false)` | Every tab press mounts a new screen, which opens a new event stream, and `connected` starts false in `useLiveEvents`. `everConnected` stays true for the page's life, so each remounted screen shows the "Reconnecting… we'll catch up" notice (a `role="status"` live region) until its stream opens, even with a healthy connection. This is read from the code, not observed in a browser. No test covers it: the only reconnect specs stop the server. It briefly shifts the layout and may make a screen reader announce a false network fault. BR4.3 says the notice shows only while the stream is down after the first connection. | Show the notice only after a stream the screen itself opened has dropped (for example, track "this hook instance connected once"), not from the page-wide flag. Add a browser test that a tab press never shows `reconnecting`. | New |
| R-02 | Minor | client/src/screens/diner/useDinerSession.js > `restarts` map and the tab-press handler | A tab press on the closed card puts the table in `restarts` and calls `reloadTable()`. The entry is removed only when a new table object arrives. If that reload fails or returns the same object, the device ignores every event and every visit check until the page is refreshed (BR6.2's restarting guard, `decideEvent` and `decideVisitCheck`). No test or code path covers a failed restart. | Clear the `restarts` entry when `reloadTable` fails or does not produce a new table, or document that a refresh is the recovery. Add a test for the failed restart. | New |
| R-03 | Minor | client/src/screens/diner/CartScreen.jsx > `submit` | `submit` always calls `cart.clear()` and navigates to My orders after a successful `placeOrder`. If `table.closed` arrives while the request is in flight, `markClosed` has already emptied the cart and shown the closed card. A success that arrives afterwards still navigates away and shows "Order #N placed" over a visit the device has just reset. The order exists on the server, so this misleads rather than loses data, and it is a narrow window. | After the await, check whether the session closed, and then do not navigate. Keep the closed card, or confirm the intended message. | New |
| R-04 | Minor | client/src/screens/diner/cartStore.js > `readSaved` and `deviceStorage` | A saved cart is rejected if any line fails validation, and the whole cart becomes empty. That fits BR2.3's "unreadable counts as empty". But a cart saved with extra or missing fields, such as `image`, is not exercised. The `typeof line.name` check does not cover `image`, so a missing image is accepted and rendered. | Optional: record in the tests that a line without `image` is accepted and renders without error. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261105-table-order-app/construction/u2-diner-screens/code-generation/code-summary.md > Test Results | The summary reports 98.75% line coverage as "Server coverage" and notes that client code is not measured. The tests/client run, and the full-suite coverage, both measure none of the 1,000-plus lines of client code that this Unit adds. The plan sets no floor, so nothing is violated. The browser tests are the only evidence for the screens and for `useDinerSession.js`, which has no unit tests of its React behaviour. | No change is required. At Build and Test, either measure client coverage or keep the sentence that the screens are covered by browser tests only, so a reader does not take 98.75% as a Unit figure. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npx vitest run tests/client` | 2 files, 34 of 34 tests passed. The coverage block printed 0 of 880 lines because only the client tests ran. | Matches the summary's "34 new". The 0% is an artifact of the narrow run, not a defect. |
| `npx playwright test e2e/u2-diner-screens` | 52 passed (Chromium). | The Unit's own browser tests pass, including the BR6.2 specs: no visit starts until a tab press, the missed-close check goes through the board read only, and a stale `table.closed` does not wipe a new cart. |
| `npm test && npm run test:e2e` | `npm test`: 9 files, 172 of 172 passed, 98.75% lines (869 of 880) and 98.75% statements. `npm run test:e2e`: 64 of 64 passed. | Matches code-summary.md exactly. I ran these on the default ports and did not touch 3000 or 3050. The summary's note that the E2E_PORT=4100 run predates the last test is not something I re-ran. |

### Summary

The code matches the design and the stated test results, and I found no correctness defect in BR6.2, the placement key, escaping or keyboard use. The cart store takes a new key whenever the lines change. A closed device ignores events and checks the visit only through the board read. Server text is rendered as plain text. The main weaknesses are the false "Reconnecting" flash on every tab press, an unrecoverable failed restart, and a narrow place-then-close race. All are Minor.
