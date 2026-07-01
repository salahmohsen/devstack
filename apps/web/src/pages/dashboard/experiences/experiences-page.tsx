"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tsu-stack/ui/components/tabs";

import { SortableList } from "@/shared/ui/sortable-list";

import {
  ItemSkeleton,
  ItemsEmpty,
  ItemsNavProvider,
  PageHeader,
  PageLayout,
  isAnyItemSelected,
  useItemsNavigation,
  useItemsTabUrlSync
} from "@/widgets/items-page";
import { ItemsInfoPanel } from "@/widgets/layout";

import { useExperienceStore } from "./_lib/experience.slice";
import { ExperienceTabs, isExperienceTab } from "./_lib/experience.types";
import { ExperienceInfo } from "./experience-info";
import { ExperienceItem, ExperienceItemAddButton } from "./experience-item";

export function ExperiencesPage() {
  const { activeTab, itemInfo, isItemSelected, setTabAndFilter, setItemInfo, setItemSelected } =
    useExperienceStore();
  const queryClient = useQueryClient();

  const { tab, setTab } = useItemsTabUrlSync({
    paramName: "tab",
    defaultTab: ExperienceTabs.Live,
    isValidTab: isExperienceTab
  });

  useEffect(() => {
    setTabAndFilter(tab);
  }, [tab, setTabAndFilter]);

  const experiencesQuery = useQuery(orpcQueryClient.portfolio.experiences.list.queryOptions());
  const allExperiences = experiencesQuery.data ?? [];

  const visibleExperiences = useMemo(() => {
    if (activeTab === ExperienceTabs.Live) {
      return allExperiences.filter((exp) => !exp.isArchived);
    }
    return allExperiences.filter((exp) => exp.isArchived);
  }, [allExperiences, activeTab]);

  const reorderMutation = useMutation(
    orpcQueryClient.portfolio.experiences.reorder.mutationOptions({
      onMutate: async (input) => {
        const listKey = orpcQueryClient.portfolio.experiences.list.queryKey();
        await queryClient.cancelQueries({ queryKey: listKey });

        const previous = queryClient.getQueryData(listKey);

        const nextSort = new Map(input.items.map((it) => [it.id, it.sortOrder]));

        queryClient.setQueryData(listKey, (old) => {
          if (!old) return old;
          const reordered = old
            .map((exp) => {
              const sortOrder = nextSort.get(exp.id);
              return sortOrder === undefined ? exp : { ...exp, sortOrder };
            })
            .toSorted((a, b) => a.sortOrder - b.sortOrder);
          return reordered;
        });

        return { previous };
      },
      onError: (_error, _input, context) => {
        if (context?.previous !== undefined) {
          queryClient.setQueryData(
            orpcQueryClient.portfolio.experiences.list.queryKey(),
            context.previous
          );
        }
        toast.error("Failed to update order.");
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.experiences.list.queryKey()
        });
      }
    })
  );

  function handleReorder(newOrder: typeof visibleExperiences) {
    reorderMutation.mutate({
      items: newOrder.map((exp, index) => {
        return { id: exp.id, sortOrder: index };
      })
    });
  }

  const containerRef = useRef<HTMLUListElement | null>(null);

  const { handleNext, handlePrev } = useItemsNavigation({
    items: visibleExperiences,
    itemInfo,
    isItemSelected,
    setItemInfo,
    setItemSelected,
    containerRef
  });

  const isAnySelected = isAnyItemSelected(isItemSelected);

  const emptyState = (
    <ItemsEmpty
      title={activeTab === ExperienceTabs.Live ? "No live experiences" : "No archived experiences"}
      description={
        activeTab === ExperienceTabs.Live
          ? "Add a new experience to start tracking your active positions."
          : "Archived experiences will appear here once you archive one."
      }
      action={<ExperienceItemAddButton />}
    />
  );

  function renderList() {
    if (experiencesQuery.isLoading) return <ItemSkeleton />;
    if (visibleExperiences.length === 0) return emptyState;

    return (
      <SortableList
        items={visibleExperiences}
        onReorder={handleReorder}
        disabled={reorderMutation.isPending}
        siblingsDimOnHover
      >
        {(experience, dragHandleProps) => (
          <ExperienceItem experience={experience} dragHandleProps={dragHandleProps} />
        )}
      </SortableList>
    );
  }

  return (
    <ItemsNavProvider value={{ handleNext, handlePrev }}>
      <PageLayout>
        <PageHeader
          title="Experiences"
          description="Drag the handle to reorder. Use ← → to navigate, click to inspect."
          actions={<ExperienceItemAddButton />}
        />

        <Tabs value={activeTab} onValueChange={setTab}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value={ExperienceTabs.Live}>Live</TabsTrigger>
              <TabsTrigger value={ExperienceTabs.Archived}>Archived</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={ExperienceTabs.Live} className="mt-4">
            {renderList()}
          </TabsContent>

          <TabsContent value={ExperienceTabs.Archived} className="mt-4">
            {renderList()}
          </TabsContent>
        </Tabs>

        <ItemsInfoPanel open={isAnySelected} item={itemInfo}>
          {(item) => <ExperienceInfo experience={item} />}
        </ItemsInfoPanel>
      </PageLayout>
    </ItemsNavProvider>
  );
}
