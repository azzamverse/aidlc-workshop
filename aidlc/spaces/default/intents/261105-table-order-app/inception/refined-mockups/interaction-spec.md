# Interaction Specification: Table Order

Traces to `stories.md` and `requirements.md`. Mockups are in `mockups.md`.

## Screen States

| Screen | Loading | Empty | Error | Success |
|---|---|---|---|---|
| Menu | Skeleton cards | Not applicable: the seed always has items | "We couldn't load the menu." with Try again | Items by category |
| Cart | Not applicable: held on the device | "Your cart is empty" with Browse the menu | "We couldn't place your order. Your cart is safe." | Lines, total, Place order |
| My Orders | Skeleton cards | "No orders yet" with Browse the menu | "Reconnecting…" while live updates are down | Orders with status |
| Kitchen Board | Skeleton cards | Each table shows "No orders" | "Reconnecting…" | Table cards with orders |
| Table Bill | Skeleton cards | "No orders for this table", total $0.00 | Error message with Try again | Orders, subtotals, total |

## Interactions

| Action | Screen | Result | Live effect |
|---|---|---|---|
| "+ Add" | Menu | The item joins the cart, and the Cart badge and "View cart" update | None |
| Stepper | Cart | Quantity changes between 1 and 20; each limit disables its button | None |
| Remove | Cart | The line leaves and the total updates | None |
| Place order | Cart | Goes to My Orders with "Order #15 placed" and an empty cart | New order on the board within 2 seconds, with ★ New |
| Place order with a sold-out item | Cart | Message names the item, which leaves the cart; no order is created | None |
| Cancel order (Pending only) | My Orders | Status becomes Cancelled | Board updates within 2 seconds |
| Start preparing, Mark completed | Kitchen Board | Status moves one step; ★ New clears on leaving Pending | Diner's view updates within 2 seconds |
| Status change refused because the diner just cancelled | Kitchen Board | Notice: "Order #15 was just cancelled by the diner, so it can't be moved on." | Every screen shows Cancelled |
| Sold out switch | Kitchen Board panel | The mark is saved | Open menus update within 2 seconds |
| Close table | Table Bill | "Table 5 closed." then back to the board with the table empty | Open diner screens reset and show "This table was closed" within 2 seconds |

"Close table" is disabled while any order is open and when the table has no orders. No confirmation dialog is shown, because a table can only be closed when every order is finished.

## Components

### BottomTabs

| Field | Value |
|---|---|
| Component | BottomTabs |
| Description | Fixed bar with Menu, Cart and My orders |
| Category | navigation |

| State | Description | Trigger |
|---|---|---|
| default | Three tabs, with the current one highlighted | page load |
| focus | Visible outline | Tab key |

| Requirement | Implementation |
|---|---|
| ARIA role | `nav` with links, and `aria-current="page"` on the current tab |
| Keyboard interaction | Tab to focus, Enter to follow |
| Label | Visible words beside icons; the badge is labelled "3 items" |
| Contrast ratio | WCAG AA |
| Touch target | 72 px tall |

### MenuItemCard

| Field | Value |
|---|---|
| Component | MenuItemCard |
| Description | Image, name, description, price and "+ Add" |
| Category | display |

| State | Description | Trigger |
|---|---|---|
| default | "+ Add" available | item available |
| sold out | "Sold out" tag replaces "+ Add"; image greyed | staff mark |
| hover, press | Pill darkens and presses in | pointer |

| Requirement | Implementation |
|---|---|
| ARIA role | `article` with a `button` |
| Label | "Add <item name>" |
| Touch target | About 32 px visible, 44 px touch area |

### StatusChip

| Field | Value |
|---|---|
| Component | StatusChip |
| Description | Order status as word, icon and color |
| Category | display |

| State | Description | Trigger |
|---|---|---|
| Pending, Preparing, Completed, Cancelled | Amber, blue, green or grey, with its own icon | order status |

| Requirement | Implementation |
|---|---|
| Screen reader | The word is read; the icon is hidden; changes are announced politely |
| Color | Never the only signal |

### OrderCard

| Field | Value |
|---|---|
| Component | OrderCard |
| Description | Order number, items and status on the board |
| Category | display |

| State | Description | Trigger |
|---|---|---|
| new | Amber outline and "★ New" | Pending |
| preparing | Offers "Mark completed" | Preparing |
| finished | No action | Completed or Cancelled |

### AvailabilityPanel

| Field | Value |
|---|---|
| Component | AvailabilityPanel |
| Description | Side panel listing 12 items with a Sold out switch each |
| Category | input |

| Requirement | Implementation |
|---|---|
| Keyboard interaction | Space toggles a switch; Escape or Close dismisses |
| Focus management | Focus moves into the panel and returns to its button on close |

### Notice

| Field | Value |
|---|---|
| Component | Notice |
| Description | Inline message for sold out, errors, reconnecting and success |
| Category | feedback |

| Requirement | Implementation |
|---|---|
| ARIA role | `alert` for problems, `status` for updates |
| Color | Always with an icon and words |

## Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| Diner, 360 px and up | One column, up to 480 px wide and centred |
| Staff, 1024 px | Board with 3 columns; bill centred up to 760 px |
| Staff, above 1100 px | Board with 4 columns |

## Motion

Transitions are 180 ms with ease-out. Smooth scrolling and all transitions stop under `prefers-reduced-motion`.

## Assumptions & Open Questions

None.
