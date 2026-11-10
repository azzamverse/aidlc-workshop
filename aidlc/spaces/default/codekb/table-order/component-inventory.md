# Component Inventory

## Server

### Server Bootstrap
`server/index.js`. Reads settings, refuses to start without a built client, starts the live service, listens, shuts down on SIGINT and SIGTERM. Depends on HTTP App, Composition Root, Platform.

### Composition Root
`server/context.js`. Opens the database, builds every repo and service, and exposes `shared` (contract C4). A new server module is wired in here.

### HTTP App
`server/app.js`. All REST routes, the event stream route, screen routes, the test-only route, the error handler, `SCREEN_ROUTES`. Any route-level PIN check goes here.

### Platform
`server/platform/`. `db.js` (schema, seed, open), `seed-data.js`, `transaction.js`, `settings.js`, `errors.js`, `logger.js`.

### Menu Module
`server/menu/`. Reads the menu, sets the sold-out mark, publishes `menu.item-updated`. Repo `toItem` is the shape pinned by `tests/server/repos.test.js:46`; the service layer is not pinned that tightly.

### Tables Module
`server/tables/`. Table lookup and id parsing, starting a visit, board read, current orders, archiving a visit.

### Ordering Module
`server/ordering/`. Validates and places orders, applies status changes and cancels, publishes `order.placed` and `order.updated`. Repo `toOrder` builds the API's Order. Depends on the Menu repo, Tables repo and service, and the live service's `publishEvent`.

### Billing Module
`server/billing/service.js`. Calculates a bill, closes a table, publishes `table.closed`. Uses only `shared` and `requireTable`.

### Live Module
`server/live/`. Stores and broadcasts events, handles replay and `resync`, sends keep-alives, prunes hourly.

## Client

### Client Router
`client/src/main.jsx`, `client/src/App.jsx`. The route table and React root.

### Diner Frame
`client/src/shell/DinerFrame.jsx`. Finds the table, starts its visit, shows the bottom tab bar and cart badge, provides `{ table, reloadTable }` through outlet context. Holds no live stream.

### Staff Frame
`client/src/shell/StaffFrame.jsx`. Page width for staff screens; `StaffBar` and `LiveIndicator`. Wraps both staff routes, so it is the natural client gate for a PIN.

### Diner Screens
`client/src/screens/diner/{MenuScreen,CartScreen,MyOrdersScreen,parts}.jsx`. MenuScreen holds category pills, item cards, View cart. CartScreen holds lines and placing. MyOrdersScreen holds order cards, status chips and cancelling.

### Diner Session
`client/src/screens/diner/useDinerSession.js`, `sessionLogic.js`. Everything the three screens share: live stream per screen, visit check, reset on close, next-visit start.

### Cart Store
`client/src/screens/diner/cartStore.js`, `client/src/shared/cartCount.js`. One device cart per table, in `localStorage` key `table-order.cart.<tableId>`. Validates saved data and manages the placement key.

### Kitchen Board
`client/src/screens/kitchen/KitchenBoardScreen.jsx`, `boardLogic.js`. Table cards, order cards, moves, reconnect notices. Owns the stream it shares with the panel.

### Availability Panel
`client/src/screens/kitchen/AvailabilityPanel.jsx`. Sold-out switches in a side panel.

### Table Bill
`client/src/screens/bill/TableBillScreen.jsx`. Bill display, its own table stream, Close table.

### API Client
`client/src/shared/api.js`. One `request` function with a 5-second timeout, error mapping to `ApiError`, one function per route. Only `placeOrder` retries. A shared header or credential option would be added here.

### Live Hook
`client/src/shared/live.js`. `useLiveEvents`, wrapping `EventSource`; holds the `EVENT_TYPES` allowlist.

### Shared Styles
`client/src/shared/styles.css`. Design tokens on `:root` and every class. The reduced-motion rule is here. Copied from v1's refined mockups.

### Money Helper
`client/src/shared/money.js`. Integer cents to `$d.cc`.

## Tests

### Server Unit Tests
`tests/server/`. Service, repo, API, live and platform tests on temporary databases.

### Client Unit Tests
`tests/client/`. Cart store, session logic and board logic with no browser.

### Browser Tests
`e2e/`. Per-Unit flows and mockup match, keyboard journey, timing helpers.
