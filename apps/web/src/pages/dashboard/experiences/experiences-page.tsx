"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { SortableList } from "@/shared/ui/sortable-list";

import {
  ItemsEmpty,
  ItemsNavProvider,
  ListSkeleton,
  PageHeader,
  PageLayout,
  isAnyItemSelected,
  useItemsNavigation
} from "@/widgets/items-page";
import { ItemsInfoPanel } from "@/widgets/layout";

import { useExperienceStore } from "./_lib/experience.slice";
import { ExperienceForm } from "./experience-form";
import { ExperienceInfo } from "./experience-info";
import { ExperienceItem, ExperienceItemAddButton } from "./experience-item";

export function ExperiencesPage() {
  const { itemInfo, isItemSelected, setItemInfo, setItemSelected } = useExperienceStore();
  const queryClient = useQueryClient();

  const experiencesQuery = useQuery(orpcQueryClient.portfolio.experiences.list.queryOptions());
  const visibleExperiences = useMemo(() => experiencesQuery.data ?? [], [experiencesQuery.data]);

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

  useEffect(() => {
    if (!experiencesQuery.isLoading && visibleExperiences.length === 0 && itemInfo) {
      setItemInfo(null);
      setItemSelected(null);
    }
  }, [
    experiencesQuery.isLoading,
    visibleExperiences.length,
    itemInfo,
    setItemInfo,
    setItemSelected
  ]);

  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openDialog = useCallback((id: string | null) => {
    setEditingExperienceId(id);
    setDialogOpen(true);
  }, []);

  const emptyState = (
    <ItemsEmpty
      title="No experiences yet"
      description="Add a new experience to start tracking your work history."
      action={<ExperienceItemAddButton onAdd={() => openDialog(null)} />}
    />
  );

  function renderList() {
    if (experiencesQuery.isLoading) return <ListSkeleton />;
    if (visibleExperiences.length === 0) return emptyState;

    return (
      <SortableList
        items={visibleExperiences}
        onReorder={handleReorder}
        disabled={reorderMutation.isPending}
        siblingsDimOnHover
      >
        {(experience, dragHandleProps) => (
          <ExperienceItem
            experience={experience}
            dragHandleProps={dragHandleProps}
            onEdit={openDialog}
            onMouseEnter={() => {
              void queryClient.prefetchQuery(
                orpcQueryClient.portfolio.experiences.get.queryOptions({
                  input: { id: experience.id }
                })
              );
            }}
          />
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
          actions={<ExperienceItemAddButton onAdd={() => openDialog(null)} />}
        />

        {renderList()}

        <ItemsInfoPanel open={isAnySelected} item={itemInfo}>
          {(item) => <ExperienceInfo experience={item} />}
        </ItemsInfoPanel>

        <ExperienceForm
          key={editingExperienceId ?? "new"}
          initialData={
            editingExperienceId
              ? (visibleExperiences.find((exp) => exp.id === editingExperienceId) ?? null)
              : null
          }
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </PageLayout>
    </ItemsNavProvider>
  );
}
