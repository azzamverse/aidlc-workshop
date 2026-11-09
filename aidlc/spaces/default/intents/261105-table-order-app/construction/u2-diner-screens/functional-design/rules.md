# Rules: u2-diner-screens

Screen rules for the diner's device. The server rules belong to U1 (`construction/u1-walking-skeleton/functional-design/rules.md`). Words on screen come from the refined mockups.

```yaml
rules:
  - id: BR1.1
    statement: The Menu shows every category in order, with each item's image, name, description and price.
    category: policy
    applies_to: Menu
    trigger: menu loaded
    logic: IF the menu has loaded THEN show the categories under sticky navigation pills
    violation: not applicable
    source: FR1.1, FR1.2
  - id: BR1.2
    statement: The Menu shows skeleton cards while loading, and an error with Try again when loading fails, never an empty menu.
    category: policy
    applies_to: Menu
    trigger: menu request
    logic: IF the request is running THEN show skeletons; IF it fails THEN show "We couldn't load the menu. Check your connection and try again." with Try again
    violation: not applicable
    source: FR1.4
  - id: BR1.3
    statement: A sold-out item shows "Sold out" in place of "+ Add", so it cannot be added.
    category: constraint
    applies_to: Menu
    trigger: item marked sold out
    logic: IF soldOut THEN show the tag, grey the image and offer no add action
    violation: no action exists
    source: FR1.3
  - id: BR1.4
    statement: An open Menu applies sold-out changes from the live stream, with no refresh.
    category: policy
    applies_to: Menu
    trigger: menu.item-updated
    logic: IF the event arrives THEN update that item only, within 2 seconds of the change, and never edit the cart; on resync or a new connection THEN reload the menu
    violation: not applicable
    source: FR8.2, NFR1
  - id: BR2.1
    statement: Adding joins an existing line or creates one, and the total is always the sum of price times quantity.
    category: calculation
    applies_to: Cart
    trigger: add, stepper or remove
    logic: total = sum(unitPriceCents * quantity), in whole cents
    violation: not applicable
    source: FR2.1, FR2.3
  - id: BR2.2
    statement: A line's quantity stays between 1 and 20, and each limit disables its button.
    category: validation
    applies_to: Cart, Menu
    trigger: stepper or add
    logic: IF quantity is 20 THEN "+" is disabled and "+ Add" leaves it at 20; IF quantity is 1 THEN "−" is disabled and only Remove takes the line out
    violation: the quantity does not change
    source: FR2.2
  - id: BR2.3
    statement: The cart is saved on this device for this table and visit, so it survives a refresh and is never shared with another device.
    category: policy
    applies_to: Cart
    trigger: any cart change
    logic: save the visit id, the lines and the placement key in the browser's local storage under the table's own key; unreadable saved data counts as an empty cart
    violation: if storage is unavailable the cart works until the page closes
    source: FR2.4
  - id: BR2.4
    statement: A saved cart from a different visit is cleared when the view opens.
    category: constraint
    applies_to: Cart
    trigger: table loaded
    logic: IF the saved visit id differs from the current one THEN empty the cart with no message
    violation: not applicable
    source: FR10.5
  - id: BR2.5
    statement: An empty cart shows "Your cart is empty" and Browse the menu, with no Place order button.
    category: policy
    applies_to: Cart
    trigger: no lines
    logic: IF no lines THEN show the empty view
    violation: not applicable
    source: FR2.5
  - id: BR3.1
    statement: A successful placement empties the cart and opens My orders with "Order #N placed".
    category: policy
    applies_to: Cart
    trigger: placement succeeds
    logic: clear the cart, take a new placement key, go to My orders with the message
    violation: not applicable
    source: FR3.1
  - id: BR3.2
    statement: One placement key belongs to one set of lines, and Place order is disabled while sending.
    category: constraint
    applies_to: Cart
    trigger: placement or cart change
    logic: IF the lines change THEN take a new key; IF they are unchanged THEN a retry reuses the saved key, even after a refresh
    violation: the server returns the first order, so none is duplicated
    source: FR3.4
  - id: BR3.3
    statement: A refusal for a sold-out item names it, removes it, keeps the rest and creates no order.
    category: policy
    applies_to: Cart
    trigger: ITEM_SOLD_OUT
    logic: remove each line in soldOutItemIds and show "<names> just sold out, so we took it out of your cart. Nothing has been ordered yet."; the empty view shows beneath it if nothing is left
    violation: not applicable
    source: FR3.3
  - id: BR3.4
    statement: Any other failed placement keeps the cart unchanged and says so.
    category: policy
    applies_to: Cart
    trigger: no answer or a refusal other than sold out or closed
    logic: each try has the 5-second timeout. IF no answer comes THEN `placeOrder` in client/src/shared/api.js retries once with the same key, and the button reads "Placing…" and stays disabled for those up to 10 seconds. IF that fails too, or the server refuses, THEN show "We couldn't place your order. Your cart is safe. Please try again."
    violation: not applicable
    source: FR3.5, NFR11
  - id: BR3.5
    statement: Text from the server is shown as plain text.
    category: constraint
    applies_to: all diner screens
    trigger: rendering
    logic: never insert server text as markup
    violation: not applicable
    source: NFR5
  - id: BR4.1
    statement: My orders shows all of the table's orders for this visit with number, items and status, or "No orders yet".
    category: policy
    applies_to: My orders
    trigger: screen opened
    logic: read the visit's orders; show skeletons while reading, newest first when loaded, the empty view when none, and an error with Try again on failure
    violation: not applicable
    source: FR4.1, FR4.3
  - id: BR4.2
    statement: My orders applies placed and updated orders from the live stream, whichever device or person caused them.
    category: policy
    applies_to: My orders
    trigger: order.placed, order.updated
    logic: replace the order with the same id or add it, within 2 seconds of the change; ignore an order from another visit
    violation: not applicable
    source: FR4.2
  - id: BR4.3
    statement: While the stream is down every diner screen shows the reconnecting notice, and each new connection reloads the screen's data.
    category: policy
    applies_to: all diner screens
    trigger: connection lost or regained, resync
    logic: IF not connected after the first connection THEN show "Reconnecting… we'll catch up on any changes."; on reconnect or resync THEN reload
    violation: not applicable
    source: FR4.4
  - id: BR4.4
    statement: A status is always shown as a word and an icon, and changes are announced politely.
    category: constraint
    applies_to: My orders
    trigger: rendering
    logic: use the StatusChip for Pending, Preparing, Completed and Cancelled
    violation: not applicable
    source: NFR6
  - id: BR5.1
    statement: Only a Pending order offers Cancel order, whichever device placed it.
    category: constraint
    applies_to: My orders
    trigger: rendering
    logic: IF status is Pending THEN offer Cancel order; otherwise offer nothing
    violation: not applicable
    source: FR5.1, FR5.2
  - id: BR5.2
    statement: A refused cancel shows the current status at once.
    category: policy
    applies_to: My orders
    trigger: ORDER_STATE_CONFLICT
    logic: apply currentStatus to the order; IF Preparing THEN show "Order #N is already being prepared, so it can't be cancelled."; otherwise show "Order #N is already <status>, so it can't be cancelled."
    violation: not applicable
    source: FR5.2
  - id: BR6.1
    statement: When the table closes, the device empties its cart and orders and shows "This table was closed".
    category: policy
    applies_to: all diner screens
    trigger: table.closed for the visit held, a new connection finding a different visit, or TABLE_CLOSED on placing
    logic: clear the saved cart, clear the orders, set the badge to 0 and show the closed card in place of the screen
    violation: not applicable
    source: FR10.5, FR10.7
  - id: BR6.2
    statement: The closed card stays until the diner presses a tab or refreshes, and only then does a new visit start.
    category: constraint
    applies_to: all diner screens
    trigger: closed card showing
    logic: every reconnect check, in any state, reads the visit with GET /api/tables, which starts no visit; GET /api/tables/:id runs only on a tab press or refresh. IF the table's visitId is empty or differs from the held one THEN BR6.1 applies. A closed device keeps the closed visit id, ignores live events, does no reloads, and does not adopt a new visit until a tab press or refresh
    violation: not applicable
    source: FR10.6, FR10.5
  - id: BR7.3
    statement: An unknown table address shows the frame's "Table not found" message, and no diner screen opens.
    category: policy
    applies_to: all diner screens
    trigger: TABLE_NOT_FOUND from the frame
    logic: U1's frame shows the message and renders none of U2's screens; U2 adds a browser check of it
    violation: not applicable
    source: FR12.1
  - id: BR7.1
    statement: Every diner action works by keyboard, with visible focus, labels and no colour-only signal.
    category: constraint
    applies_to: all diner screens
    trigger: rendering
    logic: use real buttons and links, with labels such as "Add Coffee" and "One more Coffee"
    violation: not applicable
    source: NFR6
  - id: BR7.2
    statement: Under reduced motion no transition runs and pills jump rather than scroll smoothly.
    category: constraint
    applies_to: all diner screens
    trigger: prefers-reduced-motion
    logic: IF the device asks for it THEN use no animation or smooth scrolling
    violation: not applicable
    source: NFR7
```

## Summary

| Group | Covers |
|---|---|
| BR1 | Menu, its states and live sold-out marks |
| BR2 | The cart, its limits and its storage on the device |
| BR3 | Placing an order and each way it can fail |
| BR4 | My orders and live updates |
| BR5 | Cancelling |
| BR6 | The reset when a table closes |
| BR7 | Keyboard and reduced motion |
