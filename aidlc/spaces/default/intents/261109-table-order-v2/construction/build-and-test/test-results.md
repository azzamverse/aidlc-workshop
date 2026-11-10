# Test Results

Run on the merged app (U5, U6, U7 and v1) in the main folder, 2026-11-10, from each Unit's `code-generation-plan.md`, `unit-test-instructions.md` and `code-summary.md`.

**The run was cut short.** The team asked on 2026-11-10 to finish as soon as possible, even if that meant skipping some tests. The full three-browser run was stopped part way through WebKit.

## Build

`npm run build`: success.

## Tests

| Run | Where it ran | Result |
|---|---|---|
| `npm test` | Node | 33 files, 482 passed, 0 failed |
| Coverage, server code only | Node | Lines 98.29%, branches 94.06%, functions 98.77%, statements 98.28% |
| `npm run test:e2e`, Chromium | Real browser engine | 228 passed, 0 failed |
| `npm run test:e2e`, Google Chrome | Real browser engine | 227 passed, 1 failed, then passed when run alone |
| `npm run test:e2e`, WebKit | Real browser engine | Stopped part way. The saved report shows 26 passed, 28 failed and 174 not run, out of 228. 24 had passed with no failures just before the stop; the 28 failures were recorded around the stop and their cause was not confirmed |
| `e2e/build-and-test/v2-widths-and-keyboard.spec.ts`, added at this stage | Chromium only | 6 passed |

### The failure in Google Chrome

"the open bill stays current with no refresh" (`e2e/u4-bill-and-close/bill.spec.ts:81`, test 341) failed once in the full run after 2.9 s, and passed when run alone in Google Chrome. It is a v1 test, and it passed in Chromium. The cause was not investigated, so this may be a flaky test or a timing fault. No test or limit was changed.

## Skipped

- The rest of the WebKit browser tests, so the merged app has not been shown to work in Safari's engine.
- The new width and keyboard spec in Google Chrome and WebKit.
- A fresh mockup-match look at v1 and U5 pairs. U6 and U7's 11 pairs were looked at on the merged app.
