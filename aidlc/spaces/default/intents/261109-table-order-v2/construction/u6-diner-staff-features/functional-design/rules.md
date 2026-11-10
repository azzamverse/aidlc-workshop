# Business Rules: U6 Diner and Staff Features

From `requirements.md`, `stories.md`, `components.md` and `contract-summary.md`.

```yaml
rules:
  - { id: BR1.1, statement: A newly Completed order raises a banner on every open diner screen of its table., category: policy, applies_to: diner screens, trigger: an order event showing Completed, logic: IF this device saw the order open and has not dismissed it THEN show a banner naming the order number within 2 seconds, violation: none, source: FR1.1 }
  - { id: BR1.2, statement: Sound and vibration never decide whether a banner shows., category: policy, applies_to: diner banner and kitchen alert, trigger: a banner or alert, logic: IF not muted THEN try sound and vibration where supported and ignore any refusal, violation: the banner still shows with no error, source: "FR1.2, FR1.5" }
  - { id: BR1.3, statement: A dismissed banner does not return on that device., category: policy, applies_to: diner banner, trigger: dismiss or reload, logic: IF the order id is in the device's dismissed list THEN show nothing, violation: none, source: FR1.3 }
  - { id: BR1.4, statement: Orders that finished while the device was away share one banner., category: calculation, applies_to: diner screen load, trigger: screen load or reconnect, logic: IF one or more current-visit orders last seen Pending or Preparing are now Completed THEN show one banner naming the order, or "N orders are ready" for several, violation: none, source: FR1.4 }
  - { id: BR1.5, statement: Orders never seen and closed visits are never announced., category: constraint, applies_to: diner screen load, trigger: screen load, logic: IF the device has no last-seen status for an order or the visit changed THEN record it silently, violation: no banner, source: FR1.4 }
  - { id: BR1.6, statement: Each new order alerts the kitchen board., category: policy, applies_to: kitchen board, trigger: order.placed, logic: Show an alert naming the table and order number within 2 seconds, violation: none, source: FR1.5 }
  - { id: BR1.7, statement: Mute stops sound and vibration and never a banner., category: policy, applies_to: diner screens and kitchen board, trigger: any banner or alert, logic: IF muted THEN stay silent. The setting survives a reload on that device, violation: none, source: FR1.6 }
  - { id: BR3.1, statement: Eight allergens can be chosen and stay on the device., category: policy, applies_to: allergy setting, trigger: opening or changing the setting, logic: Offer gluten dairy eggs nuts peanuts soy fish shellfish and save to the U5 allergy store, violation: none, source: "FR3.1, FR3.2, FR3.7" }
  - { id: BR3.2, statement: A dish with a chosen allergen says so in words and can still be added., category: policy, applies_to: Menu, trigger: Menu render, logic: IF the dish holds a chosen allergen THEN show "Contains" and the allergen name. No choices means no marks, violation: none, source: "FR3.4, FR3.6" }
  - { id: BR3.3, statement: Options never change allergy marks., category: constraint, applies_to: Menu and Cart, trigger: any option choice, logic: Marks and warnings read the dish's allergens only, violation: none, source: FR4.1 }
  - { id: BR3.4, statement: An unsafe cart is warned about and placing asks to confirm., category: policy, applies_to: Cart, trigger: Cart render and Place order, logic: IF a line is unsafe THEN name the dish and allergen and tell the diner to check with staff. Place order asks first and Cancel changes nothing, violation: no order is placed on Cancel, source: "FR3.5, FR3.7" }
  - { id: BR4.1, statement: Plus Add uses the defaults at once., category: policy, applies_to: Menu, trigger: "+ Add", logic: Add one line with default choices and open nothing, violation: none, source: FR4.2 }
  - { id: BR4.2, statement: Customize shows choices and a running price., category: policy, applies_to: options panel, trigger: Customize, logic: A pick-one group always keeps one value and a pick-any group allows none or several. The price is the item price plus the chosen price changes, violation: none, source: "FR4.1, FR4.3" }
  - { id: BR4.3, statement: An option is offered only on a dish already marked with its allergens., category: constraint, applies_to: seed data and options panel, trigger: reading options, logic: Extra cheese appears only on dishes marked dairy, violation: the option is not offered, source: FR4.1 }
  - { id: BR4.4, statement: The server prices each line from option ids in exact cents., category: calculation, applies_to: placing an order, trigger: order placed, logic: Unit price is item price plus each applied option's price change including defaults for groups left out, violation: none, source: "FR4.4, NFR8" }
  - { id: BR4.5, statement: Invalid choices refuse the whole order., category: validation, applies_to: placing an order, trigger: order placed, logic: IF optionIds is present and is not a list of text or an option does not belong to the dish or two are in one pick-one group or an id repeats THEN refuse. An empty list means the defaults, violation: "status 400, code INVALID_OPTIONS, no order is placed", source: FR4.4 }
  - { id: BR4.6, statement: Cart lines are identified by dish and choices., category: constraint, applies_to: cart, trigger: adding, logic: The same dish and choices add to one line and different choices make another. A v1 saved line loads with defaults, violation: none, source: "FR4.5, FR4.7" }
  - { id: BR4.7, statement: A sold-out dish leaves the cart whatever its choices., category: policy, applies_to: cart, trigger: sold-out event or refusal, logic: Remove every line of that dish, violation: none, source: FR4.8 }
  - { id: BR4.8, statement: Recorded options show in words everywhere., category: policy, applies_to: "Cart, My orders, kitchen ticket, bill", trigger: render, logic: Show option names as plain text under the line. The line price includes them, violation: none, source: "FR4.6, NFR5" }
  - { id: BR4.9, statement: An order with no recorded options keeps v1's shape., category: constraint, applies_to: order reads, trigger: any read, logic: Leave the options field out when empty, violation: none, source: FR8.3 }
  - { id: BR5.1, statement: Requests can be made only during an Open visit., category: validation, applies_to: request buttons and route, trigger: a request, logic: IF no visit is open THEN refuse and hide the buttons, violation: status 409, source: FR5.1 }
  - { id: BR5.2, statement: One waiting request per kind and repeats change nothing., category: constraint, applies_to: requests, trigger: a request, logic: IF one of that kind is waiting THEN return it. A database uniqueness guard holds this when two presses arrive together. Waiter and bill can wait together, violation: none, source: "FR5.5, FR5.6" }
  - { id: BR5.3, statement: A waiting request makes the card pulse until answered., category: policy, applies_to: kitchen board, trigger: a waiting request or board load, logic: Pulse the card and name each request in words within 2 seconds and after reload, violation: none, source: "FR5.2, FR5.3" }
  - { id: BR5.4, statement: Respond clears exactly one request and needs a staff session., category: authorization, applies_to: Respond, trigger: Respond, logic: IF signed in THEN mark that request responded and publish the change. A repeat changes nothing, violation: status 401 without a session, source: "FR5.4, FR2.4" }
  - { id: BR5.5, statement: Closing a table clears its waiting requests., category: policy, applies_to: close table, trigger: table closed, logic: Waiting requests belong to the visit and stop counting when it closes, violation: none, source: FR5.7 }
  - { id: BR6.1, statement: The tracker shows the order's step in a bar and words., category: policy, applies_to: My orders, trigger: render or order event, logic: Pending and Preparing and Completed fill the bar and name the step within 2 seconds. Completed is full with no estimate. Cancelled shows the word and no bar, violation: none, source: "FR6.1, FR6.3, FR6.4" }
  - { id: BR6.2, statement: The wait is 10 plus 3 per earlier open order., category: calculation, applies_to: order reads, trigger: each read and queue.changed, logic: For a Pending or Preparing order N is 10 plus 3 times the Pending or Preparing orders placed earlier across all tables, violation: none, source: FR6.2 }
  - { id: BR6.3, statement: Banner pulse and tracker do not move under reduced motion., category: constraint, applies_to: motion, trigger: the device setting, logic: Turn off animation and keep every state in words, violation: none, source: "FR6.5, NFR7" }
```

## Rules Summary

| Group | Rules | Covers |
|---|---|---|
| Notifications | BR1.1 to BR1.7 | Banners, kitchen alerts, mute |
| Allergy shield | BR3.1 to BR3.4 | Setting, marks, warning |
| Make it yours | BR4.1 to BR4.9 | Options, pricing, cart lines, display |
| Requests | BR5.1 to BR5.5 | Waiter and bill |
| Tracker | BR6.1 to BR6.3 | Progress and wait |

## Assumptions & Open Questions

- [assumption] Requests are refused with 409 when no visit is open, and starting a request never opens a visit.
- [assumption] Two orders placed in the same instant are ordered by order number for the estimate.
