## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-05T09:15:29Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261105-table-order-app/construction/u1-walking-skeleton/functional-design/functional-spec.md > Workflows (W1-W7) and rules.md > BR4.4 | U1 owns two contracts that U2, U3 and U4 build against, and the design covers neither. C4 lists five shared functions (withTransaction, getCurrentVisit, listVisitOrders, archiveVisit, publishEvent) and a route slot for U4. Only archive appears, in BR4.4. The after-commit event queue and the slot are not described. C5 requires the pages /table/:id/cart, /table/:id/orders and /staff/tables/:id, but W7 only names /table/:id and /staff. Nothing says the other addresses are served, and BR6.2 only says screens are served from any folder. | Add a short section or rules for the C4 functions and the U4 route slot, including how publishEvent defers events until commit. Add a rule that every C5 address serves the app shell (placeholder pages until U2/U4), using the sendFile root form. | New |
| R-02 | Minor | rules.md > BR3.2 and BR3.3 | The check order is undefined for PUT /api/orders/:id/status with {from,to}. For example, a stale `from` combined with a non-forward move, or any move on a Cancelled or Completed order, could give either 400 or 409. | State the order: validate that the move is one step forward first (400), then compare `from` with the stored status (409). Say what a move out of a final status returns. | New |
| R-03 | Minor | entities.md > LiveEvent and rules.md > BR5.1 | The one-hour retention is stated, but no rule says who deletes older events or when. The stream has no heartbeat and no rule on its connection limits. Unpruned events grow without bound. | Add a rule that prunes events older than one hour, on publish or on a timer. Optionally add a keep-alive comment on the stream. | New |
| R-04 | Minor | entities.md > Order and rules.md > BR2.5 | The C1 Order shape includes tableId and totalCents, but the entity has neither. They are derived from the visit and the lines, and the design does not say so. A replayed placementKey is also not checked against the table or the lines. A key reused on another table would return a foreign order. | Note that tableId and totalCents are derived in the API mapping. Say that a placementKey replay is matched to the same table, or is refused. | New |
| R-05 | Minor | rules.md > BR2.1, BR6.1 and Assumptions & Open Questions | BR2.1 does not list missing visitId or placementKey as VALIDATION_FAILED. BR6.1 does not say the seed runs in one transaction, so a half-seeded database would never be repaired. The test-only `table.closed` route (POST /api/test/events) is only an assumption, not a rule. | Add the missing-field validation. Make the seed atomic. Promote the test-only route to a rule with its NODE_ENV=test guard and a test that it is absent otherwise. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| none listed | not run | The stage lists no validation tools. Cross-references were checked by hand against contract-summary.md. |

### Summary

The rules, entities and state machines are consistent with C1 and C2, and every story acceptance criterion is traced. The main gap is that the design omits the C4 shared-code interface, the U4 route slot and the full set of C5 screen addresses. U4 and the parallel Units depend on these. Fix it at the gate. The Minor items are small precision points.
