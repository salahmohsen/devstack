"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { FrameTitle } from "@tsu-stack/ui/components/frame";

import { HeaderActions } from "@/shared/ui/header-actions";
import { Icon } from "@/shared/ui/icon";
import { Markdown } from "@/shared/ui/markdown";

import {
  GridSkeleton,
  ItemInfoPanel,
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
import { StackItem } from "@/pages/dashboard/stacks/ui/stack-item";

export function StacksPage() {
  const queryClient = useQueryClient();
  const stacksQuery = useQuery(orpcQueryClient.portfolio.stacks.list.queryOptions());

  const { itemInfo, isItemSelected, setItemInfo, setItemSelected } = useStackStore();

  const stacks = useMemo(() => stacksQuery.data ?? [], [stacksQuery.data]);

  const { handleNext, handlePrev } = useItemsNavigation({
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

  const openDialog = useCallback((id: string | null) => {
    setEditingStackId(id);
    setDialogOpen(true);
  }, []);

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
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
          actions={<HeaderActions add={{ onAdd: () => openDialog(null), label: "Add Stack" }} />}
        />

        {renderGrid()}

        <ItemsInfoPanel open={isAnySelected} item={itemInfo}>
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
      </PageLayout>
    </ItemsNavProvider>
  );
}
