"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Button } from "@tsu-stack/ui/components/button";
import { FrameTitle } from "@tsu-stack/ui/components/frame";

import { HeaderActions } from "@/shared/ui/header-actions";
import { Icon } from "@/shared/ui/icon";
import { Markdown } from "@/shared/ui/markdown";

import { getPortfolioListQueryOptions } from "@/features/portfolio";

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

  const [batchAction, setBatchAction] = useState<"delete" | "portfolio" | null>(null);

  const selectedIdsEntries = useMemo(
    () => Object.entries(selectedIds ?? {}).filter(([, v]) => v),
    [selectedIds]
  );
  const selectedCount = selectedIdsEntries.length;
  const isBatchLoading = batchAction !== null;
  const isDeleting = batchAction === "delete";
  const isAddingToPortfolio = batchAction === "portfolio";

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

    return (
      <div className="grid max-w-fit grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:col-auto">
        {stacks.map((stack) => (
          <StackItem
            key={stack.id}
            stack={stack}
            onEdit={openDialog}
            onMouseEnter={() => {
              void queryClient.prefetchQuery(
                orpcQueryClient.stacks.get.queryOptions({ input: { id: stack.id } })
              );
            }}
          />
        ))}
      </div>
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
              batch={{
                selectedCount,
                totalCount: stacks.length,
                isBatchLoading,
                isDeleting,
                isAddingToPortfolio,
                onDeleteSelected: () => setBatchDeleteDialogOpen(true),
                onAddSelectedToPortfolio: handleBatchAddToPortfolio,
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
                      <Icon
                        nameIcon={item.icon}
                        propsIcon={{ className: "size-10 shrink-0 rounded object-contain" }}
                      />
                    ) : (
                      <Package
                        className="size-10 shrink-0 text-muted-foreground"
                        strokeWidth={1.5}
                      />
                    )}
                    <FrameTitle className="text-lg">{item.name}</FrameTitle>
                  </div>
                }
                description={`Sort order: ${item.sortOrder}`}
              >
                {item.description ? (
                  <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                    {item.description}
                  </Markdown>
                ) : (
                  <p className="text-sm text-muted-foreground">No description.</p>
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
      </PageLayout>
    </ItemsNavProvider>
  );
}
