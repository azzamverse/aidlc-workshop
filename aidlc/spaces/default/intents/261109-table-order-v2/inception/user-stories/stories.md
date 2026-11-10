# User Stories: Table Order v2

Traced from `requirements.md`. Every story is **Must Have**, and each is small enough to be tested alone given the shared foundation. INVEST: each story delivers one outcome to one persona and has its own pass/fail criteria. Dependencies are listed where a story has any.

## Notifications

### US1.1 Order ready banner

As Dana the Diner, I want to be told when my order is ready, so that I don't have to keep checking.

- **AC1.1.1** Given an open diner screen, When one of the table's orders becomes Completed, Then a banner naming the order number appears within 2 seconds, with a short sound and vibration where supported.
- **AC1.1.2** Given a browser that blocks sound or vibration, When an order becomes Completed, Then the banner still appears and no error shows.
- **AC1.1.3** Given a dismissed banner, When the screen reloads, Then that order's banner doesn't return on that device.
- **AC1.1.4** Given two orders this device last saw as Preparing became Completed while it was offline, When the screen loads, Then one banner says "2 orders are ready".
- **AC1.1.5** Given a device that has never seen a table's orders, and Completed orders from before v2, When the screen first loads, Then no banner appears.

### US1.2 New order alert

As Kofi the Kitchen Lead, I want an alert for each new order, so that no ticket is missed.

- **AC1.2.1** Given an open kitchen board, When an order is placed, Then an alert naming the table and order number appears within 2 seconds, with a short sound.
- **AC1.2.2** Given a browser that blocks sound, When an order is placed, Then the alert still appears and no error shows.

### US1.3 Mute

As Dana the Diner, I want a mute switch, so that my phone stays quiet at the table.

- **AC1.3.1** Given mute is on, When an order becomes Completed, Then the banner appears with no sound or vibration.
- **AC1.3.2** Given mute is on, When the screen reloads, Then mute is still on. The kitchen board's mute switch behaves the same way.

## Staff PIN

### US2.1 Enter the PIN

As Farah the Floor Staff, I want staff pages to ask for a PIN, so that diners can't open them.

- **AC2.1.1** Given no staff session, When any staff page opens, Then the PIN screen shows and none of the page's content.
- **AC2.1.2** Given the PIN screen, When the correct PIN is entered, Then the page opens and stays open until the browser closes.
- **AC2.1.3** Given the PIN screen, When a wrong PIN is entered, Then "That PIN isn't right" shows and nothing opens.
- **AC2.1.4** Given 5 wrong tries in a row from one network address, When another try is made, Then the server refuses it for 30 seconds and the screen says so. This applies to all staff on that address, and tests reset the counter between specs.
- **AC2.1.5** Given no `STAFF_PIN` setting, When the server starts, Then it creates a random 4-digit PIN and prints it in the console.
- **AC2.1.6** Given an open staff page, When the session ends, Then the page returns to the PIN screen.

### US2.2 Protected staff actions

As Kofi the Kitchen Lead, I want the server itself to refuse staff actions without the PIN, so that the protection is real.

- **AC2.2.1** Given no staff session, When any staff-only request is made, including the all-tables board read and the all-tables live stream, Then the server answers 401.
- **AC2.2.2** Given no PIN, When a diner uses every diner page, Then each works and receives its own table's live events.
- **AC2.2.3** Given no PIN, When a diner opens a live stream or reads a visit, Then no other table's data is returned.

## Allergy shield

### US3.1 Set my allergies

As Dana the Diner, I want to set my allergies once, so that I don't have to read every description.

- **AC3.1.1** Given the Menu, When the diner opens the allergy setting, Then all eight allergens can be chosen, with a note to check with staff for severe allergies.
- **AC3.1.2** Given chosen allergens, When the diner returns on a later visit on that device, Then the choices are still set.

### US3.2 See unsafe dishes

As Dana the Diner, I want unsafe dishes marked, so that I can avoid them at a glance.

- **AC3.2.1** Given peanuts is chosen, When the Menu shows a dish containing peanuts, Then it says "Contains peanuts" in words, and it can still be added.
- **AC3.2.2** Given no allergens are chosen, When the Menu shows, Then no allergy marks appear.
- **AC3.2.3** Given the seed data, When the menu loads, Then every dish records which of the eight allergens it contains.

