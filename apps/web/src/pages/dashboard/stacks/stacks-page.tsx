"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type StackOutput } from "@tsu-stack/core/portfolio";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";

import {
  GridSkeleton,
  ItemsEmpty,
  ItemsNavProvider,
  PageHeader,
  PageLayout,
  isAnyItemSelected,
  useItemsNavigation
} from "@/widgets/items-page";
import { ItemsInfoPanel } from "@/widgets/layout";

import { useStackStore } from "@/pages/dashboard/stacks/_lib/stack.slice";
import { StackForm } from "@/pages/dashboard/stacks/ui/stack-form";
import { StackInfo } from "@/pages/dashboard/stacks/ui/stack-info";
import { StackItem } from "@/pages/dashboard/stacks/ui/stack-item";
import { StackItemAddButton } from "@/pages/dashboard/stacks/ui/stack-item-add-button";

export function StacksPage() {
  const queryClient = useQueryClient();
  const stacksQuery = useQuery(orpcQueryClient.portfolio.stacks.list.queryOptions());

  const { itemInfo, isItemSelected, setItemInfo, setItemSelected } = useStackStore();

  const stacks = useMemo<StackOutput[]>(() => stacksQuery.data ?? [], [stacksQuery.data]);

  const { handleNext, handlePrev } = useItemsNavigation<StackOutput>({
    items: stacks,
    itemInfo,
    isItemSelected,
    setItemInfo,
    setItemSelected
  });

  const isAnySelected = isAnyItemSelected(isItemSelected);

  useEffect(() => {
    if (!stacksQuery.isLoading && stacks.length === 0 && itemInfo) {
      setItemInfo(null);
      setItemSelected(null);
    }
  }, [stacksQuery.isLoading, stacks.length, itemInfo, setItemInfo, setItemSelected]);

  const [editingStackId, setEditingStackId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  const openDialog = useCallback((id: string | null) => {
    setEditingStackId(id);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const emptyState = (
    <ItemsEmpty
      title="No stacks configured"
      description="Add a stack to reuse it across multiple projects."
      action={<StackItemAddButton onAdd={() => openDialog(null)} />}
    />
  );

  function renderGrid() {
    if (stacksQuery.isLoading) return <GridSkeleton count={8} />;
    if (stacks.length === 0) return emptyState;

    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {stacks.map((stack) => (
          <StackItem
            key={stack.id}
            stack={stack}
            onEdit={openDialog}
            onMouseEnter={() => {
              void queryClient.prefetchQuery(
                orpcQueryClient.portfolio.stacks.get.queryOptions({ input: { id: stack.id } })
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
          actions={<StackItemAddButton onAdd={() => openDialog(null)} />}
        />

        {renderGrid()}

        <ItemsInfoPanel open={isAnySelected} item={itemInfo}>
          {(item: StackOutput) => <StackInfo stack={item} />}
        </ItemsInfoPanel>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent key={dialogKey}>
            <DialogHeader>
              <DialogTitle>{editingStackId ? "Edit Stack" : "New Stack"}</DialogTitle>
              <DialogDescription>
                {editingStackId
                  ? "Update the name or icon. Changes apply to every project using this stack."
                  : "Add a shared tech stack that can be attached to any project."}
              </DialogDescription>
            </DialogHeader>
            <StackForm
              id={editingStackId ?? undefined}
              onSuccess={closeDialog}
              onClose={closeDialog}
            />
          </DialogContent>
        </Dialog>
      </PageLayout>
    </ItemsNavProvider>
  );
}
