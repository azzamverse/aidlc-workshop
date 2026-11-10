# Requirements: Table Order v2

## Intent Analysis

v2 turns v1 into an app an independent sit-down restaurant would choose over its competitors, as set out in `intent-statement.md`. The six features and the changes allowed to v1 are fixed by `scope-document.md`. How the work builds on the existing app comes from the code notes `business-overview.md`, `architecture.md` and `code-structure.md`.

- **Request type:** enhancement of an existing app, across several components.
- **Depth:** Standard.
- **Success:** each of the 10 features has a passing browser test of its main flow, and `npm test && npm run test:e2e` passes with v1's tests included, so all of them can be shown in the 5-minute demo.

## Functional Requirements

### FR1 Notifications

- **FR1.1** When one of a table's orders becomes Completed, every open diner screen for that table shows a banner within 2 seconds saying the order is ready, naming its number.
- **FR1.2** The diner's banner plays a short sound, and vibrates on devices that support vibration. If the browser blocks either, the banner still shows and no error appears.
- **FR1.3** A diner who dismisses a banner does not see it again for that order, on that device.
- **FR1.4** An order of the current visit that this device last saw as Pending or Preparing, and that became Completed while the device was offline or changing tabs, is announced when the screen next loads. Several such orders share one banner, such as "2 orders are ready". Orders the device has never seen, and orders of closed visits, are never announced.
- **FR1.5** When an order is placed, the kitchen board shows a new-order alert within 2 seconds, naming the table and order number, with a short sound.
- **FR1.6** Diner screens and the kitchen board each have a mute switch. It stops sound and vibration, never the banner, and its setting survives a reload on that device.

### FR2 Staff PIN

- **FR2.1** Opening any staff page without a valid staff session shows a PIN screen and none of the page's content.
- **FR2.2** The correct PIN opens the staff pages, and the session lasts until the browser closes.
- **FR2.3** A wrong PIN shows "That PIN isn't right" and opens nothing. After 5 wrong tries in a row from one network address, the server refuses further tries from that address for 30 seconds, and the PIN screen says so.
- **FR2.4** The server refuses every staff-only request without a valid session with status 401: reading the all-tables board, moving an order, marking items sold out, reading a bill, closing a table, responding to a waiter call, and opening the live stream for all tables.
- **FR2.5** Every diner page and diner request works with no PIN. A diner's live stream is limited to that diner's own table and stays open. A diner reads only its own table's current visit, through a request that returns no other table's data, so the all-tables board read can be staff-only.
- **FR2.6** The PIN comes from the `STAFF_PIN` setting. If it is missing, the server creates a random 4-digit PIN at start and prints it in the console. No PIN is written in the code.
- **FR2.7** A staff session that ends while a staff page is open returns that page to the PIN screen.

### FR3 Allergy shield

- **FR3.1** The diner can open an allergy setting from the Menu and choose any of gluten, dairy, eggs, nuts, peanuts, soy, fish and shellfish.
- **FR3.2** The diner's choices are kept on that device, including across later visits, until the diner changes them.
- **FR3.3** Every menu item records which of the eight allergens it contains.
- **FR3.4** A dish containing a chosen allergen is marked on the Menu with the word "Contains" and the allergen's name, not by colour alone. It can still be added.
- **FR3.5** When the cart holds a dish containing a chosen allergen, the Cart names the dish and allergen, and "Place order" first asks the diner to confirm. Cancelling leaves the cart unchanged.
- **FR3.6** With no allergens chosen, the Menu shows no allergy marks and the Cart shows no warning.
- **FR3.7** The allergy setting and the Cart's warning tell the diner to check with staff for severe allergies.

### FR4 Make it yours

