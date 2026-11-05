# Risk and Sequencing Rationale: Table Order

A Bolt is one build pass over a piece of the work, ending in something that runs. A walking skeleton is the smallest working end-to-end slice.

## Heuristic

Walking skeleton first (Cockburn), set by the team's rules. There is no scoring model: every story is Must Have and the order follows from the dependencies, so a score would change nothing.

## Order

1. **Bolt 1** comes first because every other Unit's code needs it.
2. **Bolts 2 and 3** run in parallel because neither needs the other, which saves time in the session.
3. **Bolt 4** comes last by the team's choice. Its code uses only the skeleton, but the bill is easiest to try when orders can be placed and finished on the real screens.

This matches the dependency order, with no deviation.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The whole build overruns the 5-hour session | Medium | High | Timeboxes per Bolt; the team decides what to cut at the next approval point |
| Parallel Bolts conflict when they merge | Low | Medium | Fixed screen files and addresses from Bolt 1; if the build fails, build them one at a time |
| Parallel Bolts share a port or database | Low | Medium | Each has its own `E2E_PORT` and `DB_FILE` |
| Live updates miss the 2-second limit | Low | High | Proved in Bolt 1 with a timed browser test |
| The built screens drift from the mockups | Medium | Medium | Mockup match in every Unit |

## Assumptions & Open Questions

None.
