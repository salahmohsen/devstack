"use client";

import { rectSortingStrategy } from "@dnd-kit/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type OrganizeAction, type StackOutput, normalizeOrganizeActions } from "@tsu-stack/core";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { FrameTitle } from "@tsu-stack/ui/components/frame";

import { HeaderActions } from "@/shared/ui/header-actions";
import { Icon } from "@/shared/ui/icon";
import { Markdown } from "@/shared/ui/markdown";
import { SortableList } from "@/shared/ui/sortable-list";

import { getPortfolioListQueryKey } from "@/features/portfolio";
import {
  cancelOrganizeStacksJob,
  dismissOrganizeStacksJob,
  setOrganizeReviewOpen,
  startOrganizeStacksJob,
  useOrganizeStacksJobSelector
} from "@/features/stacks";

import {
  GridSkeleton,
  ItemInfoPanel,
  ItemsEmpty,
  ItemsNavProvider,
  PageHeader,
  PageLayout,
  isAnyOpened,
  useItemsNavigation
} from "@/widgets/items-page";
import { ItemsInfoPanel } from "@/widgets/layout";

import { useStackStore } from "@/pages/dashboard/stacks/_lib/stack.slice";
import { MergeDialog } from "@/pages/dashboard/stacks/ui/merge-dialog";
import { OrganizeDialog } from "@/pages/dashboard/stacks/ui/organize-dialog";
import { StackForm } from "@/pages/dashboard/stacks/ui/stack-form";
import { StackItem } from "@/pages/dashboard/stacks/ui/stack-item";

/** List data changes infrequently — avoid refetch-on-focus re-render storms. */
const STACKS_LIST_STALE_TIME_MS = 30_000;

