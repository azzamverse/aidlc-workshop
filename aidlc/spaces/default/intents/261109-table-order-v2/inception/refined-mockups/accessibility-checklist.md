# Accessibility Checklist: Table Order v2

Target: WCAG 2.1 AA, for the screens in `stories.md` and NFR6, NFR7 and NFR12 in `requirements.md`. These are design commitments, and the browser tests confirm them in Build and Test.

| Check | How it is met |
|---|---|
| Keyboard | Every control is a real button or link; the table spins with arrow keys; dice roll with Enter |
| Touch areas | 44 px for all new controls; "+ Add" looks 32 px with a 44 px touch area |
| Not colour alone | "Contains gluten", order status words and "Waiter called" are all in words |
| Contrast | Cream and brass text on dark backgrounds to meet 4.5:1 |
| Focus | A visible 3 px soft-brass ring |
| Reduced motion | Tilt, pulse, banners, spins and rolls stop; results show at once |
| 3D alternative | Each scene has a text version with the same information |
| Announcements | Banners and spin results are announced to screen readers |

## Assumptions & Open Questions

- Contrast values are design targets until they are measured in the built app.
