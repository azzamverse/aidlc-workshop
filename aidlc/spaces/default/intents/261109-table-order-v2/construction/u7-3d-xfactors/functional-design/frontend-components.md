# Frontend Components: U7 3D X-factors

Slots come from contract C14 in `contract-summary.md`, with props `{ table, orders, onAddToCart }`. Screens follow mockups `living-table.html`, `kitchen-theatre.html`, `bottle.html` and `dice.html`.

| Component | Slot | Holds | Does |
|---|---|---|---|
| LivingTable | `LivingTable.jsx` | rotation | Plates, states, drag and arrow keys |
| KitchenTheatre | `KitchenTheatre.jsx` | none | Tickets on a rail |
| SpinTheBottle | `SpinTheBottle.jsx` | seats, question, current spin | Spin form, shared result |
| ChefsDice | `ChefsDice.jsx` | mood, suggestion | Roll, Add to cart, Roll again |
| SceneFallback | used by all four | none | The same information as text and controls |

## Interaction Notes

- Every control has a 44 px touch area and works by keyboard. Canvas scenes keep a text summary for screen readers.
- A scene releases its 3D resources when it closes.
- Motion stops under reduced motion, and results show at once.
