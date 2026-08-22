"use client";

import { rectSortingStrategy } from "@dnd-kit/sortable";
import { type InfiniteData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { BoxesIcon, FolderKanbanIcon, LayersIcon, Package, TagsIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  formatStackTypeLabel,
  STACK_TYPE_ORDER,
  type StackListPageOutput,
  type StackOutput,
  normalizeOrganizeActions
} from "@tsu-stack/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { ChaoticPixelsLoader } from "@tsu-stack/ui/components/chaotic-pixels-loader";
import { type FilterValue } from "@tsu-stack/ui/components/filters";

import { useInfiniteScroll } from "@/shared/hooks/use-infinite-scroll";
import {
  areAllVisibleSelected,
  isBatchSelectActive,
  selectedIdsFromState
} from "@/shared/lib/batch-selection";
import { invalidateStacksListQueries } from "@/shared/lib/invalidate-stacks-list";
import { omitSearchKey, scheduleAfterLayoutClose } from "@/shared/lib/list-inspect-search";
import { expandDashboardSidePanel } from "@/shared/lib/side-panel-control";
import { BatchSelectionBar } from "@/shared/ui/batch-selection-bar";
import { HeaderActions } from "@/shared/ui/header-actions";
import { Icon } from "@/shared/ui/icon";
import { Markdown } from "@/shared/ui/markdown";
import { SortableList } from "@/shared/ui/sortable-list";

import { useEntityPanelHostActive } from "@/features/agent-hub";
import { getPortfolioListQueryKey } from "@/features/portfolio";
import {
  cancelOrganizeStacksJob,
  dismissOrganizeStacksJob,
  setOrganizeReviewOpen,
  startOrganizeStacksJob,
  useOrganizeStacksJobSelector
} from "@/features/stacks";

import {
  ITEMS_GRID_CLASSNAME,
  ItemInfoPanel,
  ItemInfoSection,
  ItemInfoSections,
  ItemsEmpty,
  ItemsGrid,
  ItemsGridCell,
  ItemsNavProvider,
  ListSearchBar,
  PageHeader,
  PageLayout,
  PanelEditButton,
  createFeaturedBooleanField,
  createPortfolioBooleanField,
  createRelationMultiselectField,
  filterValuesFromRsql,
  isAnyOpened,
  isListNarrowed,
  isListQueryBadRequest,
  rsqlFromFilterValues,
  useItemsGridColumnCount,
  useItemsNavigation,
  withListSearch,
  type ItemsNavLayout,
  type ListSearch
} from "@/widgets/items-page";

import { ItemsInspectHost } from "@/pages/dashboard/_lib/items-inspect-host";
import { useStackStore } from "@/pages/dashboard/stacks/_lib/stack.slice";
import {
  STACKS_LIST_STALE_TIME_MS,
  flattenStacksPages,
  getListStacksPageInfiniteQueryKey,
  useListStacksPageInfiniteQuery
} from "@/pages/dashboard/stacks/api/list-stacks-page.query";
import { MergeDialog } from "@/pages/dashboard/stacks/ui/merge-dialog";
import {
  OrganizeDialog,
  type OrganizeConfirmPayload
} from "@/pages/dashboard/stacks/ui/organize-dialog";
import { StackForm } from "@/pages/dashboard/stacks/ui/stack-form";
import { StackItem } from "@/pages/dashboard/stacks/ui/stack-item";
import { StackIdentityBadges } from "@/pages/dashboard/stacks/ui/stack-type-badge";

const skillsRouteApi = getRouteApi("/(root-layout)/__protected/dashboard/skills/");

const SKILLS_SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "projectCount", label: "Projects" },
  { value: "updatedAt", label: "Updated" }
] as const;

const TYPE_DISABLED_OPERATORS = ["is_empty", "is_not_empty"] as const;

