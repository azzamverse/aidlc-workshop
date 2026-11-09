## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-05T11:59:05Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | client/src/screens/bill/TableBillScreen.jsx > `RETURN_TO_BOARD_MS` and the `closed` effect | After a successful close, the screen shows "Table N closed. It's ready for the next diner." and then navigates to `/staff` automatically after exactly 2 seconds, with no way to pause, extend or cancel it. The project requires WCAG 2.1 AA (NFR6), and an automatic, unadjustable page change is a timing failure under that standard (success criterion 2.2.1). A screen reader user may not finish hearing the message, and a keyboard user loses their place when the page changes under them. The confirmation is also the only record that the close worked. | Do not navigate automatically. Keep the confirmation and offer a "Back to board" button (the bar already has a link), or lengthen the delay and let staff cancel it. Update the mockup-match and close tests to match. | New |
| R-02 | Minor | client/src/screens/bill/TableBillScreen.jsx > `CloseButton` and the `closed` branch; code-summary.md > Known Issues | The code summary notes that after a successful close the focused "Close table" button disappears, so keyboard focus falls to the page until the redirect. No code moves focus to the confirmation. A keyboard or screen reader user is left on `body` with no cue. | Give the confirmation `tabIndex={-1}` and focus it when `closed` becomes true, and add a keyboard test. | New |
| R-03 | Minor | client/src/screens/bill/TableBillScreen.jsx > `close` (catch branch) | If the close request reaches the server but the response is lost (timeout or network error), the screen shows "We couldn't close this table. Please try again." and then reloads. The reload shows an empty bill with the button unavailable, because the table did close. Staff see a failure message beside a table that is already closed. A repeat press is harmless (the server answers 200), but only if the button is still shown. | For a network error with no server answer, reload first and, if the table now has no visit, show the closed confirmation instead. Or word the message "We couldn't confirm the close. Check the board." | New |
| R-04 | Minor | server/app.js > BILLING ROUTES slot and the import at the top | The slot's comment says U4 "edits nothing else in this file", yet U4 added an import line outside the slot. The summary records this deviation, and it is harmless at runtime. It also means the slot no longer isolates U4's edit. | No change needed beyond keeping the deviation recorded. If the project wants strict isolation, load the service by dynamic import inside the slot. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npx vitest run tests/server/billing.test.js tests/server/billing-api.test.js` | 2 files, 20 of 20 tests passed. | Matches the "20 new" in code-summary.md. |
| `npx playwright test e2e/u4-bill-and-close` | 21 passed (Chromium). | The Unit's browser tests pass, including the mockup-match states. |
| `npm test && npm run test:e2e` | `npm test`: 13 files, 206 of 206 passed, 98.8% lines (913 of 924). `npm run test:e2e`: 120 of 120 passed. | Matches code-summary.md exactly. Default ports; 3000 and 3050 untouched. I did not re-run the `E2E_PORT=6100` run the summary reports. |

### Summary

The server side is sound: `closeTable` checks, archives and queues `table.closed` inside one `withTransaction`, a refused close throws before anything changes, a repeat close returns 200 with no event, an unknown table is checked first, and money is summed in whole cents from the orders' totals. The read-race guard on the screen is also right. The one significant defect is the fixed 2-second automatic return after a close, which conflicts with the project's WCAG 2.1 AA requirement. The remaining findings are Minor and concern focus after a close, a lost close response, and a one-line deviation in `server/app.js`.
