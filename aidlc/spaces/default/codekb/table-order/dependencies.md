# Dependencies

## External Dependencies

None declared. The repo has no `package.json`, lockfile or other manifest, so there are no versions to compare and no advisories to check. The packages the app is expected to need are listed in [technology-stack.md](technology-stack.md).

## Internal Dependencies

No code imports exist. The documents depend on each other as follows:

| From | To | Nature |
|---|---|---|
| `ideas/table-order/QUESTIONS.md` | `ideas/table-order/IDEA.md` | Refers to "the brief", and turns its five open questions into Requirements Analysis Q1 to Q5 |
| `ideas/table-order/QUESTIONS.md` | Outputs of earlier and later stages | Refers to artifacts this run has not produced yet, such as `requirements.md` and `bolt-plan.md` |
| `.gitignore` project section | The future app | Anticipates its generated files |

## Services and Data Stores

None. The brief expects a local SQLite database file, and `.gitignore` already ignores `*.sqlite`, `*.sqlite-*` and `*.db`.

## Circular References

None.