- **FR4.1** Selected dishes have option groups. Spice level (default Medium) and size (default Regular) are pick-one and always have a value. Extras, such as no onions and extra cheese, are pick-any and default to none. Each choice has a price change of zero or more cents. An option is offered only on a dish already marked with every allergen that option contains, so extra cheese appears only on dishes marked dairy. Choosing or removing an option never changes a dish's allergy marks, so "no onions" or similar never makes a dish count as safe.
- **FR4.2** "+ Add" still adds a dish at once with its default choices.
- **FR4.3** A dish with options shows a "Customize" link, with a 44 px touch area, that opens its choices and shows the running price.
- **FR4.4** The server works out each line's price from the choices sent as ids. A choice that doesn't belong to the dish, or two choices in a pick-one group, is refused with status 400 and places no order. A pick-one group left out takes its default.
- **FR4.5** The same dish with different choices makes separate cart lines, each with its own quantity. The same dish with the same choices adds to one line.
- **FR4.6** Chosen options appear on the Cart, My orders, the kitchen ticket and the bill, in words. The line price includes them.
- **FR4.7** A cart saved on a device by v1 still loads, and its lines use the default choices.
- **FR4.8** When a dish sells out, every cart line of that dish is removed, whatever its choices.

### FR5 Call the waiter / Ask for the bill

- **FR5.1** Diner screens have "Call the waiter" and "Ask for the bill" buttons while the device holds a visit whose status is Open. Once that visit is Closed, the buttons are gone.
- **FR5.2** Pressing one makes that table's card pulse on the kitchen board within 2 seconds, and names the request in words.
- **FR5.3** The card keeps pulsing, including after a page reload, until staff press "Respond" on it.
- **FR5.4** After staff respond, the pulse stops on every open board and the diner's button returns to normal, within 2 seconds.
- **FR5.5** Pressing a button again while that request is waiting doesn't create another, and the button shows that staff have been told.
- **FR5.6** A table can have one of each request waiting at the same time.
- **FR5.7** Closing a table clears its waiting requests.

### FR6 Animated order tracker

- **FR6.1** Each order on My orders shows Pending, Preparing and Completed as a progress bar, with the current step named in words.
- **FR6.2** A Pending or Preparing order shows "About N min", where N is 10 plus 3 for every Pending or Preparing order placed earlier, across all tables.
- **FR6.3** The bar and the estimate update within 2 seconds of an order changing, with no refresh.
- **FR6.4** A Completed order shows a full bar and no estimate. A Cancelled order shows "Cancelled" and no bar.
- **FR6.5** The bar's animation stops when the device asks for reduced motion.

### FR7 Design system

- **FR7.1** One written design system defines colours, type scale, spacing, radius, shadows and components.
- **FR7.2** Every new screen and panel uses it: the PIN screen, the allergy setting, the options panel and the four 3D X-factors.
- **FR7.3** Menu, Cart and My orders get a bold new look with visible 3D depth from the design system. The kitchen board and table bill keep v1's look, and only gain the additions listed in `scope-document.md`.
- **FR7.4** Each new or changed screen has a high-fidelity mockup in v2's own record, linked from an `index.html`, and a mockup-match spec.
- **FR7.5** The bottom tab bar with its 3 tabs, the sticky category pills, the 44 px touch areas, reduced motion and keyboard access stay on every restyled screen.

### FR8 Protecting v1

- **FR8.1** Database changes only add new tables or new columns with defaults, and an existing v1 database upgrades at start with its data kept.
- **FR8.2** v1's seed still loads, with 10 tables, 4 categories and 12 items.
- **FR8.3** Fields new in v2 are left out of v1's data shapes when empty. An order placed with no options returns exactly v1's shape.
- **FR8.4** A v1 test changes only when a chosen change makes it out of date, and every such change is listed in that Unit's `code-summary.md`.

### FR9 The Living Table (X-factor)

- **FR9.1** My orders has a 3D table view showing one plate for each dish in the current visit's orders that aren't Cancelled, with a dish's quantity shown as that many plates, up to 12 plates and then a "+N more" label.
- **FR9.2** A plate is covered while Pending, steams while Preparing, and has its cover lifted when Completed, changing within 2 seconds of the order changing, with no refresh.
- **FR9.3** The diner can spin the table by dragging, and by the left and right arrow keys.

### FR10 Kitchen Theatre (X-factor)

- **FR10.1** My orders has a 3D miniature kitchen where each of this table's orders not Cancelled is a ticket on a rail.
- **FR10.2** A ticket sits at the start of the rail while Pending, at the stove while Preparing, and at the pass when Completed, moving within 2 seconds of the order changing.
- **FR10.3** Each ticket shows its order number and status in words. No other table's orders are shown.

