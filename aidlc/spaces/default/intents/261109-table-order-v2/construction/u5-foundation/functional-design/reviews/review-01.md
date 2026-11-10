## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-09T16:20:07Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261109-table-order-v2/construction/u5-foundation/functional-design/functional-spec.md > W1 step 5 and Items Added To The Contracts | U6 must protect `GET /api/requests` and `POST /api/requests/:id/respond` as staff-only (contract C15). U6 may not edit `server/app.js` or `server/context.js`. The spec only says the "staff check" is registered. It never says how U6's routes get that check: no context member, middleware name or signature, and no word on whether `registerRoutes(app, context)` receives it. A developer cannot build U6's staff routes without guessing, or without editing a file U6 may not edit. | Name the staff check as a member of the shared context passed to `registerRoutes`. Give its signature and its 401 behaviour (BR1.1), and list U6's two request routes as staff-only users of it. | New |
| R-02 | Major | aidlc/spaces/default/intents/261109-table-order-v2/construction/u5-foundation/functional-design/rules.md > BR4.2, BR5.1 (traceability.json reverse rows) | U5 owns the shared client modules from C13, but they have no behaviour spec: `allergyStore` (`getAllergies`, `setAllergies`, `isUnsafe`, key `table-order.allergies`) and `cartStore` (`add(item, optionIds = defaults)`, `lineKeyOf`). The rules only state that `isUnsafe` reads allergens alone and how `lineKey` is formed. Nothing covers an unreadable or corrupt stored value, unknown allergen ids in storage, an item with no allergen rows, `add` with an invalid option id, or how a saved v1 cart line gets its defaults when the menu is not yet loaded. Both U6 and U7 (Chef's Dice) depend on these, and traceability marks them N/A. | Add rules or a short module spec for both modules. Cover the storage failure fallback (empty list), the treatment of unknown ids, `isUnsafe` on an item with no allergen rows, and the timing of default option resolution for saved v1 lines. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/construction/u5-foundation/functional-design/functional-spec.md > Items Added To The Contracts (BillExtras, U6 may edit v1 order/bill code) | The spec adds a fifth mount (BillExtras) and allows U6 to edit v1's order and bill code. `contract-summary.md` C14 still lists four u6Mounts. U6 and U7 are built in parallel, and U7 reads order status. Nothing records which v1 files U6 may touch or that U7 must not. | Update the contract summary for the fifth mount, or mark the spec as the authority. List the v1 files U6 may edit, and confirm that U7 touches none of them. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/construction/u5-foundation/functional-design/rules.md > BR1.3, BR1.4 and functional-spec.md > PIN attempts state machine | The response to the fifth wrong try is ambiguous. BR1.3 says 401 PIN_WRONG for a wrong PIN. BR1.4 says 429 for "every try while locked", but its trigger also names the fifth wrong try itself. The state machine goes straight to Locked on that try. Which status the fifth try gets is not stated. | State that the fifth wrong try answers 429 PIN_LOCKED (or 401 with the lock begun). Add the matching test case. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/construction/u5-foundation/functional-design/entities.md > StaffSession, PinAttempts | Both stores are in-memory with no size bound or cleanup. Sessions are never removed, and a PinAttempts entry stays for every address ever seen. The cookie is HttpOnly, but there is no SameSite attribute. Staff PUT and POST routes are cookie-authenticated and carry no CSRF protection. The risk is low for a local app but real if it is used on a shared LAN. | Add SameSite=Strict (or Lax) to BR1.2. Add a simple cap or pruning rule for both in-memory maps. | New |
| R-06 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/construction/u5-foundation/functional-design/rules.md > BR2.1, BR2.2 | NFR5 isolation is enforced only on the live stream. `GET /api/tables/:id/orders` stays open with no PIN, so any diner can read another table's orders by changing the id. The business scenario "never receives table 4's events" overstates what the unit guarantees. | State this as an accepted limit in Assumptions & Open Questions, or extend the table binding to the REST read. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| none listed | not run | Cross-references were checked by hand against contract-summary.md, unit-of-work.md and the story map. Every `BR` target in traceability.json resolves. All of U5's entities in entities.md are consistent with the ER diagram in functional-spec.md. |

### Summary

U5's design is mostly implementable and its story coverage matches the story map. Two gaps would force a developer to guess: how U6's routes receive the staff check, and the behaviour of the shared allergy and cart modules that U6 and U7 both consume. Both are Major, which does not block under the verdict rule (two or fewer). Fix them before approval if possible, because they gate the parallel Bolts.