/** Side panel: hydrate deps/projects via stacks.get (list is intentionally slim). */
export function StackDetailPanel({
  stack,
  onEdit,
  navLayout
}: {
  stack: StackOutput;
  onEdit?: () => void;
  navLayout?: ItemsNavLayout;
}) {
  const detailQuery = useQuery({
    ...orpcQueryClient.stacks.get.queryOptions({ input: { id: stack.id } }),
    staleTime: STACKS_LIST_STALE_TIME_MS
  });
  const item = {
    ...stack,
    ...detailQuery.data,
    alternativeNames: detailQuery.data?.alternativeNames ?? stack.alternativeNames ?? []
  };
  const projectCount = Math.max(item.projectCount, item.projects?.length ?? 0);

  return (
    <ItemInfoPanel
      eyebrow={
        item.icon ? (
          <Icon icon={item.icon} className="size-5 rounded object-contain" />
        ) : (
          <LayersIcon strokeWidth={1.75} />
        )
      }
      title={item.name}
      description={
        item.type || item.isFeatured || projectCount > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <StackIdentityBadges
              type={item.type}
              isFeatured={item.isFeatured}
              projectCount={projectCount}
            />
          </div>
        ) : (
          <p>Not used on any project yet</p>
        )
      }
      actions={onEdit ? <PanelEditButton onClick={onEdit} /> : null}
      updatedAt={item.updatedAt}
      createdAt={item.createdAt}
      navLayout={navLayout}
    >
      <ItemInfoSections>
        <ItemInfoSection title="Summary" icon={<Package strokeWidth={1.75} />}>
          {item.description ? (
            <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
              {item.description}
            </Markdown>
          ) : (
            <p>No summary yet. Edit this skill to add one.</p>
          )}
        </ItemInfoSection>

        {(item.alternativeNames ?? []).length > 0 ? (
          <ItemInfoSection title="Also known as" icon={<TagsIcon strokeWidth={1.75} />}>
            <div className="flex flex-wrap gap-1.5">
              {(item.alternativeNames ?? []).map((name) => (
                <Badge key={name} variant="secondary" size="sm">
                  {name}
                </Badge>
              ))}
            </div>
          </ItemInfoSection>
        ) : null}

        {item.dependencies && item.dependencies.length > 0 ? (
          <ItemInfoSection title="Dependencies" icon={<BoxesIcon />}>
            <div className="flex flex-wrap gap-1.5">
              {item.dependencies.map((dep) => (
                <Badge key={dep.npmPackage} variant="secondary" size="sm">
                  {dep.npmPackage}
                </Badge>
              ))}
            </div>
          </ItemInfoSection>
        ) : null}

        {item.projects.length > 0 ? (
          <ItemInfoSection title="Projects" icon={<FolderKanbanIcon />}>
            <div className="flex flex-wrap gap-1.5">
              {item.projects.map((project) => (
                <Badge
                  key={project.id}
                  variant="secondary"
                  size="sm"
                  render={<Link to="/dashboard/projects" search={{ projectId: project.id }} />}
                >
                  {project.name}
                </Badge>
              ))}
            </div>
          </ItemInfoSection>
        ) : detailQuery.isFetching ? (
          <ItemInfoSection title="Projects" icon={<FolderKanbanIcon />}>
            <p>Loading linked projects…</p>
          </ItemInfoSection>
        ) : projectCount > 0 ? (
          <ItemInfoSection title="Projects" icon={<FolderKanbanIcon />}>
            <p>
              Used on {projectCount} {projectCount === 1 ? "project" : "projects"}.
            </p>
          </ItemInfoSection>
        ) : null}
      </ItemInfoSections>
    </ItemInfoPanel>
  );
}

