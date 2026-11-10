## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-10T10:05:01Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261109-table-order-v2/construction/u7-3d-xfactors/functional-design/functional-spec.md > W4 Spin the Bottle steps 4 and 5; rules.md > BR11.4, BR11.5 | Every screen is told to animate "for the time left until 5 seconds after startedAt". startedAt is a server timestamp, and nothing says which clock measures the time left. A diner device whose clock is off, or a screen that opens mid-spin, can show a wrong or no animation, and screens would not land together. The spin read also gives a late opener no way to know the time left. | State that the time left is measured from the moment the screen receives the event or read, or add a server-time or elapsed-ms field to the spin read and to the spin.started payload. Say what a screen does when the computed time left is negative or over 5 seconds. | New |
| R-02 | Minor | functional-spec.md > Assumptions & Open Questions (Chef's Dice menu source) | The spec says the slot props do not carry the menu, and leaves the source to the code plan. The existing MenuScreen already passes `menu` to ChefsDice (client/src/screens/diner/MenuScreen.jsx line 174), and U5's placeholder comment lists `menu` as a prop. C14 in contract-summary.md lists only `{ table, orders, onAddToCart }`. | Record in the spec that ChefsDice reads the `menu` prop that U5 already passes. Note that C14's text lacks it, so the code plan is not left guessing. | New |
| R-03 | Minor | rules.md > BR11.1 to BR11.5; contract-summary.md > C16 | No rule covers an unknown table on spin read or write (C11 gives 404 for the visit read). Nothing says what the Spin view shows if the visit closes while a spin is live, or what GET returns for a closed visit. BR11.5 only says "the open visit's latest spin". | Add a rule or an error-handling line for the unknown table, and for a table closed mid-spin (keep showing the result, then disable Spin). | New |
| R-04 | Minor | rules.md > BR11.3; functional-spec.md > W4 step 3 | The rules and the spec both say spin.started goes out, but not that it is published after the transaction commits. The live service has a post-commit hook (`transactions.afterCommit` in server/live/service.js), so a client that receives the event could otherwise read the spin before it is stored. | Add that the event is published only after the spin row is committed, through the existing post-commit hook. | New |
| R-05 | Minor | rules.md > BR9.1; entities.md > Plate | Plates are one per unit of quantity, capped at 12 with a "+N more" label. The cap is not in entities.md, and the accessible text summary is not required to carry the full count. | Say that the text summary and the fallback list all units, not the first 12. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| none listed for this stage | not run | Cross-references (BR ids, C10 to C16, story ids) were read by hand and resolve. server/features/u7.js is still U5's empty module, as C10 expects. |

### Summary

The U7 design is implementable and stays inside C10 to C16: it uses only v1 and U5, and Spin is the only add-only table. The one real gap is that the spin timing uses a server timestamp without saying whose clock measures the time left, which can make screens disagree. The other points are small gaps a developer could close in the code plan.
