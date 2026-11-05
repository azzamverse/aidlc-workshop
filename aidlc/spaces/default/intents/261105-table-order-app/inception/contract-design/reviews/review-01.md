## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-05T08:59:54Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261105-table-order-app/inception/contract-design/contract-summary.md > C3 `/api/tables/{tableId}/close` and the note below C3 | The close endpoint says "A repeat close changes nothing" and returns 200 `{ closed: true }`, but it also returns 409 TABLE_NOT_READY when "the table has no orders". After the first close the visit is archived and the table has no current visit (C4 `archiveVisit`; C3 note: "A table with no current visit returns an empty bill"). A repeat close, for example a double click or a second staff screen, therefore sees no orders and gets 409, not 200. The two rules contradict each other, and U4's close tests could be written either way. | State what a close on a table with no current visit returns. Either return 200 `{ closed: true }` with no change, or tell "no visit" apart from "visit with no orders" and say which gets 409. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261105-table-order-app/inception/contract-design/contract-summary.md > C2 closing paragraph | U1's test-only way to publish `table.closed` (active when `NODE_ENV=test`) is part of what U2 and U3 depend on, but no route, method or body is given in C1, C2 or C4. U2 and U3 would have to guess its shape. | Add the test-only route to C2 or C4 with its path and body, and say whether it appears only when `NODE_ENV=test`. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261105-table-order-app/inception/contract-design/contract-summary.md > C1 `/api/tables/{tableId}/orders/{orderId}/cancel` | The cancel endpoint lists only ORDER_NOT_FOUND and ORDER_STATE_CONFLICT. It does not say what happens when the order belongs to an archived visit, or to another table. Requirements FR5 and the Ordering component limit cancelling to the table's current visit. | Say that an order of a non-current visit or of another table returns 404 ORDER_NOT_FOUND, or name the code that applies. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261105-table-order-app/inception/contract-design/contract-summary.md > C1 `/api/tables/{tableId}` | A plain GET starts a visit as a side effect. This is deliberate and matches the Tables component, and C3 explicitly avoids it for the bill. The cost is that any prefetch or repeated read by U2 creates a visit. | Add a one-line note that U2 is the only caller and that this read is meant to be repeatable, so a later Unit does not call it for a plain existence check. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| None listed for this stage | Not run | Cross-references checked by hand. Every C1 to C5 provider, consumer and owner resolves to U1 to U4 in `unit-of-work.md`. The entities and components named (Order, Visit, Billing, Tables) match `components.md`. The ownership rules and the build-order edge are consistent with the dependency narrative. |

### Summary

The contracts are complete enough to build against: U2, U3 and U4 each depend only on U1, ownership is clear, and the live-event and error shapes are fixed. The one real gap is the repeat-close behaviour, which contradicts itself. It is a single Major finding (within the allowed two), so the verdict is READY, but the team should settle that rule at the gate.
