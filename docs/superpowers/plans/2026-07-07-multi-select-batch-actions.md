# Multi-Select and Batch Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add checkbox-based multi-select with batch delete/add-to-portfolio actions to experiences, projects, and stacks pages.

**Architecture:** Add `selectedIds` + `toggleSelect`/`selectAll`/`clearSelection` to the shared `createItemsUIStore`; add coss `Checkbox` + `onToggleSelect` to `ListItem` (list layout) and `StackItem` (grid overlay); add `batch` prop to `HeaderActions` that renders a coss `Group` + `GroupSeparator` button cluster when items are selected; wire each page to pass store state through.

**Tech Stack:** TanStack Start, coss Base UI Checkbox (at `@tsu-stack/ui/components/checkbox`), coss Group (at `@tsu-stack/ui/components/group`), coss AlertDialog for destructive confirmations (at `@tsu-stack/ui/components/alert-dialog`), raw `orpcClient` for batch API calls (at `@tsu-stack/api/client/tanstack-start/orpc`)

---

### Task 1: Add `selectedIds` to store types

**Files:**

- Modify: `apps/web/src/widgets/items-page/lib/items-ui.types.ts`

- [ ] **Step 1: Add `selectedIds` to `ItemsUIState`**

After `isItemOpen` line, add:

```ts
selectedIds: Record<string, boolean> | null;
```

- [ ] **Step 2: Add `toggleSelect`, `selectAll`, `clearSelection` to `ItemsUIStore`**

After `closePanel` line, add:

```ts
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
```

### Task 2: Implement store actions + clear selection on tab/filter change

**Files:**

- Modify: `apps/web/src/widgets/items-page/lib/create-items-ui-store.ts`

- [ ] **Step 1: Add `selectedIds: null` to initial state**

```ts
let state: ItemsUIState<T, Tab, Filter> = {
  activeTab: config.initialTab,
  filter: config.initialFilter,
  openedItem: null,
  isItemOpen: null,
  selectedIds: null
};
```

- [ ] **Step 2: Implement `toggleSelect`, `selectAll`, `clearSelection`**

Insert after `closePanel`:

```ts
const toggleSelect = (id: string) => {
  const current = state.selectedIds ?? {};
  setState({ selectedIds: { ...current, [id]: !current[id] } });
};

const selectAll = (ids: string[]) => {
  setState({ selectedIds: Object.fromEntries(ids.map((id) => [id, true])) });
};

const clearSelection = () => {
  setState({ selectedIds: null });
};
```

- [ ] **Step 3: Add action signatures to `useStore` return type**

Add `toggleSelect: typeof toggleSelect;` / `selectAll: typeof selectAll;` / `clearSelection: typeof clearSelection;` to the anonymous type.

- [ ] **Step 4: Add action refs to `useMemo` return**

Add `toggleSelect,` / `selectAll,` / `clearSelection,` to the returned object.

- [ ] **Step 5: Clear selection on tab/filter change**

In `setActiveTab`, clear `selectedIds`:

```ts
const setActiveTab = (tab: Tab) => {
  if (config.isValidTab && !config.isValidTab(tab)) return;
  setState({ activeTab: tab, selectedIds: null });
};
```

In `setFilter`, clear `selectedIds`:

```ts
const setFilter = (filter: Filter) => {
  setState({ filter, selectedIds: null });
};
```

In `setTabAndFilter`, clear `selectedIds`:

```ts
const setTabAndFilter = (tab: Tab) => {
  if (config.isValidTab && !config.isValidTab(tab)) return;
  const filter = config.tabToFilter ? config.tabToFilter(tab) : state.filter;
  setState({ activeTab: tab, filter, selectedIds: null });
};
```

### Task 3: Add Checkbox to ListItem

**Files:**

- Modify: `apps/web/src/shared/ui/list-item.tsx`

- [ ] **Step 1: Import coss Checkbox**

```ts
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
```

- [ ] **Step 2: Add `isBatchSelected?: boolean` and `onToggleSelect?: () => void` to `ListItemProps`**

```ts
  isBatchSelected?: boolean;
  onToggleSelect?: () => void;
```

- [ ] **Step 3: Destructure new props in function signature**

- [ ] **Step 4: Render coss Checkbox before drag handle**

Inside `CardHeader`, before the drag-handle block:

