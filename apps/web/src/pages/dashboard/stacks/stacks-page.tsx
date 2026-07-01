"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type StackOutput } from "@tsu-stack/core/portfolio";

import {
  ItemSkeleton,
  ItemsEmpty,
  ItemsNavProvider,
  PageHeader,
  PageLayout,
  isAnyItemSelected,
  useItemsNavigation
} from "@/widgets/items-page";
import { ItemsInfoPanel } from "@/widgets/layout";

import { useStackStore } from "@/pages/dashboard/stacks/_lib/stack.slice";
import { StackInfo } from "@/pages/dashboard/stacks/ui/stack-info";
import { StackItem } from "@/pages/dashboard/stacks/ui/stack-item";
import { StackItemAddButton } from "@/pages/dashboard/stacks/ui/stack-item-add-button";

export function StacksPage() {
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

  const emptyState = (
    <ItemsEmpty
      title="No stacks configured"
      description="Add a stack to reuse it across multiple projects."
      action={<StackItemAddButton />}
    />
  );

  function renderGrid() {
    if (stacksQuery.isLoading) return <ItemSkeleton count={8} />;
    if (stacks.length === 0) return emptyState;

    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {stacks.map((stack) => (
          <StackItem key={stack.id} stack={stack} />
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
          actions={<StackItemAddButton />}
        />

        {renderGrid()}

        <ItemsInfoPanel open={isAnySelected} item={itemInfo}>
          {(item: StackOutput) => <StackInfo stack={item} />}
        </ItemsInfoPanel>
      </PageLayout>
    </ItemsNavProvider>
  );
}
