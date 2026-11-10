# Architecture Decisions: Table Order v2

Decisions for the components in `components.md`, from `requirements.md`, `stories.md` and the v1 notes in `architecture.md`.

## ADR-001: Separate diner and staff live data on the existing stream

- **Context** — v1 has one event stream and one table read used by both diners and staff, and staff data must now need the PIN (FR2.4, FR2.5).
- **Decision** — Keep one stream route. A request with a table id stays open and gets only that table's events. A request with no table id needs a staff session. Diners get a new read of their own table.
- **Consequences** — Live screens keep working with small changes. v1 tests that open the all-tables stream need a session. Security: a diner can't read another table's stream unless they guess its number, which matches v1's address-based tables.
- **Alternatives Rejected** — Two separate routes, which is more change for no gain. Locking the whole stream, which breaks every diner screen.

## ADR-002: Staff sessions in a server-checked cookie

- **Context** — `EventSource` can't send headers, and a PIN checked only on screens protects nothing.
- **Decision** — A correct PIN creates a random token held in server memory and an HTTP-only session cookie.
- **Consequences** — Works with the live stream. A server restart ends sessions, and staff re-enter the PIN. Security: page scripts can't read the token, and the lockout slows guessing a 4-digit PIN. It suits a local demo but isn't strong protection on a public network.
- **Alternatives Rejected** — A token in the URL, which leaks through history and logs. Storing sessions in the database, which isn't needed.

## ADR-003: Add-only database upgrades

- **Context** — v1 can't change existing tables, and v2 must keep its data (FR8.1).
- **Decision** — A versioned step at start adds new tables and backfills reference data once. No v1 column changes. Options and allergens sit in new tables.
- **Consequences** — v1 rows and shapes are untouched. Security: no effect on access, and upgrades run with fixed SQL.
- **Alternatives Rejected** — Rebuilding tables, which is against the add-only rule. A migration library, which is more than this needs.

## ADR-004: "Ready" uses the existing Completed status

- **Context** — A new status would mean rebuilding the orders table.
- **Decision** — Completed means ready.
- **Consequences** — No v1 status code changes. The kitchen can't mark "ready but not served" separately. Security: none.
- **Alternatives Rejected** — A new Ready status, which breaks the add-only rule.

## ADR-005: Requests belong to a visit

- **Context** — Closing a table must clear its requests (FR5.7), and billing depends only on a narrow shared contract.
- **Decision** — Requests store a visit id, and only requests of an Open visit count as waiting.
- **Consequences** — Closing clears them with no change to billing. Old rows remain as history. Security: Respond is staff-only.
- **Alternatives Rejected** — Deleting at close, which needs billing changed.

## ADR-006: three.js for real 3D, loaded on demand

- **Context** — The team chose real 3D scenes. The brief allows free open-source tools.
- **Decision** — Use three.js, in a chunk loaded only when a scene opens, with a text version where 3D can't run.
- **Consequences** — A larger download for scenes only, and the Menu's first load is unaffected. Browser tests check the text version and scene state where 3D drawing can't be compared. Security: an added open-source dependency, covered by `npm audit`.
- **Alternatives Rejected** — CSS 3D only, which can't do a truly spinnable scene and was not the team's choice. A larger 3D framework on React, which adds more than needed.

## ADR-007: Options stored as a snapshot on the order line

- **Context** — Past orders must not change if the menu does, and v1 already snapshots name and price.
- **Decision** — Chosen option names and price changes are copied to the order, and the line's unit price includes them.
- **Consequences** — Bill and totals keep working unchanged. Security: prices are always worked out on the server.
- **Alternatives Rejected** — Referencing live options, which would rewrite history.
