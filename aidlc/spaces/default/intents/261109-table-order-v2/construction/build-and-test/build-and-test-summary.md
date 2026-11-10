# Build and Test Summary

**Build:** success. **Readiness:** build-ready and test-ready in Chromium, Google Chrome and WebKit.

Test types: unit and server (Node), browser (Playwright in real browser engines), mockup match, keyboard, widths. Sources: each Unit's `code-generation-plan.md`, `unit-test-instructions.md` and `code-summary.md`, and `requirements.md`. No `nfr-requirements` or `nfr-design` stage ran in this plan.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| COV-LINES | Testing Contract | Line coverage at least 80% | 98.29%, server code only | `npm test` | build-and-test | Met |
| CI-MERGE | Testing Contract | Tests in CI before merge | The plan runs no CI Pipeline | `aidlc-state.md` | build-and-test | N/A |
| NFR1 | requirements.md | Live changes within 2 s | Passed | Chromium, U6 specs | build-and-test | Met |
| NFR2 | requirements.md | Survive a restart | Passed | Node and Chromium | build-and-test | Met |
| NFR3 | requirements.md | Mockup-match specs pass | Passed; 11 U6 and U7 pairs looked at | Chromium | build-and-test | Met |
| NFR4 | requirements.md | 360 px and 1024 px, no sideways scroll | No sideways scroll on the checked screens; clipped content not measured | `v2-widths-and-keyboard.spec.ts`, Chromium | build-and-test | Met |
| NFR5 | requirements.md | Server checks, safe cookie, validation | Passed | Node and Chromium | build-and-test | Met |
| NFR6 | requirements.md | Keyboard, 44 px, words | Passed | U5, U6 and U7 specs and the new spec, Chromium | build-and-test | Met |
| NFR7 | requirements.md | No motion when reduced | Passed | Chromium | build-and-test | Met |
| NFR8 | requirements.md | Exact cents | Passed | Node | build-and-test | Met |
| NFR9 | requirements.md | Whole suite in Chromium, Chrome, WebKit | 228/228 in each | `test-results.md`, `npm run test:e2e` | build-and-test | Met |
| NFR10 | requirements.md | Settings from the environment | Passed | Node | build-and-test | Met |
| NFR11 | requirements.md | Errors logged and shown in plain words | Passed | `requests.spec.ts`, `server/app.js`, Chromium | build-and-test | Met |
| NFR12 | requirements.md | 3D fallback, still under reduced motion | Passed | U7 specs, Chromium | build-and-test | Met |
| NFR13 | requirements.md | 3D loads only when opened | Passed | `dice.spec.ts`, Chromium | build-and-test | Met |

## Known limitations

- One v1 bill test failed once in Google Chrome in a stopped earlier run, and passed alone and in the complete run. Cause not investigated.
- BR4.7: a sold-out dish leaves the cart on refusal only, as the team approved at sign-off.
- Shared contract C12 and C16 don't yet list `id`, `visitId` and `elapsedMs`.
- Client code is not in the coverage figure.
