# Build and Test Summary: Table Order

## Status

The app builds and starts with one command. Every test has passed in Chromium, Google Chrome and WebKit; the last full run had one WebKit timing failure in a test, fixed and rerun on its own (see `test-results.md`).

## Test Types

| Type | Where it runs | Count |
|---|---|---|
| Unit and integration (server, client logic) | Node, Vitest | 206 |
| Browser journeys, mockup match, keyboard, reduced motion | Real browser engines through Playwright: Chromium, Google Chrome, WebKit | 122 per browser, 366 in all |

## Coverage

No coverage floor is set in this scope. Server lines: 98.8%. Client code is covered by browser tests and not measured.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| NFR1 | requirements.md | Live changes within 2 s | Within 2 s of the request in all three browsers | Timed browser tests, `e2e.json` | build-and-test | Met |
| NFR2 | requirements.md | Orders survive a restart | Passed | `skeleton.spec.ts` restart test | build-and-test | Met |
| NFR3 | requirements.md | Five screens match their mockups | Passed; pairs reviewed for every screen | `test-results/mockup-match/` | build-and-test | Met |
| NFR4 | requirements.md | 360 px diner, 1024 px staff, no clipping | Passed | Width tests in U2 and U3 | build-and-test | Met |
| NFR5 | requirements.md | Inputs validated, text never runs | Passed | Server API tests, markup test | build-and-test | Met |
| NFR6 | requirements.md | Whole journey by keyboard; status words | Passed in all three; in WebKit links are focused directly | `keyboard-journey.spec.ts` | build-and-test | Met |
| NFR7 | requirements.md | No motion under reduced motion | Passed | Reduced-motion tests | build-and-test | Met |
| NFR8 | requirements.md | Exact cents | Passed | Billing tests | build-and-test | Met |
| NFR9 | requirements.md | Works in Chromium, Chrome, WebKit | 365 of 366, the one fixed and rerun | `e2e.json`, rerun | build-and-test | Met |
| NFR10 | requirements.md | Settings from env; command runs all | Passed on ports 3100, 4100, 5100 and 6100 | Per-Unit runs | build-and-test | Met |
| NFR11 | requirements.md | Failures logged and shown | Passed | Refusal and failure tests | build-and-test | Met |
| CI | org.md | CI before merge | N/A | The plan runs no CI Pipeline | none | N/A |

## Readiness

Build-ready and test-ready. Not deployed: the app runs locally by design.

## Known Limitations

- WebKit on this Windows machine is slow, and Tab there never reaches links.
- The live-update timing starts when the request leaves the browser.
- `npm audit` reports 7 vulnerabilities, all in development tools.