```tsx
{
  onToggleSelect ? (
    <div className="flex items-center self-center">
      <Checkbox
        checked={isBatchSelected ?? false}
        onCheckedChange={onToggleSelect}
        className={cn(
          "transition-opacity",
          isBatchSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      />
    </div>
  ) : null;
}
```

- [ ] **Step 5: Update grid column classes to accommodate checkbox**

Replace:

```ts
("grid-cols-[auto_1fr] items-center py-3",
  isSort ? "md:grid-cols-[auto_1fr_auto]" : "md:grid-cols-[1fr_auto]");
```

with:

```ts
("grid-cols-[auto_1fr] items-center py-3",
  isSort
    ? "md:grid-cols-[auto_auto_1fr_auto]"
    : onToggleSelect
      ? "md:grid-cols-[auto_1fr_auto]"
      : "md:grid-cols-[1fr_auto]");
```

### Task 4: Add batch group to HeaderActions

**Files:**

- Modify: `apps/web/src/shared/ui/header-actions.tsx`

- [ ] **Step 1: Add `Trash2Icon` and `BookmarkPlusIcon` to lucide-react imports**

```ts
import {
  ArrowUpDownIcon,
  BookmarkPlusIcon,
  CheckIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
  X
} from "lucide-react";
```

- [ ] **Step 2: Add `BatchConfig` type and `batch` prop to `HeaderActionProps`**

```ts
type BatchConfig = {
  selectedCount: number;
  totalCount: number;
  isBatchLoading: boolean;
  isDeleting?: boolean;
  isAddingToPortfolio?: boolean;
  onDeleteSelected: () => void;
  onAddSelectedToPortfolio: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
};
```

Add `batch?: BatchConfig;` to `HeaderActionProps`.

When `isDeleting` or `isAddingToPortfolio` is true, the corresponding button shows a coss `loading` spinner via the Button's built-in `loading` prop.

- [ ] **Step 3: Render batch group as the first priority check**

Update render logic so batch takes priority over default but sort still wins:

```tsx
{
  isSort ? (
    {/* existing sort group — unchanged */}
  ) : batch && batch.selectedCount > 0 ? (
    <Group>
      <Button
        onClick={batch.onDeleteSelected}
        disabled={batch.isBatchLoading}
        loading={batch.isDeleting}
        variant="destructive"
      >
        <Trash2Icon />
        Delete ({batch.selectedCount})
      </Button>
      <GroupSeparator />
      <Button
        onClick={batch.onAddSelectedToPortfolio}
        disabled={batch.isBatchLoading}
        loading={batch.isAddingToPortfolio}
        variant="secondary"
      >
        <BookmarkPlusIcon />
        Add to portfolio
      </Button>
      <GroupSeparator />
      {batch.selectedCount < batch.totalCount ? (
        <Button onClick={batch.onSelectAll} disabled={batch.isBatchLoading} variant="secondary">
          <CheckIcon />
          Select all ({batch.totalCount})
        </Button>
      ) : (
        <Button onClick={batch.onClearSelection} variant="secondary">
          <X />
          Deselect all
        </Button>
      )}
    </Group>
  ) : (
    {/* existing default: Reorder + Add — unchanged */}
  );
}
```

Note: When `selectedCount === totalCount`, show "Deselect all" instead of "Select all" and hide ✕ (both would do the same thing).

### Task 5: Add Checkbox overlay to StackItem

**Files:**

- Modify: `apps/web/src/pages/dashboard/stacks/ui/stack-item.tsx`

- [ ] **Step 1: Import coss Checkbox**

```ts
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
```

- [ ] **Step 2: Destructure `selectedIds` and `toggleSelect` from store**

```ts
const { openItem, isItemOpen, selectedIds, toggleSelect } = useStackStore();
```

`selected` is still derived from `isItemOpen` and used further down in JSX (`aria-pressed={selected}`, `data-selected={selected}`).

- [ ] **Step 3: Render Checkbox overlay inside Card before CardContent**

```tsx
<div
  className="absolute left-1 top-1 z-10"
  onClick={(e) => e.stopPropagation()}
  onKeyDown={(e) => e.stopPropagation()}
>
  <Checkbox
    checked={selectedIds?.[stack.id] ?? false}
    onCheckedChange={() => toggleSelect(stack.id)}
    className={cn(
      "transition-opacity",
      selectedIds?.[stack.id] ? "opacity-100" : "opacity-0 group-hover:opacity-100"
    )}
  />
</div>
```