### US3.3 Warning before ordering

As Dana the Diner, I want a warning before placing an unsafe order, so that I don't order by mistake.

- **AC3.3.1** Given the cart holds an unsafe dish, When the Cart shows, Then it names the dish and allergen and tells the diner to check with staff.
- **AC3.3.2** Given the cart holds an unsafe dish, When "Place order" is pressed and the diner cancels the confirmation, Then no order is placed and the cart is unchanged.
- **AC3.3.3** Given the cart holds an unsafe dish, When the diner confirms, Then the order is placed.

## Make it yours

### US4.1 Customize a dish

As Dana the Diner, I want to change a dish's options, so that it comes the way I like it.

- **AC4.1.1** Given a dish with options, When "+ Add" is pressed, Then it is added at once with its defaults.
- **AC4.1.2** Given a dish with options, When "Customize" is pressed, Then its choices and the running price show.
- **AC4.1.3** Given pick-one and pick-any groups, When choices are made, Then a pick-one group always keeps exactly one value and a pick-any group allows none or several.
- **AC4.1.4** Given a dish not marked dairy, When its options show, Then extra cheese isn't offered.

### US4.2 Correct price and cart lines

As Dana the Diner, I want options priced correctly, so that the bill holds no surprises.

- **AC4.2.1** Given chosen options, When the order is placed, Then the server works out the line price from the option ids, in exact cents.
- **AC4.2.2** Given a choice that doesn't belong to the dish, or two choices in a pick-one group, When the order is sent, Then the server answers 400 and places no order.
- **AC4.2.3** Given the same dish with different choices, When both are added, Then there are two cart lines. With the same choices, there is one line with quantity 2.
- **AC4.2.4** Given a cart saved by v1 on a device, When it loads, Then its lines use the default choices.
- **AC4.2.5** Given a dish in the cart with two sets of choices, When it sells out, Then both lines are removed.

### US4.3 Kitchen sees the options

As Kofi the Kitchen Lead, I want options on the ticket, so that each dish is made correctly.

- **AC4.3.1** Given an order with options, When it shows on the Cart, My orders, the kitchen ticket and the bill, Then the options appear in words and the line price includes them.

## Call the waiter / Ask for the bill

### US5.1 Ask for staff

As Dana the Diner, I want to call the waiter or ask for the bill, so that I don't have to wave.

- **AC5.1.1** Given an Open visit, When "Call the waiter" is pressed, Then that table's card pulses on the board within 2 seconds and names the request in words.
- **AC5.1.2** Given a waiting request, When the same button is pressed again, Then no second request is made and the button shows staff have been told.
- **AC5.1.3** Given a waiter call is waiting, When "Ask for the bill" is pressed, Then both requests are waiting together.
- **AC5.1.4** Given a waiting request, When the board reloads, Then the card is still pulsing.
- **AC5.1.5** Given a Closed visit, When the diner's screen shows, Then the buttons are gone.

### US5.2 Respond

As Farah the Floor Staff, I want to clear a request once I've gone to the table, so that the board stays accurate.

- **AC5.2.1** Given a table with a waiter call and a bill request, When staff press "Respond" on one, Then only that request clears; each request has its own button.
- **AC5.2.2** Given a request is cleared, When any board or diner screen is open, Then the pulse stops and the diner's button resets within 2 seconds.
- **AC5.2.3** Given waiting requests, When the table is closed, Then they are cleared.

## Animated order tracker

### US6.1 Follow my order

As Dana the Diner, I want a progress bar for each order, so that I can see how far along it is.

- **AC6.1.1** Given an order, When it moves on, Then the bar and the named step update within 2 seconds with no refresh.
- **AC6.1.2** Given a Completed order, When it shows, Then the bar is full with no estimate. Given a Cancelled order, Then "Cancelled" shows with no bar.
- **AC6.1.3** Given the device asks for reduced motion, When the bar changes, Then it doesn't animate.

### US6.2 Estimated wait

As Dana the Diner, I want an estimated wait, so that I can plan my time.

- **AC6.2.1** Given a Pending order with 2 Pending or Preparing orders placed earlier across all tables, When it shows, Then it reads "About 16 min".
- **AC6.2.2** Given no earlier open orders, When an order shows, Then it reads "About 10 min".

## Design

