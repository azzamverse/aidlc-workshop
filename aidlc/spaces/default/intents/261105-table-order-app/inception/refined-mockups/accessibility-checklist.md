# Accessibility Checklist: Table Order

Target: WCAG 2.1 AA and full keyboard use, from NFR6 and NFR7 in `requirements.md` and US5.3 in `stories.md`. "Designed" means the mockups do this; the browser tests check it in the built app, including the keyboard-only journey at Build and Test.

| Check | Status in the mockups | Where |
|---|---|---|
| Text contrast is at least 4.5:1 | Measured from the tokens: lowest is 5.35:1 (white on the accent), and muted text is 5.59:1 | Tokens in `design-system-mapping.md` |
| Status never relies on color alone | Designed | StatusChip has a word and an icon |
| Every action works by keyboard | Designed with native links and buttons | All screens |
| Focus is visible | Designed, with a 3 px outline | `:focus-visible` in `styles.css` |
| Touch targets are at least 44 px | Designed, including the "+ Add" touch area | Menu, Cart, Board |
| Icons are hidden from screen readers | Designed | `aria-hidden` on icons |
| Live changes are announced | Designed | `role="status"` and `role="alert"` on notices |
| Page language is declared | Designed | `lang="en"` |
| Headings are in order | Designed | All screens |
| Bill data is in real tables | Designed | Table Bill |
| Motion stops under reduced motion | Designed | `prefers-reduced-motion` in `styles.css` |
| Works at 360 px and 1024 px | Designed; checked in the mockup-match tests | NFR4 |

## Assumptions & Open Questions

None.
