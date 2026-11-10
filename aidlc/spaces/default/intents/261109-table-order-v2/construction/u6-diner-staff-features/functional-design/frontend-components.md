# Frontend Components: U6 Diner and Staff Features

Mounts come from contract C14 in `contract-summary.md`. Screens follow the v2 design system and mockups `allergies.html`, `customize.html`, `cart.html`, `my-orders.html`, `kitchen-board.html` and `table-bill.html`.

| Component | Where | Holds | Does |
|---|---|---|---|
| ReadyBanner | Diner frame | device state | Shows, groups and dismisses banners |
| MuteSwitch | My orders, kitchen board | device mute | Stops sound and vibration |
| KitchenAlerts | BoardExtras | alert list | Shows new-order alerts |
| AllergyPanel | MenuExtras | allergy store | Chooses the eight allergens |
| ContainsTag | Menu card | none | "Contains X" in words |
| CustomizePanel | Menu card | chosen option ids | Choices and running price |
| OptionWords | Cart, My orders, ticket, bill | none | Option names as plain text |
| AllergyWarning | CartExtras | none | Names unsafe dishes |
| ConfirmUnsafe | Cart | open or closed | Confirm or Cancel before placing |
| RequestButtons | MenuExtras | waiting requests | Waiter and bill buttons |
| RequestStrip | Kitchen board card | none | Pulse, words and one Respond per request |
| OrderTracker | My orders card | none | Bar, step word and "About N min" |

## Interaction Notes

- Every control has a 44 px touch area and works by keyboard. Dialogs take focus, close on Escape and return focus.
- All states are in words. Banner, pulse and bar have no motion under reduced motion.
- Option and dish names render as text and never as markup.
- The board's additions keep v1's look. `RequestStrip` and option words are its only visible card changes.
