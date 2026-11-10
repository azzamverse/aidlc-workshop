# Risk and Sequencing Rationale: Table Order v2

The heuristic is walking-skeleton-first: the first Bolt (one build pass) is the smallest working slice, and it follows the DAG in `unit-of-work-dependency.md`. The scope comes from `requirements.md`, and shared parts from `contract-summary.md`.

| Order | Why |
|---|---|
| Bolt 5 first | Every other Bolt depends on it, and it carries the riskiest v1 changes: the PIN and the database upgrade |
| Bolts 6 and 7 together | They share no code, and running them side by side saves the most time |

## Risks

| Risk | Effect | Response |
|---|---|---|
| The hand-in is due tomorrow, with 10 features and a restyle | Some features may not finish in time | If time runs short, drop Kitchen Theatre first, then Chef's Dice, since the brief's minimum is already met without them |
| A full browser test run took about 33 minutes | Each checkpoint is slow | Run only the Unit's tests while building, and the full set at each checkpoint |
| Bolt 5 is large and blocks the rest | A slip delays everything | Build server and data first, so a slip shows early |
| The PIN touches many v1 tests | Possible failures across the suite | A shared login helper in Bolt 5, with changed tests listed |
| 3D may not run in test browsers | Scenes can't be compared by picture | Tests check scene state and the text version |

## Assumptions & Open Questions

- The order to drop features in is a suggestion, and the team decides if it comes to that.
