## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-05T11:18:15Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261105-table-order-app/construction/u4-bill-and-close/functional-design/rules.md > BR3.3; functional-spec.md > Assumptions & Open Questions (third item) and Seams With Other Units | BR3.3 says that after a close the screen goes to `/staff` "with the message shown there on the bill's behalf". The spec assumes the board can show a message passed through navigation "without changing the board's code". Neither C5 (screen addresses) nor any other passed contract defines such a message, and the Seams section says U4 replaces only its own screen file, so the board's code cannot be changed. The Unit's own fallback ("the bill screen shows it briefly before returning") contradicts BR3.3's "returns to the board". A developer cannot tell which behaviour to build, and the first one depends on another Unit doing work that no contract asks of it. | Choose one behaviour that U4 can build alone, for example: show "Table N closed. It's ready for the next diner." on the bill screen for a stated time (or until a button is pressed) and then navigate to `/staff`. Remove the dependence on the board showing a message. If the board is meant to show it, add that to the shared contracts first. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261105-table-order-app/construction/u4-bill-and-close/functional-design/rules.md > BR3.1; traceability.json > AC5.3.2, AC5.3.3 | AC5.3.2 (every status shown as a word or icon, never colour alone) and AC5.3.3 (no transitions under reduced motion) are mapped to BR3.1, but BR3.1 does not mention status words, icons or motion. The mockup's bill shows each order with a status chip. BR3.1 also covers AC4.2.2 and AC4.2.3 (button unavailable) only implicitly, since traceability maps them to BR2.1 alone. | Add to BR3.1 that each order shows its status as a word and an icon, and that no transition runs under reduced motion. Map AC4.2.2 and AC4.2.3 to BR3.1 as well as BR2.1. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261105-table-order-app/construction/u4-bill-and-close/functional-design/rules.md > BR2.1, BR2.3; functional-spec.md > W3 | The order in which a close is checked is not in the rules. W3 lists `TABLE_NOT_FOUND` (404) for an unknown table, but BR2.1 and BR2.3 start from "current visit". BR2.3 says no current visit returns 200. For an unknown table id the rules would also return 200, because there is no visit. C3 gives 404 for an unknown table. | State in BR2.1 or BR2.3 that an unknown table is checked first and answers 404 `TABLE_NOT_FOUND`, then the visit checks run. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261105-table-order-app/construction/u4-bill-and-close/functional-design/functional-spec.md > Visit State; traceability.json > AC4.2.6 | The state diagram ends at "Archived" and has no arrow back to "NoVisit". C4's `archiveVisit` leaves the table with no current visit, and a diner's tab press starts a new one. AC4.2.6 (no screen shows an archived visit) is mapped only to BR2.4, which covers the bill. The Menu, Cart, My orders and Board are other Units' screens and rely on U1's reads. | Add the Archived to NoVisit arrow, or note that the table returns to NoVisit. Mark AC4.2.6 as partly delivered by U1 and the screen Units, with BR2.4 as U4's part. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Manual cross-check of traceability.json against stories.md | All 18 acceptance criteria for US4.1, US4.2, US4.3 and US5.3 are in upstream_ids. AC4.3.3 and AC4.3.4 are N/A to U2, which matches the story map. | Coverage is complete. The gaps above are in what the mapped rules actually say. |
| Check against contracts C2 to C5 | The C3 bill and close endpoints, response fields, and the three close outcomes (200 archived, 409 `TABLE_NOT_READY`, 200 with no current visit) match W3 and BR1 to BR2. C4's `withTransaction`, `getCurrentVisit`, `listVisitOrders`, `archiveVisit` and `publishEvent` cover BR2.1 and BR2.2, and the event is published only after commit, as C2 requires. The route slot in C4 matches the seam. | No broken references. The BR3.3 message passing is not in any contract (the Major finding). |
| Mockup check (`table-bill.html`, `states.html`) | The bill words, the "Still open" notice, the "No orders for this table" empty state, the error text, and "Table 5 closed. It's ready for the next diner." match the rules. | The design follows the mockups. |
| Automated validation tools | None named in the brief; none run. | Not applicable. |

### Summary

The server side of this design is sound: the bill is derived, the check and archive run in one transaction, and a repeat close is safe, all consistent with C3 and C4. The one real problem is the post-close message, which depends on a board behaviour that no contract provides, with a fallback that contradicts the rule. The other findings are Minor trace and wording gaps.