### FR11 Spin the Bottle (X-factor)

- **FR11.1** While the visit is Open, My orders has a 3D bottle. A diner chooses 2 to 8 seats and a question, either "Who picks up the tab?" or "Who orders dessert?", then spins it.
- **FR11.2** The server chooses the seat at random, and every open diner screen for that table shows the same spin and result within 2 seconds.
- **FR11.3** A second spin is refused until the current one has finished, 5 seconds after it started. The app takes no payment and records no one's name.

### FR12 Chef's Dice (X-factor)

- **FR12.1** The Menu has a Chef's Dice button. The diner picks a mood, Light, Hearty, Sweet or Surprise me, then rolls 3D dice by tapping, by pressing Enter, or by shaking the phone where motion is available.
- **FR12.2** The roll suggests one dish that matches the mood, isn't sold out and contains none of the diner's chosen allergens, with an "Add to cart" button and a "Roll again" button.
- **FR12.3** If no dish qualifies, the app says so and suggests none.

## Non-Functional Requirements

- **NFR1 Live updates:** every live change in FR1, FR5 and FR6 reaches an open screen within 2 seconds.
- **NFR2 Durability:** waiting requests, chosen options and allergen data survive a server restart.
- **NFR3 Mockup match:** each new or changed screen passes its mockup-match spec.
- **NFR4 Screen widths:** diner additions work at 360 px and staff additions at 1024 px, with no clipped content or sideways scrolling.
- **NFR5 Security:** every staff-only request is checked on the server, the session cookie can't be read by page scripts, inputs are validated, and text from options never runs as code.
- **NFR6 Accessibility:** every new control works by keyboard and has a 44 px touch area, and every state is shown in words, not colour alone.
- **NFR7 Reduced motion:** the banner, the pulse and the tracker have no motion when the device asks for reduced motion.
- **NFR8 Exact money:** option prices and totals are exact whole cents.
- **NFR9 Browsers:** the whole suite passes in Chromium, Google Chrome and WebKit.
- **NFR10 Settings:** every port, the database file and `STAFF_PIN` come from environment settings, and parallel builds never share a port or database.
- **NFR11 Errors:** failed requests are logged on the server and shown to the person in plain words.
- **NFR12 3D fallback:** where 3D can't run, each 3D X-factor shows the same information in plain text and controls, with no error. Under reduced motion, 3D scenes are shown still and spins and rolls jump straight to their result.
- **NFR13 3D loading:** 3D code loads only when a 3D view is opened, so the Menu's first load doesn't wait for it.

## Constraints

- The stack stays React, Node.js with Express, SQLite and Server-Sent Events.
- The app runs locally with `npm install && npm start`, at http://localhost:3000.
- New work is split into Units from U5 with one Bolt each: U5 first, then U6 and U7 in parallel, each using only v1 and U5.
- The hand-in is due by the end of Tuesday 10 November 2026.

## Assumptions

| Assumption | Reason |
|---|---|
| "Ready" means the existing Completed status | A new status would mean rebuilding the orders table, which breaks the add-only rule |
| The estimate's base is 10 minutes, plus 3 per order ahead | The chosen simple rule needs set numbers, and these are reasonable for a sit-down restaurant |
| Options and allergen data are set in the seed | Menu management was not chosen, so staff can't edit them |
| Staff are not told which diner pressed a button | Diners have no accounts, so only the table is known |
| One shared PIN covers all staff | The chosen design has no individual staff logins |
| 3D is drawn with an open-source browser library, added as a dependency | The brief rules out only paid services, and real 3D scenes need one; Domain Design names it |
| Each dish gets a mood tag in the seed | Chef's Dice needs one, and staff can't edit the menu |
| The 3D X-factors sit inside My orders and the Menu | The tab bar must stay at exactly 3 tabs |
| Spin the Bottle lives on My orders | The bill screen is staff-only behind the PIN, so diners can't reach it |

## Out of Scope

- Payments, native mobile apps, cloud deployment, diner accounts, email or SMS, and anything that needs a paid external service.
- A new look for the kitchen board and table bill.
- Staff editing of menus, options or allergens.
- Every feature in the brief's lists that was not chosen.

## Open Questions

None.
