# Refined Mockups: Table Order

High-fidelity, standalone HTML mockups built from `stories.md` and `requirements.md`. Open `html/index.html` in a browser; no server is needed. No rough mockups exist for this plan, so these come straight from the stories and requirements.

## Screens

| Screen | File | Route in the app | Stories | Requirements |
|---|---|---|---|---|
| Menu | `html/menu.html` | `/table/:id` | US1.1, US1.2, US5.2 | FR1.1, FR1.2, FR1.3, FR12.2 |
| Cart | `html/cart.html` | `/table/:id/cart` | US1.3, US1.4, US1.5, US1.6 | FR2.1 to FR2.5, FR3.1, FR3.3 |
| My Orders | `html/my-orders.html` | `/table/:id/orders` | US2.1, US2.2 | FR4.1 to FR4.3, FR5.1 to FR5.3 |
| Kitchen Board | `html/kitchen-board.html`, with the panel at `#availability` | `/staff` | US3.1, US3.2, US3.3 | FR6.1 to FR6.4, FR7.1, FR8.1, FR11.1 |
| Table Bill | `html/table-bill.html` | `/staff/tables/:id` | US4.1, US4.2 | FR9.1 to FR9.6, FR10.1 to FR10.3 |
| Screen states | `html/states.html` | Shown within the screens above | US1.1, US1.3, US1.5, US1.6, US2.1, US2.2, US3.1, US4.1, US4.2, US4.3, US5.2 | FR1.4, FR2.5, FR3.3, FR3.5, FR4.3, FR4.4, FR5.2, FR6.5, FR9.6, FR10.7, FR12.1 |

## Decisions

- **Look and feel (Q1):** warm and calm: off-white background, dark text, one terracotta accent, rounded cards with soft shadows, and large touch targets.
- **Status:** amber Pending, blue Preparing, green Completed and grey Cancelled, always with a word and an icon.
- **Currency (Q2):** US dollars, for example `$4.50`.
- **Sold-out marking (Q3):** a "Menu availability" panel on the Kitchen Board, opened from a button in its header, with a Sold out switch for each of the 12 items.

## Team Screen Design Rules Applied

- Menu, Cart and My orders are tabs in a bar fixed at the bottom. The current tab is highlighted and the Cart tab shows its item count.
- "View cart" and "Place order" sit just above the tab bar.
- Each menu card has its image on the left, then name, description and price. A "+ Add" pill sits at the far right of the price row, about 32 px tall with a 44 px touch area.
- Category pills sit in a bar that stays at the top. A pill scrolls smoothly to its category, and the pill of the category on screen is filled in.
- Sticky bars are frosted, and hover, press and live changes have gentle transitions. All motion stops under reduced motion.

## Example Data

The Menu mockup shows the seed menu: 12 items in 4 categories, with Ice Cream shown as sold out. The sample orders add up: Table 5's bill is $10.50 + $16.00 + $17.50 = $44.00, and cancelled order #10 is left off. Both Pending orders on the board (#14 and #15) are highlighted, following FR6.2.

## Assumptions & Open Questions

- Item images are emoji tiles.
- The bill is its own page at `/staff/tables/:id`.
- The mockups' seed menu becomes the app's seed data.
- Order numbers are shown as "#15".
- Icons always sit next to words.
