# Multi-Select and Batch Actions

Add checkbox-based multi-select to the items-page dashboard pages (experiences,
projects, stacks) with batch actions in the page header.

## Motivation

The rename of `itemInfo`/`isItemSelected` → `openedItem`/`isItemOpen` freed the
"select" vocabulary for its intended use: batch selection for bulk operations.
This spec implements that feature.

## State

### Store additions (`ItemsUIState`)

```ts
selectedIds: Record<string, boolean> | null;
```

`null` means "no batch selection active" (identical to empty map semantics, but
saves a render for the common case).

### New actions (`ItemsUIStore`)

- `toggleSelect(id: string)` — flip one id in the map
- `selectAll(ids: string[])` — set all given ids to `true`
- `clearSelection()` — set `selectedIds` back to `null`

These are orthogonal to `openedItem`/`isItemOpen`/`openItem`/`closePanel`.
Checking an item does not open its panel; opening a panel does not check the
item.

## Component changes

### `ListItem` (`shared/ui/list-item.tsx`)

**New props:**

```ts
isBatchSelected?: boolean;
onToggleSelect?: () => void;
```

**Render:** A `Checkbox` at the start of the card header, before the drag
handle. When `onToggleSelect` is not provided, the checkbox is not rendered
(fallback for items-page footer and other non-batch contexts).

**Visibility:** `opacity-0 group-hover:opacity-100` when unchecked; always
`opacity-100` when checked. Clicking the checkbox calls `onToggleSelect` with
`event.stopPropagation()` so it does not trigger the card's `onSelect` (panel
open).

**Layout:** The card header grid already uses `grid-cols-[auto_1fr_auto]` when
`isSort` is true and `grid-cols-[1fr_auto]` when false. The checkbox slot is
added as a leading column, making it:

- No drag handle, no checkbox: `grid-cols-[1fr_auto]`
- Checkbox only: `grid-cols-[auto_1fr_auto]`
- Drag handle + checkbox: `grid-cols-[auto_auto_1fr_auto]`

This keeps the layout responsive without breaking existing columns.

### `StackItem` (`stacks/ui/stack-item.tsx`)

**New props:** none (the store is consumed directly via `useStackStore`).

**Render:** A `Checkbox` as an `absolute top-1 left-1 z-10` overlay on the
card, `opacity-0 group-hover:opacity-100` when unchecked, always visible when
checked. Click handler calls `toggleSelect(stack.id)` with
`event.stopPropagation()`.

### `HeaderActions` (`shared/ui/header-actions.tsx`)

**New prop:**

```ts
batch?: {
  selectedCount: number;
  totalCount: number;
  onDeleteSelected: () => void;
  onAddSelectedToPortfolio: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
};
```

**Render priority (highest wins):**

1. `isSort` → sort group (Save / Restore default / Cancel) — unchanged
2. `selectedCount > 0` → batch group:
   ```
   [Delete selected] [Add to portfolio] [Select all (N/M)] [✕]
   ```
3. default → Reorder / Add — unchanged

The batch group uses `Group` + `GroupSeparator` matching the sort group's
visual treatment.

## Page integration

### Experiences (`experiences-page.tsx`)

- Destructure `selectedIds`, `toggleSelect`, `selectAll`, `clearSelection`
- Compute `selectedCount = Object.values(selectedIds ?? {}).filter(Boolean).length`
- Pass `batch` and handle callbacks:
  - `onDeleteSelected`: iterate selectedIds, call `deleteMutation.mutate` per id
  - `onAddSelectedToPortfolio`: iterate selectedIds, call
    `togglePortfolioMutation.mutate` for items not yet in portfolio
  - `onSelectAll`: `selectAll(allIds)`
  - `onClearSelection`: `clearSelection()`
- Pass `isBatchSelected` and `onToggleSelect` to each `ListItem`
- When list becomes empty after delete, clear selection via existing `useEffect`
  (which already checks `visibleExperiences.length === 0`)

### Projects (`project-page.tsx`)

Same pattern as experiences.

### Stacks (`stacks-page.tsx`)

Same pattern but uses `StackItem` (checkbox overlay) instead of `ListItem`.

### Resumes page

Not in scope. Resumes has a different structure (generate + download) and was
not requested.

## Batch action semantics

### Delete selected

1. Show a confirmation dialog: `"Delete N items?"` with standard destructive
   Cancel/Delete buttons (reuses the Dialog pattern from `ListItem`).
2. On confirm, calls the entity's delete mutation for each selected item.
   Mutations run concurrently via `Promise.allSettled`.
3. During mutation, the batch button group enters a loading state (all buttons
   disabled, visual spinner on the active action).
4. On success: invalidate entity list query + portfolio list query.
5. On partial failure: toast "Deleted N items, M failed." — does NOT clear
   selection for failed items so the user can retry.
6. On full success: toast "Deleted N items." — clears selection.

### Add to portfolio

1. No confirmation dialog (non-destructive, reversible).
2. Calls `portfolio.toggle({ type, entityId, included: true })` for each
   selected item that does not already have a `portfolioEntryId`. Items already
   in portfolio are skipped.
3. During mutation, buttons are disabled.
4. On settle: invalidate entity list query + portfolio list query.
5. Toast "Added N items to portfolio." Clears selection.
6. On error: toast "Failed to add to portfolio."

### Select all

Sets `selectedIds` to a map of all visible item ids → `true`. Shows
"Select all (N)" where N is the count of visible items. When all items are
already selected, the button reads "Deselect all" and calls `clearSelection`;
the ✕ button is hidden in this state since both actions are redundant.

### Clear selection

Sets `selectedIds` to `null`. Does not affect the open panel.

## Edge cases

| Edge case                     | Behavior                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| Panel open + batch select     | Orthogonal — no interference                                                                |
| Arrow key navigation          | Still cycles the panel item while batch items are selected                                  |
| Empty list after batch delete | Existing `useEffect` clears `openedItem` + `selectedIds`                                    |
| Mixed portfolio states        | "Add to portfolio" only adds items not already in portfolio                                 |
| Sort mode + batch select      | Sort mode renders its own group (higher priority)                                           |
| Tab/filter changes            | Selection is cleared — the visible items change, so previously selected ids no longer apply |
| External data invalidation    | Selection is preserved until the user explicitly clears or the list empties                 |
