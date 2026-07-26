"use client";

import { rectSortingStrategy } from "@dnd-kit/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type OrganizeAction, type StackOutput } from "@tsu-stack/core";
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

import { getPortfolioListQueryOptions } from "@/features/portfolio";
import { useOrganizeStacksMutation } from "@/features/stacks";

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

export function StacksPage() {
  const queryClient = useQueryClient();
  const stacksQuery = useQuery(orpcQueryClient.stacks.list.queryOptions());

  const {
    openedItem,
    isItemOpen,
    setOpenedItem,
    setIsItemOpen,
    selectedIds,
    selectAll,
    clearSelection
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

  // ── Organize state ────────────────────────────────────────────────
  const [organizeStep, setOrganizeStep] = useState<string | null>(null);
  const [organizeDialogOpen, setOrganizeDialogOpen] = useState(false);
  const [organizeActions, setOrganizeActions] = useState<OrganizeAction[]>([]);
  const [organizeSortOrder, setOrganizeSortOrder] = useState<string[]>([]);
  const [isOrganizing, setIsOrganizing] = useState(false);

  const organizeMutation = useOrganizeStacksMutation();
  const organizeAbortRef = useRef<AbortController | null>(null);

  function handleStartOrganize() {
    const controller = new AbortController();
    organizeAbortRef.current = controller;
    setOrganizeStep("Initializing");
    organizeMutation.mutate(
      { onStepChange: setOrganizeStep, signal: controller.signal },
      {
        onSuccess: (data) => {
          setOrganizeActions(data.actions);
          setOrganizeSortOrder(data.sortOrder);
          if (data.actions.length > 0 || data.sortOrder.length > 0) {
            setOrganizeDialogOpen(true);
          } else {
            toast.success("All stacks are already organized!");
          }
          setOrganizeStep(null);
        },
        onError: (error) => {
          if (error.name === "AbortError") {
            toast.info("Organize cancelled.");
          } else {
            console.error("[stacks] Organize failed:", error);
            toast.error("Failed to organize stacks.");
          }
          setOrganizeStep(null);
        }
      }
    );
  }

  function handleCancelOrganize() {
    organizeAbortRef.current?.abort();
    setOrganizeStep(null);
  }

  async function handleConfirmOrganize() {
    const mergeActions = organizeActions.filter((a) => a.type === "merge");
    const renameActions = organizeActions.filter((a) => a.type === "rename");
    const enrichActions = organizeActions.filter((a) => a.type === "enrich");
    setIsOrganizing(true);

    try {
      if (mergeActions.length > 0) {
        const mergeItems = mergeActions
          .map((action) => {
            const details = action.details as { mergeIntoId?: string; mergeIntoName?: string };
            if (!details.mergeIntoId) return null;
            return { survivorId: details.mergeIntoId, victimId: action.stackId };
          })
          .filter((item): item is { survivorId: string; victimId: string } => item !== null);

        if (mergeItems.length > 0) {
          try {
            await orpcClient.stacks.batchMerge({ items: mergeItems });
          } catch (error) {
            console.error("[stacks] Batch merge failed:", error);
            toast.error("Failed to merge some stacks.");
          }
        }
      }

      // Batch update renames + enrichments + SVG in a single transaction
      // Deduplicate by id (last one wins), track used names to avoid conflicts
      const batchItemMap = new Map<string, { id: string; data: Record<string, unknown> }>();
      const usedNewNames = new Set<string>();

      for (const action of renameActions) {
        const details = action.details as { newName?: string };
        if (!details.newName) continue;
        const newName = details.newName;
        if (usedNewNames.has(newName.toLowerCase())) {
          console.warn(`[stacks] Skipping duplicate rename target "${newName}"`);
          continue;
        }
        usedNewNames.add(newName.toLowerCase());
        batchItemMap.set(action.stackId, { id: action.stackId, data: { name: newName } });
      }

      for (const action of enrichActions) {
        const details = action.details as {
          newDescription?: string;
          newIcon?: string;
          newType?: string;
        };
        const existing = batchItemMap.get(action.stackId);
        const enrichData: Record<string, unknown> = {
          description: details.newDescription,
          icon: details.newIcon,
          type: details.newType
        };
        if (existing) {
          // Merge: keep existing name, add enrich fields
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
        }
      }

      // Apply sort order if provided
      if (organizeSortOrder.length > 0) {
        try {
          const reorderItems = organizeSortOrder.map((id, index) => {
            return { id, sortOrder: index };
          });
          await orpcClient.stacks.reorder({ items: reorderItems });
        } catch (error) {
          console.error("[stacks] Reorder failed:", error);
        }
      }

      await queryClient.invalidateQueries({ queryKey: orpcQueryClient.stacks.list.queryKey() });
      await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryOptions().queryKey });

      const totalActions = mergeActions.length + renameActions.length + enrichActions.length;
      const totalChanges = totalActions + (organizeSortOrder.length > 0 ? 1 : 0);
      toast.success(`Organized ${totalChanges} change(s).`);
      setOrganizeDialogOpen(false);
      setOrganizeActions([]);
      setOrganizeSortOrder([]);
    } catch (error) {
      console.error("[stacks] Organize failed:", error);
      toast.error("Failed to apply changes.");
    } finally {
      setIsOrganizing(false);
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
        void queryClient.invalidateQueries({ queryKey: getPortfolioListQueryOptions().queryKey });
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
        await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryOptions().queryKey });
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

  async function handleBatchDelete() {
    setBatchAction("delete");
    setBatchDeleteDialogOpen(false);
    const ids = selectedIdsEntries.map(([id]) => id);
    const results = await Promise.allSettled(ids.map((id) => orpcClient.stacks.delete({ id })));

    await queryClient.invalidateQueries({ queryKey: orpcQueryClient.stacks.list.queryKey() });
    await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryOptions().queryKey });

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
    await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryOptions().queryKey });

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
      title="No stacks configured"
      description="Add a stack to reuse it across multiple projects."
      action={<HeaderActions add={{ onAdd: () => openDialog(null), label: "Add Stack" }} />}
    />
  );

  function renderGrid() {
    if (stacksQuery.isLoading) return <GridSkeleton count={8} />;
    if (stacks.length === 0) return emptyState;

    const displayItems = pendingOrder ?? stacks;

    const grid = (
      <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 animate-grid">
        {displayItems.map((stack) => (
          <div key={stack.id} className="animate-grid-item">
            <StackItem
              stack={stack}
              onEdit={openDialog}
              onMouseEnter={() => {
                void queryClient.prefetchQuery(
                  orpcQueryClient.stacks.get.queryOptions({ input: { id: stack.id } })
                );
              }}
            />
          </div>
        ))}
      </div>
    );

    if (!isSort) return grid;

    return (
      <SortableList
        items={displayItems}
        onReorder={handleReorder}
        disabled={reorderMutation.isPending}
        strategy={rectSortingStrategy}
        containerClassName="animate-grid grid w-full grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3"
      >
        {(stack, dragHandleProps) => (
          <StackItem
            key={stack.id}
            stack={stack}
            onEdit={openDialog}
            dragHandleProps={dragHandleProps}
            isSort
          />
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
                isRunning: organizeMutation.isPending,
                currentStep: organizeStep,
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
            return (
              <ItemInfoPanel
                title={
                  <div className="flex min-w-0 items-center gap-3">
                    {item.icon ? (
                      <Icon icon={item.icon} className="size-10 shrink-0 rounded object-contain" />
                    ) : (
                      <Package
                        className="size-10 shrink-0 text-muted-foreground"
                        strokeWidth={1.5}
                      />
                    )}
                    <FrameTitle className="text-lg">{item.name}</FrameTitle>
                  </div>
                }
                description={
                  <>
                    {item.projectCount > 0 && (
                      <span>
                        {item.projectCount} {item.projectCount === 1 ? "project" : "projects"}
                      </span>
                    )}
                  </>
                }
              >
                {item.description ? (
                  <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                    {item.description}
                  </Markdown>
                ) : (
                  <p className="text-sm text-muted-foreground">No description.</p>
                )}

                {item.dependencies && item.dependencies.length > 0 && (
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
                )}

                {item.projects && item.projects.length > 0 && (
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
                )}
              </ItemInfoPanel>
            );
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

        {/* ── Organize dialog ─────────────────────────────────────── */}
        <OrganizeDialog
          open={organizeDialogOpen}
          onOpenChange={setOrganizeDialogOpen}
          actions={organizeActions}
          sortOrder={organizeSortOrder}
          isPending={isOrganizing}
          onConfirm={handleConfirmOrganize}
          onClearSortOrder={() => setOrganizeSortOrder([])}
        />
      </PageLayout>
    </ItemsNavProvider>
  );
}
