# Design System Mapping: Table Order

There is no existing design system, so this defines a small new one. The tokens live in `html/styles.css` and the built app reuses them. It supports the screens in `stories.md` and `requirements.md`.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#fbf7f2` | Page background |
| `--surface` | `#ffffff` | Cards and bars |
| `--text` | `#2b2622` | Main text |
| `--muted` | `#6b625a` | Secondary text |
| `--line` | `#e8e0d6` | Borders |
| `--accent` | `#b4492a` | Main actions |
| `--accent-dark` | `#93381e` | Hover, focus, current tab |
| `--accent-soft` | `#f8e6df` | Image tiles, current tab background |
| `--pending` on `--pending-bg` | `#7a4b00` on `#fff1d6` | Pending |
| `--preparing` on `--preparing-bg` | `#174a80` on `#e1eefb` | Preparing |
| `--completed` on `--completed-bg` | `#1c5e33` on `#dff3e4` | Completed |
| `--cancelled` on `--cancelled-bg` | `#524c46` on `#ece9e5` | Cancelled |
| `--danger` on `--danger-bg` | `#a12318` on `#fdecea` | Errors |
| `--radius` | `16px` | Cards |
| `--shadow` | `0 2px 10px rgba(60, 40, 20, .08)` | Cards |
| `--ease` | `180ms ease-out` | Transitions |

## Spacing and Type

- Spacing uses 4, 8, 12, 14, 16 and 24 px.
- Type is the system font. Body text is 16 px and secondary text is 14 px. Prices use tabular figures so they line up.

## Component Mapping

| Component | CSS class in the mockups | Screens |
|---|---|---|
| BottomTabs | `.tabs`, `.tab`, `.badge` | Menu, Cart, My Orders |
| Category bar | `.pills`, `.pill` | Menu |
| MenuItemCard | `.item`, `.tile`, `.add`, `.soldout-tag` | Menu |
| Cart summary | `.summary` | Menu, Cart |
| Cart line | `.line`, `.stepper` | Cart |
| StatusChip | `.status` | My Orders, Kitchen Board, Table Bill |
| Table card | `.table-card` | Kitchen Board |
| OrderCard | `.order`, `.order.new` | Kitchen Board |
| AvailabilityPanel | `.panel`, `.switch-row` | Kitchen Board |
| Bill table | `.bill table` | Table Bill |
| Notice | `.notice` | All |
| Buttons | `.btn`, `.btn.secondary`, `.btn.small` | All |

## Assumptions & Open Questions

None.