### Task 6: Wire experiences page

**Files:**

- Modify: `apps/web/src/pages/dashboard/experiences/experiences-page.tsx`

- [ ] **Step 1: Add `orpcClient` to existing import from ORPC module**

```ts
import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
```

- [ ] **Step 2: Import coss AlertDialog for batch delete confirmation**

```ts
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
```

- [ ] **Step 3: Destructure new store values**

```ts
const {
  openedItem,
  isItemOpen,
  setOpenedItem,
  setIsItemOpen,
  openItem,
  selectedIds,
  toggleSelect,
  selectAll,
  clearSelection
} = useExperienceStore();
```

- [ ] **Step 4: Compute `selectedCount`, track batch action, compute loading flags**

```ts
const [batchAction, setBatchAction] = useState<"delete" | "portfolio" | null>(null);

const selectedIdsEntries = useMemo(
  () => Object.entries(selectedIds ?? {}).filter(([, v]) => v),
  [selectedIds]
);
const selectedCount = selectedIdsEntries.length;
const isBatchLoading = batchAction !== null;
const isDeleting = batchAction === "delete";
const isAddingToPortfolio = batchAction === "portfolio";
```

- [ ] **Step 5: Add batch delete confirmation with coss AlertDialog**

`handleBatchDelete` — calls `orpcClient.experiences.delete({ id })` for each selected item directly (bypasses TanStack Query mutation cache, which would deduplicate concurrent calls):

```ts
async function handleBatchDelete() {
  setBatchAction("delete");
  setBatchDeleteDialogOpen(false);
  const ids = selectedIdsEntries.map(([id]) => id);
  const results = await Promise.allSettled(ids.map((id) => orpcClient.experiences.delete({ id })));

  await queryClient.invalidateQueries({ queryKey: orpcQueryClient.experiences.list.queryKey() });
  await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryOptions().queryKey });

  setBatchAction(null);

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  if (failed === 0) {
    toast.success(`Deleted ${succeeded} experience(s).`);
    clearSelection();
  } else {
    toast.error(`Deleted ${succeeded}, ${failed} failed.`);
    // selection kept so user can retry on failed items
  }
}
```

- [ ] **Step 6: Add `handleBatchAddToPortfolio`**

```ts
async function handleBatchAddToPortfolio() {
  setBatchAction("portfolio");
  const items = visibleExperiences.filter((exp) => selectedIds?.[exp.id] && !exp.portfolioEntryId);

  if (items.length === 0) {
    toast("All selected items are already in portfolio.");
    setBatchAction(null);
    return;
  }

  const results = await Promise.allSettled(
    items.map((exp) =>
      orpcClient.portfolio.toggle({ type: "experience", entityId: exp.id, included: true })
    )
  );

  await queryClient.invalidateQueries({ queryKey: orpcQueryClient.experiences.list.queryKey() });
  await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryOptions().queryKey });

  setBatchAction(null);

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  if (failed === 0) {
    toast.success(`Added ${succeeded} experience(s) to portfolio.`);
    clearSelection();
  } else {
    toast.error(`Added ${succeeded} to portfolio, ${failed} failed.`);
  }
}
```

- [ ] **Step 7: Add batch delete AlertDialog in JSX**

Insert before the closing `</PageLayout>`:

```tsx
<AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
  <AlertDialogPopup>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete {selectedCount} experience(s)?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete the selected experiences and all their associated projects.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
      <AlertDialogClose
        render={<Button variant="destructive" disabled={isDeleting} />}
        onClick={handleBatchDelete}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </AlertDialogClose>
    </AlertDialogFooter>
  </AlertDialogPopup>
</AlertDialog>
```

Add state: `const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);`

Also import `Button` from `@tsu-stack/ui/components/button` if not already imported.

- [ ] **Step 8: Pass `batch` to `<HeaderActions>`**

```tsx
<HeaderActions
  add={{ onAdd: () => openDialog(null), label: "Add Experience" }}
  sort={{...}}
  batch={{
    selectedCount,
    totalCount: visibleExperiences.length,
    isBatchLoading,
    isDeleting,
    isAddingToPortfolio,
    onDeleteSelected: () => setBatchDeleteDialogOpen(true),
    onAddSelectedToPortfolio: handleBatchAddToPortfolio,
    onSelectAll: () => selectAll(visibleExperiences.map((e) => e.id)),
    onClearSelection: clearSelection
  }}
/>
```

