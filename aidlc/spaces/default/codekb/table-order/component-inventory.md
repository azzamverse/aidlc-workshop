# Component Inventory

No software component exists. The inventory below lists the three project artifacts that do exist.

## Existing Components

### Product Brief

- **Location**: `ideas/table-order/IDEA.md`
- **Responsibility**: states the intent, the three features, the five open questions, the out-of-scope list, the stack, the seed data and the design requirements.
- **Depends on**: nothing.
- **Used by**: Question Script; every later workflow stage.

### Question Script

- **Location**: `ideas/table-order/QUESTIONS.md`
- **Responsibility**: fixes the questions, options, recommended choices and expected replies for each workflow stage, so every workshop team gets the same run.
- **Depends on**: Product Brief, and the outputs of earlier stages that it refers to.
- **Used by**: the workflow stages that ask questions.

### Repository Ignore Rules

- **Location**: `.gitignore`
- **Responsibility**: keeps AI-DLC's local working files (marked block, lines 1-27) and the app's generated files (lines 29-39) out of version control.
- **Depends on**: nothing.
- **Used by**: git.

## Planned Components (Not Built)

The brief names five screens: Menu, Cart, My Orders, Kitchen Board and Table Bill. The server-side split is undecided; `QUESTIONS.md` line 283 recommends eight components at Domain Design (Menu, Tables, Ordering, Billing, LiveUpdates, DinerApp, StaffApp, Platform). These are proposals, so they are not listed as analyzed components.
