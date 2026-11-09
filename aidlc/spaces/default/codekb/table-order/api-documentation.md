# API Documentation

## Implemented APIs

None. The repo has no server, routes, handlers, API specification or internal module interfaces, so there are no endpoints, parameters, status codes, authentication rules or rate limits to record.

## Routes Named in the Brief (Not Implemented)

| Route | Kind | Purpose |
|---|---|---|
| `/table/:id` | Screen route | Customer view, for example `/table/5` standing in for a QR scan |
| `/staff` | Screen route | Staff view |

## Capabilities the API Will Need

The brief implies these capabilities without defining any endpoint. Paths, payloads and errors are left to Contract Design.

| Capability | Source in `IDEA.md` |
|---|---|
| Read the menu by category | Feature 1, line 13 |
| Place an order and return its number | Feature 1, line 15 |
| List this visit's orders with status | Feature 1, line 16 |
| Stream new orders and status changes live | Features 1 and 2, lines 16, 19-20; Server-Sent Events, line 38 |
| Change an order's status | Feature 2, line 20 |
| Read a table's itemised bill and total | Feature 3, line 23 |
| Close a table, archiving the visit | Feature 3, line 24 |

Answers to the open questions may add more, such as cancelling an order or marking an item sold out.

## Script Expectations (Not Decisions)

`QUESTIONS.md` lines 321-326 expect Contract Design to settle on no public API, screens calling the server over HTTP, Server-Sent Events that reconnect by themselves, one error shape, a retry-safe placement key and additive changes. The same section's Unit ownership depends on the Units Generation outcome.

## External APIs

None. Payments, notifications and cloud services are out of scope in the brief.
