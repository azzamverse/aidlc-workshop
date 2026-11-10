# Cross-Unit Traceability

**Verdict: every functional requirement and acceptance criterion traces to built code. Four non-functional requirements have no story or criterion linking them to a Unit.**

Source: `aidlc engine sensor-traceability --stage build-and-test`, which read each Unit's traceability from its `code-generation-plan.md` work and `code-summary.md`, with the run commands in `unit-test-instructions.md`.

## Coverage

| Group | Result | Owning Unit |
|---|---|---|
| FR1, FR3, FR4, FR5, FR6 | Covered | u6-diner-staff-features |
| FR2, FR7, FR8 | Covered | u5-foundation |
| FR9, FR10, FR11, FR12 | Covered | u7-3d-xfactors |
| AC1.1.1 to AC12.1.4 | All covered | As above |
| NFR1, 2, 3, 5, 6, 7, 8, 10, 12 | Covered through acceptance criteria | As above |

AC4.2.5 is met at the refusal only, the behaviour the team approved at sign-off (BR4.7).

## Uncovered by the tool

| ID | Why | How it was checked instead |
|---|---|---|
| NFR4 | No criterion links it | `e2e/build-and-test/v2-widths-and-keyboard.spec.ts`, Chromium |
| NFR9 | A property of the whole suite | Full run in all three browsers, 228 passed in each; see `test-results.md` |
| NFR11 | No criterion links it | `e2e/u6-diner-staff-features/requests.spec.ts`, Chromium, and `server/app.js` logging |
| NFR13 | No criterion links it | `e2e/u7-3d-xfactors/dice.spec.ts`, Chromium |