export function StacksPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const search = skillsRouteApi.useSearch();
  const deepLinkStackId = search.stackId;
  const listQuery = useMemo(() => {
    return {
      q: search.q,
      filter: search.filter,
      sortBy: search.sortBy,
      sortDir: search.sortDir
    };
  }, [search.q, search.filter, search.sortBy, search.sortDir]);
  const stacksQuery = useListStacksPageInfiniteQuery(listQuery);
  const projectsQuery = useQuery(orpcQueryClient.projects.list.queryOptions());
  const narrowed = isListNarrowed({ q: search.q, filter: search.filter, page: "skills" });

  const patchListSearch = useCallback(
    (patch: Partial<Pick<ListSearch, "q" | "filter" | "sortBy" | "sortDir">>) => {
      void navigate({
        to: "/dashboard/skills",
        search: (prev) => withListSearch(prev, patch),
        replace: true
      });
    },
    [navigate]
  );

  const clearListSearch = useCallback(() => {
    patchListSearch({ q: undefined, filter: undefined });
  }, [patchListSearch]);

  const filterValues = useMemo(
    () => filterValuesFromRsql(search.filter, "skills"),
    [search.filter]
  );

  const projectOptions = useMemo(
    () =>
      (projectsQuery.data ?? []).map((project) => {
        return { value: project.id, label: project.title };
      }),
    [projectsQuery.data]
  );

  const filterFields = useMemo(
    () => [
      {
        id: "type",
        label: "Type",
        type: "select" as const,
        options: STACK_TYPE_ORDER.map((type) => {
          return { value: type, label: formatStackTypeLabel(type) };
        }),
        disabledOperators: [...TYPE_DISABLED_OPERATORS]
      },
      createPortfolioBooleanField(),
      createFeaturedBooleanField(),
      createRelationMultiselectField("projects", "Projects", projectOptions)
    ],
    [projectOptions]
  );

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

  const stacks = useMemo(() => flattenStacksPages(stacksQuery.data), [stacksQuery.data]);
  const totalCount = stacksQuery.data?.pages[0]?.totalCount;

  // Open inspect when arriving with ?stackId= (palette / deep link).
  useEffect(() => {
    if (!deepLinkStackId) return;

    let cancelled = false;
    let cancelFlush: (() => void) | undefined;

    const openAndStrip = (stack: StackOutput | null | undefined) => {
      cancelFlush = scheduleAfterLayoutClose(() => {
        if (cancelled) return;
        if (stack) {
          expandDashboardSidePanel();
          setOpenedItem(stack);
          setIsItemOpen({ [stack.id]: true });
        }
        void navigate({
          to: "/dashboard/skills",
          search: (prev) => omitSearchKey(prev, "stackId"),
          replace: true
        });
      });
    };

    const fromList = stacks.find((s) => s.id === deepLinkStackId);
    if (fromList) {
      openAndStrip(fromList);
    } else if (!stacksQuery.isLoading) {
      void queryClient
        .fetchQuery(orpcQueryClient.stacks.get.queryOptions({ input: { id: deepLinkStackId } }))
        .then((stack) => {
          if (cancelled) return;
          openAndStrip(stack);
        });
    }

    return () => {
      cancelled = true;
      cancelFlush?.();
    };
  }, [
    deepLinkStackId,
    stacks,
    stacksQuery.isLoading,
    queryClient,
    setOpenedItem,
    setIsItemOpen,
    navigate
  ]);

  // ── Sort state (declared early so infinite scroll can disable during sort)
  const [isSort, setIsSort] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<StackOutput[] | null>(null);
  const [isLoadingFullListForSort, setIsLoadingFullListForSort] = useState(false);

  const gridColumnCount = useItemsGridColumnCount();
  const gridRef = useRef<HTMLDivElement>(null);

  const itemsNav = useItemsNavigation({
    items: stacks,
    openedItem,
    isItemOpen,
    setOpenedItem,
    setIsItemOpen,
    layout: "grid",
    columnCount: gridColumnCount,
    containerRef: gridRef
  });

  const isAnyOpen = isAnyOpened(isItemOpen);

  const { sentinelRef } = useInfiniteScroll({
    hasNextPage: stacksQuery.hasNextPage,
    isFetchingNextPage: stacksQuery.isFetchingNextPage,
    fetchNextPage: () => {
      void stacksQuery.fetchNextPage();
    },
    enabled: !isSort,
    rootMargin: "200px"
  });

  // ── Organize job: field selectors so stepLabel ticks don't re-render the grid
  const organizeStatus = useOrganizeStacksJobSelector((s) => s.status);
  const organizeStepLabel = useOrganizeStacksJobSelector((s) => s.stepLabel);
  const organizeDialogOpen = useOrganizeStacksJobSelector((s) => s.dialogOpen);
  const organizeActions = useOrganizeStacksJobSelector((s) => s.actions);
  const organizeSortOrder = useOrganizeStacksJobSelector((s) => s.sortOrder);
  const organizeNotes = useOrganizeStacksJobSelector((s) => s.notes);
  const organizeFeaturedStackIds = useOrganizeStacksJobSelector((s) => s.featuredStackIds);
  const [isApplyingOrganize, setIsApplyingOrganize] = useState(false);

  function handleStartOrganize() {
    // Single-flight + re-open ready review is handled inside the job runner
    startOrganizeStacksJob();
  }

  function handleCancelOrganize() {
    cancelOrganizeStacksJob();
  }

  async function handleConfirmOrganize(payload: OrganizeConfirmPayload) {
    // Re-normalize selected subset against current stacks (auto-merge collisions)
    const { actions: plan, sortOrder: planSortOrder } = normalizeOrganizeActions(
      payload.actions,
      stacks.map((s) => {
        return { id: s.id, name: s.name, projectCount: s.projectCount };
      }),
      organizeSortOrder
    );

    const mergeActions = plan.filter((a) => a.type === "merge");
    const renameActions = plan.filter((a) => a.type === "rename");
    const enrichActions = plan.filter((a) => a.type === "enrich");
    setIsApplyingOrganize(true);
    let applyFailedEarly = false;

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
            console.debug("[stacks] Batch merge failed:", error);
            toast.error("Failed to merge some skills.");
            applyFailedEarly = true;
          }
        }
      }

      if (!applyFailedEarly) {
        // Batch update renames + enrichments + portfolio flags in one map
        const batchItemMap = new Map<string, { id: string; data: Record<string, unknown> }>();
        const stackById = new Map(stacks.map((stack) => [stack.id, stack]));

        for (const action of renameActions) {
          const newName = action.details.newName;
          if (!newName) continue;
          const current = stackById.get(action.stackId);
          batchItemMap.set(action.stackId, {
            id: action.stackId,
            data: {
              name: newName,
              alternativeNames: [
                ...(current?.alternativeNames ?? []),
                action.stackName,
                ...(action.details.alternativeNames ?? [])
              ]
            }
          });
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

        // Portfolio + featured (step 2): only write stacks whose flags actually change
        const currentById = new Map(stacks.map((s) => [s.id, s]));
        for (const item of payload.portfolio) {
          const current = currentById.get(item.id);
          if (!current) continue;
          const portfolioChanged = !!current.includedInPortfolio !== item.includedInPortfolio;
          const featuredChanged = !!current.isFeatured !== item.isFeatured;
          if (!portfolioChanged && !featuredChanged) continue;
          const patch: Record<string, unknown> = {};
          if (portfolioChanged) patch.includedInPortfolio = item.includedInPortfolio;
          if (featuredChanged) patch.isFeatured = item.isFeatured;
          const existing = batchItemMap.get(item.id);
          if (existing) {
            batchItemMap.set(item.id, {
              id: item.id,
              data: { ...existing.data, ...patch }
            });
          } else {
            batchItemMap.set(item.id, {
              id: item.id,
              data: patch
            });
          }
        }

        const batchItems = Array.from(batchItemMap.values());

        if (batchItems.length > 0) {
          try {
            await orpcClient.stacks.batchUpdate({
              items: batchItems as Array<{
                id: string;
                data: {
                  name?: string;
                  description?: string | null;
                  icon?: string | null;
                  type?: string | null;
                  includedInPortfolio?: boolean;
                  isFeatured?: boolean;
                };
              }>
            });
          } catch (error) {
            console.debug("[stacks] Batch update failed:", error);
            toast.error("Failed to apply some changes.");
            applyFailedEarly = true;
          }
        }

        if (!applyFailedEarly) {
          // Apply sort order if provided (already remapped through survivors)
          if (planSortOrder.length > 0) {
            try {
              const reorderItems = planSortOrder.map((id, index) => {
                return { id, sortOrder: index };
              });
              await orpcClient.stacks.reorder({ items: reorderItems });
            } catch (error) {
              console.debug("[stacks] Reorder failed:", error);
            }
          }

          await invalidateStacksListQueries(queryClient);
          await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryKey() });

          const totalActions = mergeActions.length + renameActions.length + enrichActions.length;
          const portfolioChanges = payload.portfolio.filter((p) => {
            const cur = currentById.get(p.id);
            return cur && !!cur.includedInPortfolio !== p.includedInPortfolio;
          }).length;
          const featuredChanges = payload.portfolio.filter((p) => {
            const cur = currentById.get(p.id);
            return cur && !!cur.isFeatured !== p.isFeatured;
          }).length;
          const totalChanges =
            totalActions +
            (planSortOrder.length > 0 ? 1 : 0) +
            (portfolioChanges > 0 ? 1 : 0) +
            (featuredChanges > 0 ? 1 : 0);
          const extras = [
            featuredChanges ? `${featuredChanges} featured` : null,
            portfolioChanges ? `${portfolioChanges} portfolio` : null
          ].filter(Boolean);
          toast.success(
            `Organized ${totalChanges} change(s)${extras.length > 0 ? ` · ${extras.join(" · ")}` : ""}.`
          );
          dismissOrganizeStacksJob();
        }
      }
    } catch (error) {
      console.debug("[stacks] Organize failed:", error);
      toast.error("Failed to apply changes.");
    }
    setIsApplyingOrganize(false);
  }

  const listPageKey = getListStacksPageInfiniteQueryKey(listQuery);

  const reorderMutation = useMutation(
    orpcQueryClient.stacks.reorder.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: listPageKey });
        const previous =
          queryClient.getQueryData<InfiniteData<StackListPageOutput, string | null>>(listPageKey);
        const nextSort = new Map(input.items.map((it) => [it.id, it.sortOrder]));
        queryClient.setQueryData<InfiniteData<StackListPageOutput, string | null>>(
          listPageKey,
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => {
                return {
                  ...page,
                  items: page.items
                    .map((s) => {
                      const sortOrder = nextSort.get(s.id);
                      return sortOrder === undefined ? s : { ...s, sortOrder };
                    })
                    .toSorted((a, b) => a.sortOrder - b.sortOrder)
                };
              })
            };
          }
        );
        return { previous };
      },
      onError: (_error, _input, context) => {
        if (context?.previous !== undefined) {
          queryClient.setQueryData(listPageKey, context.previous);
        }
        toast.error("Failed to update order.");
      },
      onSuccess: () => {
        setPendingOrder(null);
        setIsSort(false);
      },
      onSettled: () => {
        void invalidateStacksListQueries(queryClient);
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

  async function handleStartSort() {
    // Reorder needs the full catalog so indices stay correct vs unloaded pages.
    setIsLoadingFullListForSort(true);
    try {
      const full = await queryClient.ensureQueryData({
        ...orpcQueryClient.stacks.list.queryOptions(),
        staleTime: STACKS_LIST_STALE_TIME_MS
      });
      setPendingOrder(full);
      setIsSort(true);
    } catch {
      toast.error("Failed to load skills for sorting.");
    }
    setIsLoadingFullListForSort(false);
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

  const selectedIdList = selectedIdsFromState(selectedIds);
  const selectedCount = selectedIdList.length;
  const stackIds = useMemo(() => stacks.map((s) => s.id), [stacks]);
  const allVisibleSelected = areAllVisibleSelected(selectedIds, stackIds);
  const batchSelectActive = isBatchSelectActive(selectedIds);
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
        await invalidateStacksListQueries(queryClient);
        await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryKey() });
        toast.success(`Merged into "${data.merged.name}".`);
        clearSelection();
        setMergeDialogOpen(false);
      },
      onError: () => {
        toast.error("Failed to merge skills.");
      }
    })
  );

  function handleConfirmMerge(survivorId: string, victimIds: string[]) {
    for (const victimId of victimIds) {
      void mergeMutation.mutateAsync({ survivorId, victimId });
    }
  }

  useEffect(() => {
    if (!stacksQuery.isError || !isListQueryBadRequest(stacksQuery.error)) return;
    toast.error(
      stacksQuery.error instanceof Error
        ? stacksQuery.error.message
        : "Invalid filters. They were cleared."
    );
    if (search.filter || search.sortBy || search.sortDir) {
      patchListSearch({ filter: undefined, sortBy: undefined, sortDir: undefined });
    }
  }, [
    stacksQuery.isError,
    stacksQuery.error,
    search.filter,
    search.sortBy,
    search.sortDir,
    patchListSearch
  ]);

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
  // Hub inspect/form host wins the side panel. Dirty page form is discarded without confirm.
  const hostOwnsPanel = useEntityPanelHostActive();
  if (hostOwnsPanel && dialogOpen) setDialogOpen(false);
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
    const ids = selectedIdList;
    const results = await Promise.allSettled(ids.map((id) => orpcClient.stacks.delete({ id })));

    await invalidateStacksListQueries(queryClient);
    await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryKey() });

    setBatchAction(null);
    setBatchDeleteDialogOpen(false);

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed === 0) {
      toast.success(`Deleted ${succeeded} skill(s).`);
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

    await invalidateStacksListQueries(queryClient);
    await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryKey() });

    setBatchAction(null);

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed === 0) {
      toast.success(`Added ${succeeded} skill(s) to portfolio.`);
      clearSelection();
    } else {
      toast.error(`Added ${succeeded} to portfolio, ${failed} failed.`);
    }
  }

  const emptyState = narrowed ? (
    <ItemsEmpty
      icon={<Package aria-hidden />}
      title="No skills match"
      description="Try a different search or clear filters to see all skills."
      action={
        <Button type="button" variant="outline" onClick={clearListSearch}>
          Clear filters
        </Button>
      }
    />
  ) : (
    <ItemsEmpty
      icon={<Package aria-hidden />}
      title="No skills yet"
      description="Add skills you use — frameworks, tools, CI/CD, or anything else. Detect stacks on a project still finds real dependencies."
      action={<HeaderActions add={{ onAdd: () => openDialog(null), label: "Add skill" }} />}
    />
  );

  const displayItems = pendingOrder ?? stacks;

  const gridFooter =
    totalCount != null && stacks.length > 0 ? (
      <p className="pb-2 text-center text-xs text-muted-foreground">
        Showing {stacks.length}
        {totalCount > stacks.length ? ` of ${totalCount}` : ""} skill
        {totalCount === 1 ? "" : "s"}
      </p>
    ) : null;

  const gridAfter = (
    <div
      ref={sentinelRef}
      className="flex w-full items-center justify-center py-2"
      aria-hidden={!stacksQuery.hasNextPage}
    >
      {stacksQuery.isFetchingNextPage ? <ChaoticPixelsLoader label="Loading more skills" /> : null}
    </div>
  );

  function renderGrid() {
    if (isSort) {
      return (
        <SortableList
          items={displayItems}
          onReorder={handleReorder}
          sortable
          axis="both"
          disabled={reorderMutation.isPending}
          strategy={rectSortingStrategy}
          containerClassName={ITEMS_GRID_CLASSNAME}
        >
          {(stack, dragHandleProps) => (
            <ItemsGridCell key={stack.id}>
              <StackItem
                stack={stack}
                isChecked={Boolean(selectedIds?.[stack.id])}
                batchSelectActive={batchSelectActive}
                isOpen={Boolean(isItemOpen?.[stack.id])}
                onEdit={openDialog}
                onOpen={openItem}
                onToggleSelect={toggleSelect}
                dragHandleProps={dragHandleProps}
                isSort
              />
            </ItemsGridCell>
          )}
        </SortableList>
      );
    }

    return (
      <ItemsGrid
        items={displayItems}
        isLoading={stacksQuery.isLoading}
        emptyState={emptyState}
        containerRef={gridRef}
        after={gridAfter}
        footer={gridFooter}
        renderItem={(stack) => (
          <StackItem
            stack={stack}
            isChecked={Boolean(selectedIds?.[stack.id])}
            batchSelectActive={batchSelectActive}
            isOpen={Boolean(isItemOpen?.[stack.id])}
            onEdit={openDialog}
            onOpen={openItem}
            onToggleSelect={toggleSelect}
            onPrefetch={prefetchStack}
          />
        )}
      />
    );
  }

  return (
    <ItemsNavProvider value={{ ...itemsNav, containerRef: gridRef }}>
      <PageLayout>
        <PageHeader
          title="Skills"
          description="What you use — broader than a project's stack. Detect stacks on a project for real dependencies."
          actions={
            <HeaderActions
              add={{ onAdd: () => openDialog(null), label: "Add skill" }}
              organize={{
                isRunning: organizeStatus === "running",
                currentStep: organizeStepLabel,
                onStart: handleStartOrganize,
                onCancel: handleCancelOrganize
              }}
              sort={{
                isSort,
                isSortPending: reorderMutation.isPending || isLoadingFullListForSort,
                reorderDisabled: narrowed,
                onSortStart: () => {
                  if (narrowed) return;
                  void handleStartSort();
                },
                onSortSave: handleSaveSort,
                onSortRestore: handleRestoreDefault,
                onSortCancel: handleCancelSort
              }}
            />
          }
        />

        {!isSort ? (
          <ListSearchBar
            variant="catalog"
            fields={filterFields}
            value={filterValues as FilterValue[]}
            onValueChange={(value) => {
              patchListSearch({ filter: rsqlFromFilterValues(value, "skills") });
            }}
            q={search.q}
            onQChange={(q) => {
              patchListSearch({ q });
            }}
            sortBy={search.sortBy}
            sortDir={search.sortDir}
            sortOptions={SKILLS_SORT_OPTIONS}
            onSortChange={(next) => {
              patchListSearch({ sortBy: next.sortBy, sortDir: next.sortDir });
            }}
            labels={{
              searchPlaceholder: "Search skills",
              searchAriaLabel: "Search skills"
            }}
          />
        ) : null}

        {!isSort ? (
          <BatchSelectionBar
            selectedCount={selectedCount}
            totalCount={stackIds.length}
            allVisibleSelected={allVisibleSelected}
            selectAllLabel={`Select all loaded (${stackIds.length})`}
            isDeleting={isDeleting}
            isLoading={isBatchLoading}
            isAddingToPortfolio={isAddingToPortfolio}
            onDeleteSelected={() => setBatchDeleteDialogOpen(true)}
            onAddSelectedToPortfolio={handleBatchAddToPortfolio}
            onMerge={isMergeEligible ? () => setMergeDialogOpen(true) : undefined}
            onSelectAll={() => selectAll(stackIds)}
            onClearSelection={clearSelection}
          />
        ) : null}

        {renderGrid()}

        <ItemsInspectHost
          open={isAnyOpen && !dialogOpen && !hostOwnsPanel}
          item={openedItem}
          title="Skill"
          onOpenChange={(next) => {
            if (!next) {
              setOpenedItem(null);
              setIsItemOpen(null);
            }
          }}
        >
          {(item) => {
            if (!item) return null;
            return (
              <StackDetailPanel stack={item} onEdit={() => openDialog(item.id)} navLayout="grid" />
            );
          }}
        </ItemsInspectHost>

        {dialogOpen && !hostOwnsPanel ? (
          <StackForm
            key={editingStackId ?? "new"}
            initialData={
              editingStackId ? (stacks.find((s) => s.id === editingStackId) ?? null) : null
            }
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
        ) : null}

        {/* ── Batch delete dialog ─────────────────────────────────── */}
        <AlertDialog
          open={batchDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!open && isDeleting) return;
            setBatchDeleteDialogOpen(open);
          }}
        >
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedCount} skill(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the selected skills and remove them from all projects.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                loading={isDeleting}
                onClick={() => {
                  void handleBatchDelete();
                }}
              >
                Delete
              </AlertDialogAction>
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
          featuredStackIds={organizeFeaturedStackIds}
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
