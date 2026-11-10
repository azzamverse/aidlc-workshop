# Design System: Midnight Supper Club

The single source is `html/styles.css`, built for the stories in `stories.md` and FR7 in `requirements.md`.

| Token group | Values |
|---|---|
| Colours | Night `#17101f`, aubergine `#2a1a38`, plum `#3d2750`, velvet `#5a3a72`, brass `#e8b75a`, soft brass `#f6d999`, cream `#fbf1df`, muted `#c4b4d2`, ember `#ff7a4d`, sage `#8fd9a8`, danger `#ff9a8a` |
| Type | Serif headings at 28, 20 and 18 px; sans body at 16 and 14 px; prices in tabular figures |
| Spacing | 4, 8, 12, 16, 24 and 32 px |
| Radius | 20 px cards, full-round pills |
| Shadows | Lift for raised surfaces, brass glow for active ones |

| Component | Class | Used on |
|---|---|---|
| Raised card with tilt | `.card` | All diner screens |
| 3D plate | `.plate` | Menu, Cart, Chef's Dice |
| Brass button, ghost button | `.btn`, `.btn.ghost` | All diner screens |
| "+ Add" pill | `.add` | Menu |
| Category and switcher pills | `.pill` | Menu, My orders, X-factors |
| Allergy and status tags | `.tag` | Menu |
| Warning box | `.warnbox` | Cart |
| Banner | `.banner` | My orders, kitchen board |
| Tracker | `.track`, `.seg` | My orders |
| Bottom tabs | `.tabs`, `.tab` | All diner screens |

The kitchen board and table bill keep v1's styles and take only the new elements.

## Assumptions & Open Questions

None.