### US7.1 A distinctive look

As Dana the Diner, I want a bold look with 3D depth, so that the restaurant feels special.

- **AC7.1.1** Given the design system, When Menu, Cart, My orders and the new screens are compared with it, Then each uses its colours, type, spacing, radius, shadows and components.
- **AC7.1.2** Given a restyled screen, When used, Then the 3-tab bottom bar, sticky category pills, 44 px touch areas, keyboard access and reduced motion all still work.
- **AC7.1.3** Given the kitchen board and table bill, When they show, Then they keep v1's look and gain only the listed additions.
- **AC7.1.4** Given every new or changed screen, When tests run, Then a mockup-match spec passes against its mockup in v2's own record, and `index.html` links them all.

## Protecting v1

### US8.1 Upgrade safely

As Kofi the Kitchen Lead, I want the upgrade to keep our data, so that nothing from v1 is lost.

- **AC8.1.1** Given an existing v1 database, When v2 starts, Then it upgrades by adding only, and all its data is kept.
- **AC8.1.2** Given an empty database, When v2 starts, Then the seed holds 10 tables, 4 categories and 12 items.
- **AC8.1.3** Given an order with no options, When it is returned, Then its shape is exactly v1's.
- **AC8.1.4** Given a v1 test that a chosen change makes out of date, When it changes, Then the change is listed in that Unit's `code-summary.md`.

## X-factors

### US9.1 The Living Table

As Dana the Diner, I want to see my meal on a 3D table, so that waiting becomes fun.

- **AC9.1.1** Given orders in the current visit, When the table view opens, Then one plate shows per dish ordered, up to 12, then "+N more". Cancelled orders show none.
- **AC9.1.2** Given a plate, When its order is Pending, Preparing or Completed, Then it is covered, steaming, or uncovered, changing within 2 seconds.
- **AC9.1.3** Given the view, When the diner drags or presses the left and right arrow keys, Then the table spins.
- **AC9.1.4** Given 3D can't run, When the view opens, Then the same dishes and states show as text with no error.

### US10.1 Kitchen Theatre

As Dana the Diner, I want to watch my tickets travel through a miniature kitchen, so that I can see my food being made.

- **AC10.1.1** Given an order, When it is Pending, Preparing or Completed, Then its ticket sits at the start of the rail, at the stove, or at the pass, moving within 2 seconds.
- **AC10.1.2** Given a ticket, When it shows, Then its order number and status are in words, and no other table's orders appear. Cancelled orders show no ticket.
- **AC10.1.3** Given 3D can't run, When the view opens, Then the same information shows as text with no error.

### US11.1 Spin the Bottle

As Dana the Diner, I want to spin a bottle with my table, so that we can decide who pays or orders dessert.

- **AC11.1.1** Given an Open visit, When a diner chooses 2 to 8 seats and a question and spins, Then the server picks the seat, and every open diner screen for that table shows the same spin and result within 2 seconds.
- **AC11.1.2** Given a spin is running, or two diners spin at once, When another spin is requested, Then the server accepts only the first and refuses the rest until 5 seconds after it started.
- **AC11.1.3** Given a screen opens during a spin, When it loads, Then it shows the current result.
- **AC11.1.4** Given fewer than 2 or more than 8 seats, When a spin is requested, Then it is refused.
- **AC11.1.5** Given a spin, When it finishes, Then no payment is taken and no name is recorded. Under reduced motion or with no 3D, the result shows straight away.

### US12.1 Chef's Dice

As Dana the Diner, I want dice to pick a dish for my mood, so that deciding is fun.

- **AC12.1.1** Given a mood, When the diner taps or presses Enter, Then 3D dice roll and suggest one dish matching the mood that isn't sold out and contains none of the chosen allergens, with "Add to cart" and "Roll again".
- **AC12.1.2** Given a phone allowing motion, When it is shaken, Then the dice roll. Given motion is denied or unavailable, Then tap and Enter still work and no error shows.
- **AC12.1.3** Given no dish qualifies, When the dice roll, Then the app says so and suggests none.
- **AC12.1.4** Given the seed data, When the Menu loads, Then every dish has a mood.

## Dependencies

All stories depend on the shared foundation (Unit 5). US4.3 depends on US4.2, and US5.2 on US5.1, for their data; each can still be tested alone by setting that data up directly.
