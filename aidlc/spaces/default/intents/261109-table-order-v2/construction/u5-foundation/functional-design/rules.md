# Business Rules: U5 Foundation

From `requirements.md`, `stories.md`, `components.md` and `contract-summary.md`.

```yaml
rules:
  - id: BR1.1
    statement: Only staff with a valid session reach staff-only requests.
    category: authorization
    applies_to: all-tables board read, all-tables stream, moving an order, sold-out marks, bill read, close table
    trigger: any such request
    logic: IF the session cookie is missing or unknown THEN refuse
    violation: status 401, nothing changes or is returned
    source: FR2.4
  - id: BR1.2
    statement: The correct PIN starts a session that ends with the browser.
    category: authorization
    applies_to: PIN entry
    trigger: a PIN is sent
    logic: IF not locked out and the PIN matches THEN create a session in a cookie page scripts can't read, with no expiry date, and clear the wrong-try count
    violation: see BR1.3
    source: FR2.2, NFR5
  - id: BR1.3
    statement: A wrong PIN opens nothing.
    category: validation
    applies_to: PIN entry
    trigger: a PIN that doesn't match, or a missing or non-text PIN
    logic: IF the PIN is wrong THEN add one to that address's count
    violation: status 401, code PIN_WRONG, shown as "That PIN isn't right"
    source: FR2.3
  - id: BR1.4
    statement: Five wrong tries in a row lock one address for 30 seconds.
    category: policy
    applies_to: PIN entry
    trigger: the fifth wrong try in a row, then every try while locked
    logic: IF the count reaches 5 THEN refuse every try from that address, correct or not, until 30 seconds have passed, then reset the count
    violation: status 429, code PIN_LOCKED, and the screen says so
    source: FR2.3
  - id: BR1.5
    statement: The PIN is never in the code.
    category: constraint
    applies_to: server start
    trigger: start
    logic: IF STAFF_PIN is set THEN use it, ELSE create a random 4-digit PIN and print it in the console
    violation: none
    source: FR2.6
  - id: BR1.6
    statement: Staff pages show nothing until a session is confirmed, and go back to the PIN screen when it ends.
    category: authorization
    applies_to: every staff page
    trigger: opening a page, or any staff request answering 401
    logic: IF there is no session THEN show only the PIN screen
    violation: none
    source: FR2.1, FR2.7
  - id: BR1.7
    statement: The lockout reset for tests exists only under test.
    category: constraint
    applies_to: test-only route
    trigger: server start
    logic: IF NODE_ENV is test THEN the route exists, ELSE it does not
    violation: not found
    source: FR2.3
  - id: BR2.1
    statement: Diners need no PIN.
    category: policy
    applies_to: every diner page and request
    trigger: any diner request
    logic: Diner routes take no session check
    violation: none
    source: FR2.5
  - id: BR2.2
    statement: A diner's live stream carries only its own table's events and the two no-table events.
    category: authorization
    applies_to: live stream with a table id
    trigger: an event is delivered
    logic: IF the event's table is this table, or the event is menu.item-updated or queue.changed THEN deliver it, ELSE drop it. Replay after reconnect follows the same filter. An unknown table id answers 404
    violation: the event isn't delivered
    source: FR2.5, NFR5
  - id: BR2.3
    statement: Reading a table's visit returns only that table and starts no visit.
    category: constraint
    applies_to: diner visit read
    trigger: a diner screen loads
    logic: Return id, label and open visit id or null. Unknown table answers 404
    violation: 404
    source: FR2.5
  - id: BR3.1
    statement: The database upgrade only adds, and each step runs once.
    category: constraint
    applies_to: server start
    trigger: start, on a new or v1 database
    logic: Run U5's steps, then U6's, then U7's, in one transaction per step, skipping any recorded id
    violation: a failing step stops the server with its id logged, and earlier data stays
    source: FR8.1
  - id: BR3.2
    statement: v1's seed stays as it is, and details are added separately.
    category: constraint
    applies_to: seed
    trigger: empty database, or a v1 database with no details
    logic: Load 10 tables, 4 categories and 12 items as v1 does, then add details by item name, never changing an item row or overwriting existing details
    violation: none
    source: FR8.2, FR3.3
  - id: BR3.3
    statement: v2 fields don't change v1's shapes when empty.
    category: constraint
    applies_to: order and bill reads
    trigger: any read
    logic: An order with no options returns exactly v1's fields
    violation: none
    source: FR8.3
  - id: BR3.4
    statement: A v1 test changes only when a chosen change makes it out of date.
    category: policy
    applies_to: v1 tests
    trigger: a change to a v1 test
    logic: Staff-page tests sign in through one shared helper, and each changed test is listed in code-summary.md
    violation: not allowed to merge
    source: FR8.4
  - id: BR4.1
    statement: Every dish has its allergens recorded and a mood.
    category: validation
    applies_to: seed details
    trigger: seeding
    logic: All 12 items are covered, with at least one item for each allergen and each mood
    violation: a server test fails
    source: FR3.3, FR12.1
  - id: BR4.2
    statement: Options never affect allergy marks, and appear only on dishes that already declare their allergens.
    category: constraint
    applies_to: seed details and allergy check
    trigger: seeding, and each safety check
    logic: isUnsafe reads the dish's allergens only. Extra cheese is seeded only on items marked dairy
    violation: a server test fails
    source: FR4.1
  - id: BR4.3
    statement: Selected dishes offer a pick-one group with a default and a pick-any group of extras.
    category: validation
    applies_to: seed details
    trigger: seeding
    logic: Spice defaults to Medium, size defaults to Regular, extras default to none, and all price changes are whole cents of zero or more
    violation: a server test fails
    source: FR4.1, NFR8
  - id: BR5.1
    statement: Cart lines are identified by dish and sorted option ids, and v1 carts load with defaults.
    category: calculation
    applies_to: cart store
    trigger: adding a dish or loading a saved cart
    logic: lineKey is the item id plus sorted option ids. A saved line with no options gets the item's defaults
    violation: none
    source: FR4.5, FR4.7
  - id: BR6.1
    statement: The design system is the single source of the look, on diner and new screens only.
    category: constraint
    applies_to: Menu, Cart, My orders, PIN screen
    trigger: styling
    logic: Those screens use only design tokens. The kitchen board and table bill keep v1's look
    violation: the mockup match fails
    source: FR7.1, FR7.2, FR7.3
  - id: BR6.2
    statement: The restyle keeps every v1 usability promise.
    category: constraint
    applies_to: restyled screens
    trigger: use
    logic: 3-tab bottom bar, sticky category pills, real 44 px touch areas, keyboard access, states in words, and no motion under reduced motion
    violation: a browser test fails
    source: FR7.5, NFR6, NFR7
  - id: BR6.3
    statement: Every changed screen has its mockup-match spec and its mockup is linked.
    category: policy
    applies_to: Menu, Cart, My orders, PIN screen
    trigger: Build
    logic: A spec per mockup, saving the screenshots side by side
    violation: the Unit isn't signed off
    source: FR7.4, NFR3
  - id: BR7.1
    statement: Failed requests are logged on the server and shown in plain words.
    category: policy
    applies_to: new routes and the PIN screen
    trigger: a failure
    logic: The server logs it, and the screen shows a plain message
    violation: none
    source: NFR11
```

## Rules Summary

| Group | Covers |
|---|---|
| BR1 | Staff PIN, sessions and lockout |
| BR2 | Open diner access and the live split |
| BR3 | Safe upgrade and v1 protection |
| BR4 | Allergens, options and moods |
| BR5 | Cart lines |
| BR6 | Design system and restyle |
| BR7 | Errors |

## Assumptions & Open Questions

- The moods are Light, Hearty and Sweet. "Surprise me" is not stored: it means any dish, and U7 applies it.
- The lockout counts by network address as the server sees it, with no proxy involved, since the app runs locally.
