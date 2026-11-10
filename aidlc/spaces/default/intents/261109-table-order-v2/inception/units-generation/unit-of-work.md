# Units of Work: Table Order v2

Groups the components in `components.md`, following `decisions.md`, to deliver `requirements.md` and `stories.md`. v1's Units U1 to U4 are done, and new Units start at U5. All Units ship in the one existing app (a shared deployment).

| Unit ID | Directory | Kind | Complexity | Deployment |
|---|---|---|---|---|
| U5 | `u5-foundation` | service | XL | shared |
| U6 | `u6-diner-staff-features` | service | L | shared |
| U7 | `u7-3d-xfactors` | service | L | shared |

## U5: Foundation

**Description:** v2's walking skeleton: everything the other Units share.

**Owns:** the add-only database upgrade; MenuDetails data with its backfill; StaffAccess, the PIN screen and server checks; the diner and staff live split, with the new event types accepted by the client; the diner's own-table read; DesignSystem; the restyled Menu, Cart and My orders; the My orders switcher and the Menu's Chef's Dice button, with empty slots that U7 fills; and the empty places on screens where U6's features mount.

**Delivers:** a working app in the new look, behind a working PIN, with all v1 tests passing or listed as changed.

**Notes:** v1 tests that open staff pages get a shared login helper here. U5 owns the test-only way to reset the PIN lockout, which never exists on a normal run.

## U6: Diner and Staff Features

**Description:** The features that change ordering and service.

**Owns:** Notifications; the Allergy shield screens and warnings; Make it yours, from options panel to server pricing and tickets; TableRequests with its buttons and Respond; WaitEstimate and the order tracker.

**Delivers:** FR1 and FR3 to FR6 working end to end.

**Notes:** uses only v1 and U5.

## U7: 3D X-factors

**Description:** The four 3D experiences.

**Owns:** ThreeDScenes with three.js; The Living Table; Kitchen Theatre; BottleSpin with its server rules and scene; Chef's Dice; and each scene's text version.

**Delivers:** FR9 to FR12 working end to end.

**Notes:** uses only v1 and U5. The scenes read order status from what My orders already holds.

## Assumptions & Open Questions

- U6 and U7 are tagged `service`, because each adds server code as well as screens.
