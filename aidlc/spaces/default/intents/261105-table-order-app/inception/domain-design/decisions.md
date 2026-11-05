# Architecture Decisions: Table Order

Decisions made for `components.md`, from `requirements.md` and `stories.md`.

## ADR-001: Split the server by business rule into eight components

**Context:** The app has three features and a 5-hour session. The team's rules build a walking skeleton first, then the other Units in parallel, each depending only on the skeleton.

**Decision:** Use eight components: Menu, Tables, Ordering, Billing, LiveUpdates, DinerApp, StaffApp and Platform (Option A, chosen by the team at this stage's approval).

**Consequences:** Each rule lives in one place and there are no dependency cycles, so the screens and the bill can be built in parallel. There are more calls between components than in a merged design. Security: no sensitive data crosses these boundaries, and all input is validated on the server.

**Alternatives Rejected:** Option B merges Tables and Billing into Ordering: fewer calls, but one large component, and the bill and close can't be built in parallel with ordering. Option C uses one "Restaurant" server component: the simplest wiring, but every rule is in one place and only the screens can be built in parallel.

## ADR-002: Keep the cart on the device, tied to its visit

**Context:** Each device keeps its own cart across a refresh (FR2.4). A saved cart must clear when its table closes, even if the device was offline (FR10.5, FR10.7).

**Decision:** DinerApp holds the cart in browser storage with the visit it began in. Tables starts a visit when a table with none is opened and returns its id. DinerApp compares ids on opening and on every reconnect, and discards a cart from an earlier visit. Ordering refuses an order carrying a visit id that is no longer current.

**Consequences:** The server stores no unplaced carts, and a refresh needs no server call. A cart does not follow a diner to another device, which the requirements accept. Security: a cart holds no personal data, and prices and availability are always checked again on the server.

**Alternatives Rejected:** Server-side carts survive a device change, but need an identity for each device and add writes for every tap. A shared table cart lets diners overwrite each other's choices and contradicts FR2.4.

## ADR-003: One-way live stream with numbered events and catch-up

**Context:** Changes must reach open screens within 2 seconds (NFR1) and screens must catch up after a dropped connection (FR4.4, FR6.5, FR10.7). The brief names Server-Sent Events.

**Decision:** LiveUpdates numbers each event, keeps one hour of them, and replays what a reconnecting screen missed. Actions still go through ordinary requests.

**Consequences:** Reconnection is built into the browser and the server stays simple. A screen offline for over an hour reloads its data instead of replaying. Security: events carry no sensitive data, and because the staff view is open by decision, this design relies on the app running only locally.

**Alternatives Rejected:** WebSockets allow two-way messages the app does not need and add complexity. Polling every second is simple but adds constant load and sits close to the 2-second limit.

## ADR-004: The first change to arrive wins

**Context:** A diner may cancel just as staff move an order, and two staff screens may act at once (FR5.2, FR7.3).

**Decision:** Ordering applies each status change only if the order is still in the expected status. The later request is refused with the current status. Placing an order and closing a table each run in one transaction, so an order is either in the visit before it closes or refused; events are published only after commit.

**Consequences:** Every screen ends up showing the same status and the loser is told why. Each action needs one extra check.

**Alternatives Rejected:** Last write wins would silently lose a change. Locking an order while a screen has it open would block staff over a rare case.

## ADR-005: The staff view has no sign-in

**Context:** The team decided that the staff view opens directly (FR11.1), and the app runs only locally.

**Decision:** No authentication is built. This is flagged as a known bypass of access control, acceptable only while the app stays local.

**Consequences:** It is simple and quick to demonstrate. Anyone who can reach the app can act as staff, so sign-in must be added before the app runs anywhere else.
**Alternatives Rejected:** A shared PIN or a staff login adds screens and session handling that the team chose not to build.