/** Side panel: hydrate deps/projects via stacks.get (list is intentionally slim). */
function StackDetailPanel({ stack }: { stack: StackOutput }) {
  const detailQuery = useQuery({
    ...orpcQueryClient.stacks.get.queryOptions({ input: { id: stack.id } }),
    staleTime: STACKS_LIST_STALE_TIME_MS
  });
  const item = detailQuery.data ?? stack;

  return (
    <ItemInfoPanel
      title={
        <div className="flex min-w-0 items-center gap-3">
          {item.icon ? (
            <Icon icon={item.icon} className="size-10 shrink-0 rounded object-contain" />
          ) : (
            <Package className="size-10 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          )}
          <FrameTitle className="text-lg">{item.name}</FrameTitle>
        </div>
      }
      description={
        <>
          {item.projectCount > 0 ? (
            <span>
              {item.projectCount} {item.projectCount === 1 ? "project" : "projects"}
            </span>
          ) : null}
        </>
      }
      updatedAt={item.updatedAt}
      createdAt={item.createdAt}
    >
      {item.description ? (
        <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
          {item.description}
        </Markdown>
      ) : (
        <p className="text-sm text-muted-foreground">No description.</p>
      )}

      {detailQuery.isLoading && !detailQuery.data ? (
        <p className="mt-4 text-xs text-muted-foreground">Loading details…</p>
      ) : null}

      {item.dependencies && item.dependencies.length > 0 ? (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-medium">Dependencies</h4>
          <div className="flex flex-wrap gap-1.5">
            {item.dependencies.map((dep) => (
              <Badge key={dep.npmPackage} variant="secondary" size="sm">
                {dep.npmPackage}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {item.projects && item.projects.length > 0 ? (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-medium">Projects</h4>
          <div className="flex flex-wrap gap-1.5">
            {item.projects.map((project) => (
              <Badge key={project.id} variant="secondary" size="sm">
                {project.name}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </ItemInfoPanel>
  );
}

export function StacksPage() {
  const queryClient = useQueryClient();
  const stacksQuery = useQuery({
    ...orpcQueryClient.stacks.list.queryOptions(),
    staleTime: STACKS_LIST_STALE_TIME_MS
  });

  const {
    openedItem,
    isItemOpen,
    setOpenedItem,
    setIsItemOpen,
    selectedIds,
    selectAll,
    clearSelection,
    openItem,
    toggleSelect
  } = useStackStore();

  const stacks = useMemo(() => stacksQuery.data ?? [], [stacksQuery.data]);

  const { handleNext, handlePrev } = useItemsNavigation({
    items: stacks,
    openedItem,
    isItemOpen,
    setOpenedItem,
    setIsItemOpen
  });

  const isAnyOpen = isAnyOpened(isItemOpen);

  // ── Organize job: field selectors so stepLabel ticks don't re-render the grid
  const organizeStatus = useOrganizeStacksJobSelector((s) => s.status);
  const organizeStepLabel = useOrganizeStacksJobSelector((s) => s.stepLabel);
  const organizeDialogOpen = useOrganizeStacksJobSelector((s) => s.dialogOpen);
  const organizeActions = useOrganizeStacksJobSelector((s) => s.actions);
  const organizeSortOrder = useOrganizeStacksJobSelector((s) => s.sortOrder);
  const organizeNotes = useOrganizeStacksJobSelector((s) => s.notes);
  const [isApplyingOrganize, setIsApplyingOrganize] = useState(false);

  function handleStartOrganize() {
    // Single-flight + re-open ready review is handled inside the job runner
    startOrganizeStacksJob();
  }

  function handleCancelOrganize() {
    cancelOrganizeStacksJob();
  }

  async function handleConfirmOrganize(selectedActions: OrganizeAction[]) {
    // Re-normalize selected subset against current stacks (auto-merge collisions)
    const { actions: plan, sortOrder: planSortOrder } = normalizeOrganizeActions(
      selectedActions,
      stacks.map((s) => {
        return { id: s.id, name: s.name, projectCount: s.projectCount };
      }),
      organizeSortOrder
    );

    const mergeActions = plan.filter((a) => a.type === "merge");
    const renameActions = plan.filter((a) => a.type === "rename");
    const enrichActions = plan.filter((a) => a.type === "enrich");
    setIsApplyingOrganize(true);

    try {
      if (mergeActions.length > 0) {
        const mergeItems = mergeActions
          .map((action) => {
            const mergeIntoId = action.details.mergeIntoId;
            if (!mergeIntoId) return null;
            return { survivorId: mergeIntoId, victimId: action.stackId };
          })
          .filter((item): item is { survivorId: string; victimId: string } => item !== null);

        if (mergeItems.length > 0) {
          try {
            await orpcClient.stacks.batchMerge({ items: mergeItems });
          } catch (error) {
            console.error("[stacks] Batch merge failed:", error);
            toast.error("Failed to merge some stacks.");
            return;
          }
        }
      }

      // Batch update renames + enrichments in a single transaction
      const batchItemMap = new Map<string, { id: string; data: Record<string, unknown> }>();

      for (const action of renameActions) {
        const newName = action.details.newName;
        if (!newName) continue;
        batchItemMap.set(action.stackId, { id: action.stackId, data: { name: newName } });
      }

      for (const action of enrichActions) {
        const existing = batchItemMap.get(action.stackId);
        const enrichData: Record<string, unknown> = {
          description: action.details.newDescription,
          icon: action.details.newIcon,
          type: action.details.newType
        };
        // Drop undefined so we don't wipe fields
        for (const key of Object.keys(enrichData)) {
          if (enrichData[key] === undefined) delete enrichData[key];
        }
        if (Object.keys(enrichData).length === 0) continue;

        if (existing) {
          batchItemMap.set(action.stackId, {
            id: action.stackId,
            data: { ...existing.data, ...enrichData }
          });
        } else {
          batchItemMap.set(action.stackId, { id: action.stackId, data: enrichData });
        }
      }

      const batchItems = Array.from(batchItemMap.values());

      if (batchItems.length > 0) {
        try {
          await orpcClient.stacks.batchUpdate({ items: batchItems });
        } catch (error) {
          console.error("[stacks] Batch update failed:", error);
          toast.error("Failed to apply some changes.");
          return;
        }
      }

      // Apply sort order if provided (already remapped through survivors)
      if (planSortOrder.length > 0) {
        try {
          const reorderItems = planSortOrder.map((id, index) => {
            return { id, sortOrder: index };
          });
          await orpcClient.stacks.reorder({ items: reorderItems });
        } catch (error) {
          console.error("[stacks] Reorder failed:", error);
        }
      }

      await queryClient.invalidateQueries({ queryKey: orpcQueryClient.stacks.list.queryKey() });
      await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryKey() });

      const totalActions = mergeActions.length + renameActions.length + enrichActions.length;
      const totalChanges = totalActions + (planSortOrder.length > 0 ? 1 : 0);
      toast.success(`Organized ${totalChanges} change(s).`);
      dismissOrganizeStacksJob();
    } catch (error) {
      console.error("[stacks] Organize failed:", error);
      toast.error("Failed to apply changes.");
    } finally {
      setIsApplyingOrganize(false);
    }
  }

  // ── Sort state ────────────────────────────────────────────────────
  const [isSort, setIsSort] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<StackOutput[] | null>(null);

  const reorderMutation = useMutation(
    orpcQueryClient.stacks.reorder.mutationOptions({
      onMutate: async (input) => {
        const listKey = orpcQueryClient.stacks.list.queryKey();
        await queryClient.cancelQueries({ queryKey: listKey });
        const previous = queryClient.getQueryData(listKey);
        const nextSort = new Map(input.items.map((it) => [it.id, it.sortOrder]));
        queryClient.setQueryData(listKey, (old) => {
          if (!old) return old;
          return old
            .map((s) => {
              const sortOrder = nextSort.get(s.id);
              return sortOrder === undefined ? s : { ...s, sortOrder };
            })
            .toSorted((a, b) => a.sortOrder - b.sortOrder);
        });
        return { previous };
      },
      onError: (_error, _input, context) => {
        if (context?.previous !== undefined) {
          queryClient.setQueryData(orpcQueryClient.stacks.list.queryKey(), context.previous);
        }
        toast.error("Failed to update order.");
      },
      onSuccess: () => {
        setPendingOrder(null);
        setIsSort(false);
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: orpcQueryClient.stacks.list.queryKey() });
        void queryClient.invalidateQueries({ queryKey: getPortfolioListQueryKey() });
      }
    })
  );

  function handleReorder(newOrder: StackOutput[]) {
    setPendingOrder(newOrder);
  }

  function handleSaveSort() {
    const data = pendingOrder ?? stacks;
    reorderMutation.mutate({
      items: data.map((s, index) => {
        return { id: s.id, sortOrder: index };
      })
    });
  }

  function handleStartSort() {
    setPendingOrder(stacks);
    setIsSort(true);
  }

  function handleRestoreDefault() {
    const sorted = [...(pendingOrder ?? stacks)].toSorted((a, b) => a.name.localeCompare(b.name));
    setPendingOrder(sorted);
  }

  function handleCancelSort() {
    setPendingOrder(null);
    setIsSort(false);
  }

  // ── Batch state ───────────────────────────────────────────────────
  const [batchAction, setBatchAction] = useState<"delete" | "portfolio" | null>(null);

  const selectedIdsEntries = useMemo(
    () => Object.entries(selectedIds ?? {}).filter(([, v]) => v),
    [selectedIds]
  );
  const selectedCount = selectedIdsEntries.length;
  const isBatchLoading = batchAction !== null;
  const isDeleting = batchAction === "delete";
  const isAddingToPortfolio = batchAction === "portfolio";

  // ── Merge state ───────────────────────────────────────────────────
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  const selectedStacks = useMemo(
    () => stacks.filter((s) => selectedIds?.[s.id]),
    [stacks, selectedIds]
  );
  const isMergeEligible = selectedCount >= 2 && !isSort;

  const mergeMutation = useMutation(
    orpcQueryClient.stacks.merge.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries({ queryKey: orpcQueryClient.stacks.list.queryKey() });
        await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryKey() });
        toast.success(`Merged into "${data.merged.name}".`);
        clearSelection();
        setMergeDialogOpen(false);
      },
      onError: () => {
        toast.error("Failed to merge stacks.");
      }
    })
  );

  function handleConfirmMerge(survivorId: string, victimIds: string[]) {
    for (const victimId of victimIds) {
      void mergeMutation.mutateAsync({ survivorId, victimId });
    }
  }

  useEffect(() => {
    if (!stacksQuery.isLoading && stacks.length === 0) {
      if (openedItem) {
        setOpenedItem(null);
        setIsItemOpen(null);
      }
      if (selectedIds) clearSelection();
    }
  }, [
    stacksQuery.isLoading,
    stacks.length,
    openedItem,
    setOpenedItem,
    setIsItemOpen,
    selectedIds,
    clearSelection
  ]);

  const [editingStackId, setEditingStackId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const openDialog = useCallback((id: string | null) => {
    setEditingStackId(id);
    setDialogOpen(true);
  }, []);

  const prefetchStack = useCallback(
    (id: string) => {
      void queryClient.prefetchQuery(
        orpcQueryClient.stacks.get.queryOptions({
          input: { id },
          // Detail rarely changes while browsing the grid
          staleTime: STACKS_LIST_STALE_TIME_MS
        })
      );
    },
    [queryClient]
  );

  async function handleBatchDelete() {
    setBatchAction("delete");
    setBatchDeleteDialogOpen(false);
    const ids = selectedIdsEntries.map(([id]) => id);
    const results = await Promise.allSettled(ids.map((id) => orpcClient.stacks.delete({ id })));

    await queryClient.invalidateQueries({ queryKey: orpcQueryClient.stacks.list.queryKey() });
    await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryKey() });

    setBatchAction(null);

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed === 0) {
      toast.success(`Deleted ${succeeded} stack(s).`);
      clearSelection();
    } else {
      toast.error(`Deleted ${succeeded}, ${failed} failed.`);
    }
  }

  async function handleBatchAddToPortfolio() {
    setBatchAction("portfolio");
    const items = stacks.filter((stack) => selectedIds?.[stack.id] && !stack.portfolioEntryId);

    if (items.length === 0) {
      toast("All selected items are already in portfolio.");
      setBatchAction(null);
      return;
    }

    const results = await Promise.allSettled(
      items.map((stack) =>
        orpcClient.portfolio.toggle({ type: "stack", entityId: stack.id, included: true })
      )
    );

    await queryClient.invalidateQueries({ queryKey: orpcQueryClient.stacks.list.queryKey() });
    await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryKey() });

    setBatchAction(null);

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed === 0) {
      toast.success(`Added ${succeeded} stack(s) to portfolio.`);
      clearSelection();
    } else {
      toast.error(`Added ${succeeded} to portfolio, ${failed} failed.`);
    }
  }

  const emptyState = (
    <ItemsEmpty
      icon={<Package aria-hidden />}
      title="No stacks configured"
      description="Add a stack to reuse it across multiple projects."
      action={<HeaderActions add={{ onAdd: () => openDialog(null), label: "Add Stack" }} />}
    />
  );

  const displayItems = pendingOrder ?? stacks;

  // Viewport breakpoints (not auto-fill): column count stays stable when the
  // side panel opens and only card width animates — no item reflow/rearrange.
  const gridClassName =
    "grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 animate-grid";

  function renderGrid() {
    if (stacksQuery.isLoading) return <GridSkeleton count={8} />;
    if (stacks.length === 0) return emptyState;

    if (!isSort) {
      return (
        <div className={gridClassName}>
          {displayItems.map((stack) => (
            <div key={stack.id} className="animate-grid-item min-w-0">
              <StackItem
                stack={stack}
                isChecked={Boolean(selectedIds?.[stack.id])}
                isOpen={Boolean(isItemOpen?.[stack.id])}
                onEdit={openDialog}
                onOpen={openItem}
                onToggleSelect={toggleSelect}
                onPrefetch={prefetchStack}
              />
            </div>
          ))}
        </div>
      );
    }

    return (
      <SortableList
        items={displayItems}
        onReorder={handleReorder}
        sortable
        axis="both"
        disabled={reorderMutation.isPending}
        strategy={rectSortingStrategy}
        containerClassName={gridClassName}
      >
        {(stack, dragHandleProps) => (
          <div key={stack.id} className="animate-grid-item min-w-0">
            <StackItem
              stack={stack}
              isChecked={Boolean(selectedIds?.[stack.id])}
              isOpen={Boolean(isItemOpen?.[stack.id])}
              onEdit={openDialog}
              onOpen={openItem}
              onToggleSelect={toggleSelect}
              dragHandleProps={dragHandleProps}
              isSort
            />
          </div>
        )}
      </SortableList>
    );
  }

  return (
    <ItemsNavProvider value={{ handleNext, handlePrev }}>
      <PageLayout>
        <PageHeader
          title="Tech Stacks"
          description="Click a stack to inspect its details. Use ← → to navigate."
          actions={
            <HeaderActions
              add={{ onAdd: () => openDialog(null), label: "Add Stack" }}
              organize={{
                isRunning: organizeStatus === "running",
                currentStep: organizeStepLabel,
                onStart: handleStartOrganize,
                onCancel: handleCancelOrganize
              }}
              sort={{
                isSort,
                isSortPending: reorderMutation.isPending,
                onSortStart: handleStartSort,
                onSortSave: handleSaveSort,
                onSortRestore: handleRestoreDefault,
                onSortCancel: handleCancelSort
              }}
              batch={{
                selectedCount,
                totalCount: stacks.length,
                isBatchLoading,
                isDeleting,
                isAddingToPortfolio,
                onDeleteSelected: () => setBatchDeleteDialogOpen(true),
                onAddSelectedToPortfolio: handleBatchAddToPortfolio,
                onMerge: isMergeEligible ? () => setMergeDialogOpen(true) : undefined,
                onSelectAll: () => selectAll(stacks.map((s) => s.id)),
                onClearSelection: clearSelection
              }}
            />
          }
        />

        {renderGrid()}

        <ItemsInfoPanel open={isAnyOpen} item={openedItem}>
          {(item) => {
            if (!item) return null;
            return <StackDetailPanel stack={item} />;
          }}
        </ItemsInfoPanel>

        <StackForm
          key={editingStackId ?? "new"}
          initialData={
            editingStackId ? (stacks.find((s) => s.id === editingStackId) ?? null) : null
          }
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />

        {/* ── Batch delete dialog ─────────────────────────────────── */}
        <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedCount} stack(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the selected stacks and remove them from all projects.
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

        {/* ── Merge dialog ────────────────────────────────────────── */}
        <MergeDialog
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          stacks={selectedStacks}
          onConfirm={handleConfirmMerge}
          isPending={mergeMutation.isPending}
        />

        {/* ── Organize dialog (state from global job store) ───────── */}
        <OrganizeDialog
          open={organizeDialogOpen}
          onOpenChange={(open) => {
            setOrganizeReviewOpen(open);
            // Dismissing without apply keeps ready results — re-open via Organize
          }}
          actions={organizeActions}
          sortOrder={organizeSortOrder}
          notes={organizeNotes}
          stacks={stacks}
          isPending={isApplyingOrganize}
          onConfirm={handleConfirmOrganize}
          onClearSortOrder={() => {
            // sort order is part of the ready job; clearing keeps dialog openable
            setOrganizeReviewOpen(false);
          }}
          onRetry={() => {
            dismissOrganizeStacksJob();
            startOrganizeStacksJob();
          }}
        />
      </PageLayout>
    </ItemsNavProvider>
  );
}
