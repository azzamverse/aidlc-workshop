# Test Results

Run on the merged app (U5, U6, U7 and v1) in the main folder, 2026-11-10, from each Unit's `code-generation-plan.md`, `unit-test-instructions.md` and `code-summary.md`.

An earlier full run was stopped part way through WebKit to save time. The team then asked for a re-run, and the results below are from that complete run.

## Build

`npm run build`: success.

## Tests

| Run | Where it ran | Result |
|---|---|---|
| `npm test` | Node | 33 files, 482 passed, 0 failed |
| Coverage, server code only | Node | Lines 98.29%, branches 94.06%, functions 98.77%, statements 98.28% |
| `npm run test:e2e`, Chromium | Real browser engine | 228 passed, 0 failed |
| `npm run test:e2e`, Google Chrome | Real browser engine | 228 passed, 0 failed |
| `npm run test:e2e`, WebKit | Real browser engine | 228 passed, 0 failed |

The browser total is 684 passed in 24.8 minutes, with none skipped and none flaky. It includes `e2e/build-and-test/v2-widths-and-keyboard.spec.ts`, added at this stage.

### A failure in the stopped run

In the stopped run, "the open bill stays current with no refresh" (`e2e/u4-bill-and-close/bill.spec.ts:81`) failed once in Google Chrome. It passed when run alone and passed in the complete run. The cause was not investigated, so it may fail again now and then. No test or limit was changed.

## Not repeated

A fresh mockup-match look at v1 and U5's screenshot pairs. Their mockup-match specs passed in the complete run, and U6 and U7's 11 pairs were looked at on the merged app.
