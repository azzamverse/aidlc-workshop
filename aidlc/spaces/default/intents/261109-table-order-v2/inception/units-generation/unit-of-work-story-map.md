# Story Map: Table Order v2

Maps `stories.md` to the Units in `unit-of-work.md`, from `components.md`, `decisions.md` and `requirements.md`.

| Story | Unit ID | Directory |
|---|---|---|
| US1.1 | U6 | u6-diner-staff-features |
| US1.2 | U6 | u6-diner-staff-features |
| US1.3 | U6 | u6-diner-staff-features |
| US2.1 | U5 | u5-foundation |
| US2.2 | U5 | u5-foundation |
| US3.1 | U6 | u6-diner-staff-features |
| US3.2 | U5; U6 | u5-foundation; u6-diner-staff-features |
| US3.3 | U6 | u6-diner-staff-features |
| US4.1 | U5; U6 | u5-foundation; u6-diner-staff-features |
| US4.2 | U6 | u6-diner-staff-features |
| US4.3 | U6 | u6-diner-staff-features |
| US5.1 | U6 | u6-diner-staff-features |
| US5.2 | U6 | u6-diner-staff-features |
| US6.1 | U6 | u6-diner-staff-features |
| US6.2 | U6 | u6-diner-staff-features |
| US7.1 | U5 | u5-foundation |
| US8.1 | U5 | u5-foundation |
| US9.1 | U7 | u7-3d-xfactors |
| US10.1 | U7 | u7-3d-xfactors |
| US11.1 | U7 | u7-3d-xfactors |
| US12.1 | U5; U7 | u5-foundation; u7-3d-xfactors |

## Cross-Cutting Rows

US3.2, US4.1 and US12.1 span two Units: U5 supplies the seed data, and U6 or U7 builds the behaviour.

## Implementation Order Within Each Unit

- **U5:** US8.1, US2.2, US2.1, US3.2 and US4.1 data, US12.1 data, US7.1.
- **U6:** US4.1, US4.2, US4.3, US3.1, US3.2, US3.3, US6.2, US6.1, US1.1, US1.2, US1.3, US5.1, US5.2.
- **U7:** US9.1, US10.1, US11.1, US12.1.

## Coverage Verification

All 21 stories are assigned, and every Unit has rows.