- [ ] **Step 9: Pass `isBatchSelected` and `onToggleSelect` to each `<ListItem>`**

Add to the `<ListItem>` in the render loop:

```tsx
isBatchSelected={selectedIds?.[experience.id] ?? false}
onToggleSelect={() => toggleSelect(experience.id)}
```

- [ ] **Step 10: Update empty-list useEffect to also clear selectedIds**

```tsx
useEffect(() => {
  if (!experiencesQuery.isLoading && visibleExperiences.length === 0) {
    if (openedItem) {
      setOpenedItem(null);
      setIsItemOpen(null);
    }
    if (selectedIds) clearSelection();
  }
}, [
  experiencesQuery.isLoading,
  visibleExperiences.length,
  openedItem,
  setOpenedItem,
  setIsItemOpen,
  selectedIds,
  clearSelection
]);
```

### Task 7: Wire projects page

**Files:**

- Modify: `apps/web/src/pages/dashboard/projects/ui/project-page.tsx`

Same pattern as Task 6, with these differences:

- Store: `useProjectStore()`
- Entity client: `orpcClient.projects.delete`
- Toggle type: `"project"`
- List data: `projects`
- Dialog description: "This will permanently delete the selected projects and all their associated data."
- Entity field for portfolio check: `project.portfolioEntryId` (same field name as experiences)

- [ ] **Step 1: Add `orpcClient` to import** (`import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc"`)
- [ ] **Step 2: Import coss `AlertDialog` + sub-components and `Button`** (same imports as Task 6)
- [ ] **Step 3: Destructure new store values**
- [ ] **Step 4: Compute `selectedCount` and `isBatchLoading` with `useMemo`**
- [ ] **Step 5: Add `handleBatchDelete` (calls `orpcClient.projects.delete({ id })`)**
- [ ] **Step 6: Add `handleBatchAddToPortfolio` (calls `orpcClient.portfolio.toggle({ type: "project", ... })` — filter `projects` by `!project.portfolioEntryId`)**
- [ ] **Step 7: Add batch delete AlertDialog state + JSX**
- [ ] **Step 8: Pass `batch` to `<HeaderActions>`**
- [ ] **Step 9: Pass `isBatchSelected` and `onToggleSelect` to each `<ListItem>`**
- [ ] **Step 10: Update empty-list useEffect to clear `selectedIds`**

### Task 8: Wire stacks page

**Files:**

- Modify: `apps/web/src/pages/dashboard/stacks/stacks-page.tsx`

Same pattern as Task 6, with these differences:

- Store: `useStackStore()`
- Entity client: `orpcClient.stacks.delete`
- Toggle type: `"stack"`
- List data: `stacks`
- No drag handle (grid layout)
- StackItem consumes `toggleSelect` and `selectedIds` from store directly (done in Task 5, no need to pass as props)
- Entity field for portfolio check: `stack.portfolioEntryId` (same field name as experiences)

- [ ] **Step 1: Add `orpcClient` to import** (`import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc"`)
- [ ] **Step 2: Import coss `AlertDialog` + sub-components and `Button`** (same imports as Task 6)
- [ ] **Step 3: Destructure new store values**
- [ ] **Step 4: Compute `selectedCount` and `isBatchLoading` with `useMemo`**
- [ ] **Step 5: Add `handleBatchDelete` (calls `orpcClient.stacks.delete({ id })`)**
- [ ] **Step 6: Add `handleBatchAddToPortfolio` (calls `orpcClient.portfolio.toggle({ type: "stack", ... })` — filter `stacks` by `!stack.portfolioEntryId`)**
- [ ] **Step 7: Add batch delete AlertDialog state + JSX**
- [ ] **Step 8: Pass `batch` to `<HeaderActions>`** (note: stacks has no sort prop currently)
- [ ] **Step 9: Update empty-list useEffect to clear `selectedIds`**

### Task 9: Typecheck and verify

**Files:**

- Run in: `apps/web`

- [ ] **Step 1: Run typecheck**

```bash
pnpm -s typecheck
```

Expected: no errors.

- [ ] **Step 2: Run lint**

```bash
pnpm -s lint
```

Expected: no errors.
