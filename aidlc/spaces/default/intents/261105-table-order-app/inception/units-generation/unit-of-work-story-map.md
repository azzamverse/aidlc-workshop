# Story Map: Table Order

Each story from `stories.md` with the Units that implement part of it.

| Story | Unit ID | Directory | Notes |
|---|---|---|---|
| US1.1 | U1; U2 | u1-walking-skeleton; u2-diner-screens | U1 serves the menu; U2 shows it |
| US1.2 | U1; U2 | u1-walking-skeleton; u2-diner-screens | U1 refuses and publishes; U2 shows |
| US1.3 | U2 | u2-diner-screens | |
| US1.4 | U2 | u2-diner-screens | |
| US1.5 | U1; U2 | u1-walking-skeleton; u2-diner-screens | U1 validates and stores; U2 places |
| US1.6 | U1; U2 | u1-walking-skeleton; u2-diner-screens | U1 refuses; U2 updates the cart |
| US2.1 | U1; U2 | u1-walking-skeleton; u2-diner-screens | U1 streams; U2 shows |
| US2.2 | U1; U2 | u1-walking-skeleton; u2-diner-screens | U1 applies the rule; U2 offers it |
| US3.1 | U1; U3 | u1-walking-skeleton; u3-kitchen-board | U1 streams; U3 shows |
| US3.2 | U1; U3 | u1-walking-skeleton; u3-kitchen-board | U1 applies the rule; U3 offers it |
| US3.3 | U1; U3 | u1-walking-skeleton; u3-kitchen-board | U1 stores and publishes; U3 offers it |
| US4.1 | U4 | u4-bill-and-close | |
| US4.2 | U4 | u4-bill-and-close | |
| US4.3 | U2; U4 | u2-diner-screens; u4-bill-and-close | U4 publishes the close; U2 resets |
| US5.1 | U1 | u1-walking-skeleton | |
| US5.2 | U1; U2 | u1-walking-skeleton; u2-diner-screens | U1 refuses unknown tables; U2 shows the message |
| US5.3 | U2; U3; U4 | u2-diner-screens; u3-kitchen-board; u4-bill-and-close | Each Unit's own screens |

## Rows Spanning Units

Most rows span U1 and a screen Unit, because U1 carries the shared server rules. US4.3 spans U2 and U4 through the table-closed event. US5.3 is a cross-cutting concern for every Unit with a screen.

## Implementation Order Within Each Unit

- **U1:** foundations and seed, then menu and tables, ordering, the live stream, the app shell, then the end-to-end slice.
- **U2:** Menu, Cart, placing an order, My orders, cancelling, then live updates and the reset.
- **U3:** the board, status moves, the live highlight, then the availability panel.
- **U4:** the bill calculation, the close rule, the bill screen, then closing.

## Coverage

All 17 stories are assigned, and every Unit has rows. `traceability.json` names one lead Unit per story; this map is the full list of Units for each story.
