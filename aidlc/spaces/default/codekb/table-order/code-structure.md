# Code Structure

## Repository Layout

Project-owned content only:

```text
table-order/
|-- .gitignore
`-- ideas/
    `-- table-order/
        |-- IDEA.md
        `-- QUESTIONS.md
```

The repo root also holds the AI-DLC install (`.claude/`, `aidlc/`), which is not the project's code and is not documented here.

## File Classification

| File | Category | Lines | Purpose |
|---|---|---|---|
| `ideas/table-order/IDEA.md` | Documentation (product brief) | 47 | What to build, open questions, out of scope, stack, design requirements |
| `ideas/table-order/QUESTIONS.md` | Documentation (question script) | 420 | Fixed questions and expected replies for each workflow stage |
| `.gitignore` | Configuration | 39 | AI-DLC's marked block (lines 1-27) and the project's own rules (lines 29-39) |

There are no files in the Model, Controller, Service, Repository, Utility, Middleware, Test, Migration or Static categories.

## Packages and Modules

None. No source folders, manifests or modules exist.

## Code Patterns

None can be observed, so a new app has no local convention to follow. The only conventions on record are documents:
- `ideas/<name>/` holds a brief and its question script.
- The project section of `.gitignore` expects generated files in `node_modules/`, `dist/`, `coverage/`, `test-results/` and `playwright-report/`, SQLite files, and git worktrees in `.aidlc/worktrees/`. Its comment says they are never committed, "so parallel Bolts (git worktrees) start clean".

## Planned Structure

The brief prescribes no folder layout. Later stages decide it.
