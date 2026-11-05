# Units Generation: Questions

## Plan

Units are split by feature around a walking skeleton, and one app is started by one command.

| Unit | Directory | Kind | Carries |
|---|---|---|---|
| U1 | `u1-walking-skeleton` | service | Platform, LiveUpdates, Menu, Tables, Ordering, and the app shell with its navigation |
| U2 | `u2-diner-screens` | ui | DinerApp: the Menu, Cart and My orders screens |
| U3 | `u3-kitchen-board` | ui | StaffApp's Kitchen Board and Menu availability panel |
| U4 | `u4-bill-and-close` | service | Billing, and StaffApp's Table Bill screen |

U1 carries everything the other Units share. U2, U3 and U4 use only U1's code. U4 also lists U2 and U3 as build-order edges, which the team chose.

## Q1. [Architect] Do you approve this decomposition plan?

A. Approve Plan
B. Revise Plan
X. Other (please specify)

[Answer]: A
