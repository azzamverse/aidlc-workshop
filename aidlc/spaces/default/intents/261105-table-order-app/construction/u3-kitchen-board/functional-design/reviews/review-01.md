## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-05T10:52:51Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | aidlc/spaces/default/intents/261105-table-order-app/construction/u3-kitchen-board/functional-design/rules.md > BR4.1 and BR2.3 | The reconnect and resync reload in BR2.3 covers only the board. The Menu availability panel is filled once, from `GET /api/menu` when it opens, and then kept current by `menu.item-updated` events. If the stream drops while the panel is open, it can keep stale switches after reconnecting, because missed events older than the replay window arrive only as `resync`. The panel's rule does not handle `resync` or reconnects. The Sold out switch sends an explicit value, so a stale switch cannot corrupt data, but staff can read the wrong state. | Add to BR4.1 that the panel reloads `GET /api/menu` on each connection and on `resync`, as BR2.3 does for the board. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261105-table-order-app/construction/u3-kitchen-board/functional-design/rules.md > BR2.3 | BR2.3 says the live indicator shows "the indicator's words" while the stream is down. The mockup (`kitchen-board.html`) defines only the connected word "Live" with a dot. No document gives the word, icon or `role` for the disconnected state, and a screen reader or the mockup-match check would need one. | State the disconnected indicator's text and icon, or say it reuses "Live" with a changed icon. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261105-table-order-app/construction/u3-kitchen-board/functional-design/functional-design-questions.md > Q1 | Q1's option A says "The board mockup is updated so #14 is highlighted too", while the Note directly above it says the mockup already highlights both #14 and #15 and needs no update. I checked `kitchen-board.html` and the Note is right. The option text is stale and contradicts the Note. The answer (A) does not depend on it, but the recorded question misleads a reader. | Remove the mockup-update sentence from option A. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261105-table-order-app/construction/u3-kitchen-board/functional-design/traceability.json; functional-spec.md > top paragraph | Two upstream requirements that this Unit's screen must meet are not traced: NFR4 (staff screens work at 1024 px wide, with no horizontal scroll or clipped controls) and the board half of FR5.3 (a Cancelled order shows as Cancelled on the board). BR1.2 lists status words, but no rule names Cancelled on the board or the width target. Neither requirement has an acceptance criterion in `stories.md`, which is why the coverage list has no row for them. | Add a layout rule for 1024 px and a line in BR1.2 that Cancelled orders stay on the board with their word and icon, then add reverse-trace entries for them. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Manual cross-check of traceability.json against stories.md | All 14 acceptance criteria for US3.1, US3.2, US3.3 and US5.3 (AC3.1.1 to AC3.3.3, AC5.3.1 to AC5.3.3) are in upstream_ids, and each maps to a rule in rules.md. | Coverage complete for the stories. The gaps above are requirements without an acceptance criterion. |
| Cross-unit check against contract-summary.md | `GET /api/tables`, `PUT /api/orders/{orderId}/status`, `GET /api/menu`, `PUT /api/menu/items/{itemId}/sold-out`, the events order.placed, order.updated, menu.item-updated, table.closed and resync, and `/staff` and `/staff/tables/:id` (C5) all exist with the shapes the rules use. `GET /api/tables` starts no visit. | No broken cross-unit references. The claim that the staff frame accepts a `StaffBar` child is U1's concern and is not in the passed contracts. |
| Mockup check (`kitchen-board.html`, `states.html`) | The board mockup highlights both Pending orders (#14, #15) and shows "Open bill" on every table. The "Reconnecting… the board will catch up by itself." and refused-move sentences match BR2.3 and BR3.2. | The design follows the mockups. |
| Automated validation tools | None named in the brief; none run. | Not applicable. |

### Summary

U3's functional design is complete and implementable: every acceptance criterion is traced, the contracts it uses resolve, and the mockup words match. The findings are Minor gaps: the availability panel does not reload after a reconnect, the disconnected indicator wording is undefined, one question option contradicts its own Note, and NFR4 and the board's Cancelled display are untraced.
