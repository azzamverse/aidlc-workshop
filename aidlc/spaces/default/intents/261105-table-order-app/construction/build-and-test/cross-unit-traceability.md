# Cross-Unit Traceability: Table Order

**Verdict:** pass, after the explanations below.

The coverage check found every FR and every acceptance criterion built in a Unit, except these, which have no Unit acceptance criteria because they are checked across the whole app here:

| ID | Covered by |
|---|---|
| NFR3 | Mockup-match specs of all four Units, in three browsers |
| NFR4 | Width tests in U2 (360 px) and U3 (1024 px) |
| NFR6, AC5.3.1 | `e2e/build-and-test/keyboard-journey.spec.ts`, in three browsers |
| NFR7 | Reduced-motion tests in U2, U3 and U4 |
| NFR9 | The full browser run in Chromium, Google Chrome and WebKit |
| NFR10 | Each Unit's run on its own port and database |

Everything else: FR1 to FR13, NFR1, NFR2, NFR5, NFR8 and NFR11 are built, with the Unit and file named by `aidlc engine sensor-traceability --stage build-and-test`. AC2.2.4 is delivered by U4.
