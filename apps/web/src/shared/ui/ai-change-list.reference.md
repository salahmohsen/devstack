# AI change list — BranchDiff reference

Neon’s `BranchDiff` was downloaded for study (not installed as a dependency):

```bash
# Local reference (ephemeral)
/tmp/neon-branch-diff/branch-diff.tsx
/tmp/neon-branch-diff/use-branch-diff.ts
# Registry source
https://ui.neon.com/r/branch-diff.json
https://ui.neon.com/database/branch-diff
```

## Why not install `@neon-ui/branch-diff`

- Domain is Neon **schema + row** diffs (DDL, primary keys, load-more tables).
- Pulls Neon tokens, Hugeicons, and Neon tabs.
- Our AI reviews are catalog actions (merge/rename/enrich, resume import, apply package).

## Borrowed UX (implemented in `ai-change-list.tsx`)

| BranchDiff                             | Our abstraction                                 |
| -------------------------------------- | ----------------------------------------------- |
| Header from → to + counts              | `fromLabel` / `toLabel` + `AiChangeCount`       |
| Kind filter all/added/modified/removed | Same three kinds (map domain actions onto them) |
| Search                                 | Shared search field                             |
| Expandable row + before/after          | `AiChangeItem` + `AiChangeBeforeAfter`          |
| Kind via symbol + label                | `DEFAULT_AI_CHANGE_KINDS`                       |

## Mapping domain actions → kinds

| Domain                             | Kind       |
| ---------------------------------- | ---------- |
| Merge / delete / exclude           | `removed`  |
| Rename / type / description change | `modified` |
| Enrich / create / include          | `added`    |

Use `AiChangeList` for any new AI review surface so diffs stay consistent across the app.
