# Code Summary: U7 3D X-factors

## What Was Built

- **Spin server:** `server/features/u7.js` holds the add-only `spins` table, `GET` and `POST /api/tables/:id/spin`, the 5-second window inside one transaction, a secure random seat, and `spin.started` after commit. `createU7Feature` lets tests supply the clock and the seat.
- **Scene host:** `client/src/xfactors/SceneHost.jsx` checks for WebGL, loads three.js only when a view opens, keeps scenes still under reduced motion, falls back to the text version on any failure, and releases 3D resources on close.
- **The four views:** `LivingTable.jsx`, `KitchenTheatre.jsx`, `SpinTheBottle.jsx` and `ChefsDice.jsx` replace U5's placeholders. Their drawing is in `client/src/xfactors/scenes/`, and their rules are in pure modules in `client/src/xfactors/logic/`.
- **Styles:** `client/src/xfactors/xfactors.css`, loaded with the scenes, so no shared stylesheet changed.
- **Dependency:** `three` `^0.187.0`, in its own chunk.

## Test Results

| Run | Result |
|---|---|
| `npm test`, final code, through `aidlc engine swarm check u7-3d-xfactors` | 24 files: 382 passed, 1 skipped, 0 failed |
| `npx playwright test --project=chromium`, final code, same run | 177 passed, 0 failed, 4.1 min |
| Check result | `"converged":true` |
| Earlier full run, before the code review fixes (Chromium, Google Chrome, WebKit) | 519 browser tests passed, 0 failed |

**Coverage:** the 98.08% line figure measures `server/**` only, as set in `vitest.config.js`. Client code (`SceneHost`, the four views, the scenes and the logic modules) is not in that figure. The logic modules and the bottle scene have unit tests, and the rest is exercised by the browser tests.

**3D specs that skip without WebGL:** "the arrow keys and a drag turn the table where 3D runs" (`living-table.spec.ts`), "where 3D runs the bottle spins for the time left, then shows the result" and "regression: a second spin never takes the previous result phase" (`spin.spec.ts`). None skipped in the final Chromium run. In the earlier three-browser run the first two did not skip either; the regression test did not exist yet. Google Chrome and WebKit have not run the final code, because the approved verification command is now Chromium only.

The one skipped unit test is U5's "a copy of the real database from the v1 run upgrades and keeps its rows", in `tests/server/upgrade.test.js`. It is not one of this Unit's and this Unit did not change it.

**Mockup match:** the four pairs in `test-results/mockup-match/u7-3d-xfactors/` were looked at again on the final code, after the plate and ticket size changes. Headings, labels, buttons and status words match. No difference this Unit owns remains. The differences are the ones listed in `left-out.txt`, plus the "My orders" and table-number bar that the app's frame adds above each view.

## Bugs Found by the Tests and Fixed

All three were found by the code review. Each test was run against the unfixed code and failed.

| What went wrong | Fixed in | Regression test |
|---|---|---|
| The bottle never animated. The scene marked a new spin as seen on the render before its phase changed, so "spinning" did nothing | `client/src/xfactors/scenes/bottleScene.js`, `update()` | "regression: the bottle animates when the phase turns spinning after the new spin id arrived first" (`tests/client/bottleScene.test.js`) |
| On a second spin, the new spin briefly took the last spin's "result" phase, which moved the bottle to the answer before it spun | `client/src/xfactors/SpinTheBottle.jsx`, `useSpinPhase`; `client/src/xfactors/logic/spinTime.js`, `phaseForSpin` | "regression: a second spin never takes the previous result phase" (`e2e/u7-3d-xfactors/spin.spec.ts`) |
| A replayed `spin.started` showed as a live spin and then a real result when the confirming read failed | `client/src/xfactors/SpinTheBottle.jsx`, the `useLiveEvents` handler: an event now only prompts a read, and only the read shows a spin | "regression: a spin.started never shows as live when the confirming read fails" (`e2e/u7-3d-xfactors/spin.spec.ts`) |

## Other Code Review Fixes

- A new visit now clears the shown spin and any refusal, and a read or spin from another visit is ignored.
- The Living Table stage is now a labelled slider that gives its turn in degrees, in place of `role="img"`.
- Traceability: all 17 business rules have a row, each row was compared with `rules.md` and `stories.md`, and every target and manifest path exists. Three rows now point at the code that does the work instead of a test: AC11.1.5, BR9.6 and BR11.6.

## Additive Changes To The Contracts

These fields are additive, but C12 and C16 don't list them yet. `contract-summary.md` was not edited, because it is outside this Unit's writes.

| Contract | Where | Added fields | Use |
|---|---|---|---|
| C12 | `spin.started` | `id`, `visitId`, `elapsedMs` (always 0) | The view ignores another visit's events and spins it already shows |
| C16 | `GET` and `POST /api/tables/:id/spin` | `id`, `visitId`, `elapsedMs` | The same, and `elapsedMs` sets the time left on this screen |

## Why The Bottle View Has Its Own Stream

The review asked for the screen's existing stream if the slot can receive it. It can't: C14's slot props carry no events, and `MyOrdersScreen` passes events only to its own handler. Sharing them would mean changing a U5 screen, which is outside this Unit's plan. So the view opens a table stream through the shared `useLiveEvents` for as long as it is open, and closes it when the diner leaves the view.

## v1 Tests Changed

None.

## U5 Tests Changed

| File | Change | Reason |
|---|---|---|
| `e2e/u5-foundation/diner-access.spec.ts` | The two slot tests look for each view's heading instead of "coming soon" | U7 replaces those placeholders, so the words are gone. The tests still check the slot, its file loading on demand, and the pressed state |

## Deviations From the Plan

- The change to `e2e/u5-foundation/diner-access.spec.ts` was not in the plan's list of touched files. The review asks for it to be added to that list, but this Unit may only tick boxes in the plan, so it is recorded here.
- `traceability.json` was written by hand in the same shape as U5's. `aidlc engine sensor-traceability` refused the worktree path from the main folder ("the table goes inside the active intent's record") and wrote nothing, so the tool's own check has not been run on this file.
- Added files the plan implies but does not name: `SceneHost.jsx`, `spinApi.js`, `xfactors.css`, `scenes/*.js`, `e2e/u7-3d-xfactors/helpers.ts` and `tests/client/bottleScene.test.js`.

## Notes For Review

- A spin now reaches a screen through a read after its event, so one failed read means that screen misses that spin until its stream reopens. This is the trade-off the review asked for: a spin that can't be confirmed never shows.
- Kitchen Theatre shows a station list under the 3D rail on every device, which the mockup does not have. It carries the same words as the rail and is also the text version.
- Shaking the phone cannot be tested in these browsers. The shake rule is unit-tested and a denied permission is browser-tested.
