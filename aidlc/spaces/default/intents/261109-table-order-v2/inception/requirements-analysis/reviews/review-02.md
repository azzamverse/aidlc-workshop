## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-11-09T14:59:48Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261109-table-order-v2/inception/requirements-analysis/requirements.md > FR2.4, FR2.5, FR1.1, FR5.4 | FR2.4 requires a staff session to open "the staff live stream" and to read "the board's staff data", while FR2.5 says every diner request works with no PIN. The code notes say v1 has one shared event stream (`GET /api/events`) and one table read (`GET /api/tables`), and diners use both. Diner banners (FR1.1), tracker updates (FR6.3) and button resets (FR5.4) all depend on that stream. As written, a developer cannot tell whether protecting the stream breaks every diner screen, or whether the stream must be split. | State how diner and staff live data are separated: either two streams or a filtered one. Say which events and reads stay open to diners and which need a session. Add a pass/fail criterion that a diner with no PIN still receives its own table's events and cannot receive staff-only data. | Resolved (reviewer) |
| R-02 | Major | aidlc/spaces/default/intents/261109-table-order-v2/inception/requirements-analysis/requirements.md > FR4.1, FR4.4, FR4.5 | Option groups are underspecified. It does not say whether a group is pick-one or pick-many, whether a choice is required, or what "default choices" means for a group like extra cheese. Spice level and size are naturally pick-one, while no onions and extra cheese are toggles. FR4.4 validates "a choice that doesn't belong to the dish" but not two choices from a pick-one group or a missing required group. QA cannot write the 400 cases, and cart line identity (FR4.5) depends on it. | Define group types (single or multiple, required or optional, and the default), and the server's refusal rules for each. Say which seeded dishes get which groups and prices, or defer that explicitly to design with a stated owner. | Resolved (reviewer) |
| R-03 | Major | aidlc/spaces/default/intents/261109-table-order-v2/inception/requirements-analysis/requirements.md > FR1.4 | The "shown once on next load if not yet shown on that device" rule has no limit. A new device or cleared storage, or the first v2 load against a v1 database that already holds many Completed orders, would show a banner for every old order. It also does not say whether banners apply to orders from a closed visit. | Limit catch-up to orders of the current open visit for that table, and cap or group the banners (for example, one banner per load listing the order numbers). Add an acceptance criterion for the first load against a v1 database with existing Completed orders. | Resolved (reviewer) |
| R-04 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/inception/requirements-analysis/requirements.md > FR8.3 | "so v1's exact-shape tests keep passing where they can" is not testable. | Name the v1 shapes that must stay byte-identical (for example, order and table responses with no options and no requests), or drop the clause and rely on FR8.4. | Resolved (reviewer) |
| R-05 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/inception/requirements-analysis/requirements.md > FR2.3 | The lockout is "from one browser", but the server enforces the check. It does not say how the server identifies a browser or whether the counter is per address or global. A client-side-only lockout would be bypassable, which conflicts with NFR5. | State that the counter is enforced on the server and what it is keyed on. | Resolved (reviewer) |
| R-06 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/inception/requirements-analysis/requirements.md > FR3.3, FR4.1, FR3.4 | The allergen and option data for the 12 seeded items is not defined, and an option could add an allergen (for example, extra cheese adds dairy). Allergy marks and the cart warning are tied only to the dish. | Say whether an option can add an allergen. If so, extend FR3.4 and FR3.5. If not, record that as an assumption. | Resolved (reviewer) |
| R-07 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/inception/requirements-analysis/requirements.md > FR5.1, FR5.7 | "While the table's visit is open" is not defined in this document. It is unclear what the buttons show on a closed or never-started visit. | Reference v1's visit definition and state the button behaviour when no visit is open. | Resolved (reviewer) |
| R-08 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/inception/requirements-analysis/requirements.md > Intent Analysis, Success | "Every feature works in a 5-minute demo" is not a measurable pass/fail criterion. | Replace it with a checklist tied to the FR numbers, or state that the FR acceptance criteria are the demo script. | Resolved (reviewer) |
| R-09 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/inception/requirements-analysis/requirements.md > FR2.3 | The lockout is per network address. In the local demo every browser, phone and test run shares one address, so 5 wrong tries lock all staff for 30 seconds, and Playwright PIN tests could lock each other out. | State that the lockout applies to all staff on that address and that tests use the correct PIN or reset the counter between specs. | New |
| R-10 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/inception/requirements-analysis/requirements.md > FR4.1, FR3.3, FR12.1 | "Selected dishes" with options, the allergen set per seeded dish and the mood tags are not named. QA cannot pick the dishes for tests until design fixes them. | Name the owner (Domain Design) and require that at least one dish exists for each case: with a pick-one group, with extras, per allergen, and per mood including one qualifying for none. | New |
| R-11 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/inception/requirements-analysis/requirements.md > FR5.2, FR5.3, FR5.6 | "Respond" is described on the card. It is not stated whether one press clears both a waiter call and a bill request, or each separately. | State whether Respond is per request or per table. | New |
| R-12 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/inception/requirements-analysis/requirements.md > FR12.1, NFR12 | Shake-to-roll depends on a device-motion permission on iOS Safari, and the behaviour when it is denied is not stated. | Add that tap and Enter always work, and a denied motion permission shows no error. | New |
| R-13 | Minor | aidlc/spaces/default/intents/261109-table-order-v2/inception/requirements-analysis/requirements.md > FR11.2, FR11.3 | If two diners spin within the same moment, or a screen opens mid-spin, the result shown is not stated. | State that the server accepts the first spin only, and that a screen opened mid-spin shows the current result. | New |

> R-01 Reviewer note: FR2.4 and FR2.5 now separate the diner's own-table stream (open) from the all-tables stream and board read (staff-only, 401).

> R-02 Reviewer note: FR4.1 and FR4.4 define pick-one and pick-any groups, defaults and the 400 rules. Which dishes get which groups is still left to the seed (see new finding).

> R-03 Reviewer note: FR1.4 limits catch-up to the current visit and to orders this device last saw as Pending or Preparing, and groups them into one banner.

> R-04 Reviewer note: FR8.3 now requires exactly v1's shape for an order with no options.

> R-05 Reviewer note: FR2.3 keys the lockout on the server by network address (see new finding on local demos).

> R-06 Reviewer note: FR4.1 says options never change allergy marks and are offered only on dishes already marked.

> R-07 Reviewer note: FR5.1 ties the buttons to a visit with status Open.

> R-08 Reviewer note: Success is now a passing browser test per feature plus the full suite.

### Summary

The prior Major findings are fixed. The requirements are testable and traced to the scope, and the new 3D X-factors (FR9 to FR12, NFR12, NFR13) have measurable criteria and a fallback. Only Minor corners remain, none of which blocks engineering from starting.
