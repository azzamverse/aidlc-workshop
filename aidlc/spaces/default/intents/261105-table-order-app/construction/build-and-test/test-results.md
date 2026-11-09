# Test Results: Table Order

## Build

`npm run build` (Vite) ran inside every browser run's server start, with no errors. It warns that one chunk is over 500 kB; that is advice, not a failure.

## Unit and Integration Tests

`npm test`: 13 files, 206 of 206 passed. Server line coverage 98.8%. No coverage floor is set in this scope. Client code is not measured; the screens are covered by browser tests.

## Browser Tests (real browser engines through Playwright)

Last full run of `npm run test:e2e` on 2026-11-06, across Chromium, Google Chrome and WebKit: 365 of 366 passed, in 16.8 minutes.

| Failure | Cause | Fix | Evidence after the fix |
|---|---|---|---|
| WebKit: "a failed placement keeps the cart, reads "Placing…" while waiting, and the retry reuses the key" | The test's 300 ms simulated delay ended before WebKit's slow click returned, so the button was enabled again before it was checked | The test now holds the request until it has checked "Placing…" | `npx playwright test e2e/u2-diner-screens/cart.spec.ts:82`: 3 of 3 passed, one per browser |

So every test has passed in all three browsers, but the last full run had that one failure, fixed and then rerun on its own.

## Changes to Tests During This Stage (no limit changed)

- **Live-update timing:** WebKit on this Windows machine took about 3 seconds to turn a click into a request, while delivery was almost instant: a measurement showed the board updating within 0.1 seconds of the request. The four live-update tests that failed in WebKit now start their 2-second clock when the request leaves the browser (`e2e/timing.ts`). The close test also measures arrival inside both browser pages. The 2-second limit is unchanged.
- **WebKit time:** each WebKit test gets 180 seconds overall, because its clicks and screenshots are slow here.
- **Driven clicks:** two tests that pressed a button 18 or 20 times now press it in the page, so they don't outlast WebKit's time.
- **Keyboard journey:** in WebKit, Tab never lands on links, in this build on Windows, even with Option held. There the test focuses each link directly and presses Enter. Reaching links by Tab is proved in Chromium and Google Chrome.

## After Approval (2026-11-09)

- **Test tools upgraded:** Vitest and its coverage tool moved to version 5, which clears all 7 `npm audit` findings (0 now). `npm test`: 206 of 206 passed, server lines 97.7%.
- **Type-check:** a `tsconfig.json` and `@types/node` were added. `npx tsc -p .` passes for `playwright.config.ts` and every file in `e2e/`, with strict mode off.
- **Full browser run:** 365 of 366 passed, in 32.6 minutes. The one failure was a different WebKit test, "a change reaches an open Menu within 2 seconds": its 2-second check for "Sold out" passed, but the clock was read after WebKit's automation had reported back (5.8 seconds).
- **Fix:** that test now reads the arrival time inside the page. The 2-second limit is unchanged. Rerun with `--repeat-each=5`: 15 of 15 passed across the three browsers. The full set was not run again after this one-test change.

## Earlier Run

The run before these fixes: 355 of 366 passed, 11 WebKit failures, all timing or time-outs as described above.

## Loop-Back Log

None.
