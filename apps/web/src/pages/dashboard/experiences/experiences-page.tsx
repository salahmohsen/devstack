"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Building2Icon, CalendarIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { getPortfolioListQueryOptions } from "@/shared/lib/portfolio-list.query";
import { HeaderActions } from "@/shared/ui/header-actions";
import { ListItem } from "@/shared/ui/list-item";
import { Markdown } from "@/shared/ui/markdown";
import { SortableList } from "@/shared/ui/sortable-list";

import {
  ItemInfoPanel,
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

function formatRange(fromDate: string | null, toDate: string | null): string {
  if (!fromDate) return "Ongoing";
  const start = safeFormat(fromDate, "MMM yyyy");
  if (!toDate) return `${start} — Present`;
  const end = safeFormat(toDate, "MMM yyyy");
  return `${start} — ${end}`;
}

function formatRangeFull(fromDate: string | null, toDate: string | null): string {
  if (!fromDate) return "Ongoing";
  const start = safeFormat(fromDate, "dd MMMM yyyy");
  if (!toDate) return `${start} — Present`;
  const end = safeFormat(toDate, "dd MMMM yyyy");
  return `${start} — ${end}`;
}

function safeFormat(value: string, pattern: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, pattern);
}

export function ExperiencesPage() {
  const { itemInfo, isItemSelected, setItemInfo, setItemSelected, selectItem } =
    useExperienceStore();
  const [isSort, setIsSort] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<typeof visibleExperiences | null>(null);
  const queryClient = useQueryClient();

  const experiencesQuery = useQuery(orpcQueryClient.portfolio.experiences.list.queryOptions());
  const visibleExperiences = useMemo(() => experiencesQuery.data ?? [], [experiencesQuery.data]);

  const deleteMutation = useMutation(
    orpcQueryClient.portfolio.experiences.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.experiences.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryOptions().queryKey
        });
        toast.success("Experience deleted.");
      }
    })
  );

  const togglePortfolioMutation = useMutation(
    orpcQueryClient.portfolio.portfolio.toggle.mutationOptions({
      onSuccess: async (_data, variables) => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.experiences.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryOptions().queryKey
        });
        toast.success(variables.included ? "Added to portfolio." : "Removed from portfolio.");
      },
      onError: () => {
        toast.error("Failed to update portfolio.");
      }
    })
  );

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
      onSuccess: () => {
        setPendingOrder(null);
        setIsSort(false);
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.experiences.list.queryKey()
        });
        void queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryOptions().queryKey
        });
      }
    })
  );

  const [togglingId, setTogglingId] = useState<string | null>(null);

  function handleReorder(newOrder: typeof visibleExperiences) {
    setPendingOrder(newOrder);
  }

  function handleSaveSort() {
    const data = pendingOrder ?? visibleExperiences;
    reorderMutation.mutate({
      items: data.map((exp, index) => {
        return { id: exp.id, sortOrder: index };
      })
    });
  }

  function handleStartSort() {
    setPendingOrder(visibleExperiences);
    setIsSort(true);
  }

  function handleRestoreDefault() {
    const sorted = [...(pendingOrder ?? visibleExperiences)].toSorted((a, b) => {
      if (!a.fromDate && !b.fromDate) return 0;
      if (!a.fromDate) return 1;
      if (!b.fromDate) return -1;
      return b.fromDate.localeCompare(a.fromDate);
    });
    setPendingOrder(sorted);
  }

  function handleCancelSort() {
    setPendingOrder(null);
    setIsSort(false);
  }

  function handleTogglePortfolio(experienceId: string, included: boolean) {
    setTogglingId(experienceId);
    togglePortfolioMutation.mutate(
      { type: "experience", entityId: experienceId, included },
      { onSettled: () => setTogglingId(null) }
    );
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
      action={<HeaderActions add={{ onAdd: () => openDialog(null), label: "Add Experience" }} />}
    />
  );

  function renderList() {
    if (experiencesQuery.isLoading) return <ListSkeleton />;
    if (visibleExperiences.length === 0) return emptyState;

    return (
      <SortableList
        items={pendingOrder ?? visibleExperiences}
        onReorder={handleReorder}
        disabled={reorderMutation.isPending || !isSort}
        siblingsDimOnHover
      >
        {(experience, dragHandleProps) => (
          <ListItem
            selected={isItemSelected?.[experience.id] ?? false}
            onSelect={() => selectItem(experience.id, experience)}
            dragHandleProps={dragHandleProps}
            isSort={isSort}
            onMouseEnter={() => {
              void queryClient.prefetchQuery(
                orpcQueryClient.portfolio.experiences.get.queryOptions({
                  input: { id: experience.id }
                })
              );
            }}
            onEdit={() => openDialog(experience.id)}
            onDelete={() => deleteMutation.mutate({ id: experience.id })}
            isDeleting={deleteMutation.isPending}
            onTogglePortfolio={() =>
              handleTogglePortfolio(experience.id, !experience.portfolioEntryId)
            }
            isTogglingPortfolio={togglingId === experience.id}
            inPortfolio={!!experience.portfolioEntryId}
            deleteTitle="Delete this experience?"
            deleteDescription="This will permanently delete this experience and all its associated projects."
            title={experience.title}
            meta={
              <>
                <p className="flex items-center gap-1">
                  <Building2Icon size={14} />
                  <span>{experience.organization}</span>
                </p>
                <p className="flex items-center gap-1">
                  <CalendarIcon size={14} />
                  <span>{formatRange(experience.fromDate, experience.toDate)}</span>
                </p>
              </>
            }
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
          actions={
            <HeaderActions
              add={{ onAdd: () => openDialog(null), label: "Add Experience" }}
              sort={{
                isSort: isSort,
                isSortPending: reorderMutation.isPending,
                onSortStart: handleStartSort,
                onSortSave: handleSaveSort,
                onSortRestore: handleRestoreDefault,
                onSortCancel: handleCancelSort
              }}
            />
          }
        />

        {renderList()}

        <ItemsInfoPanel open={isAnySelected} item={itemInfo}>
          {(item) => {
            if (!item) return null;
            return (
              <ItemInfoPanel
                title={item.title}
                description={`${item.organization} · ${formatRangeFull(item.fromDate, item.toDate)}`}
              >
                {item.description ? (
                  <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                    {item.description}
                  </Markdown>
                ) : (
                  <p className="text-muted-foreground">No description.</p>
                )}
                {item.projects.length > 0 ? (
                  <>
                    <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Projects
                    </p>
                    <ul className="space-y-2">
                      {item.projects.map((project) => (
                        <li key={project.id} className="flex items-baseline justify-between gap-3">
                          <span className="font-medium">{project.title}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {project.year}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </ItemInfoPanel>
            );
          }}
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
