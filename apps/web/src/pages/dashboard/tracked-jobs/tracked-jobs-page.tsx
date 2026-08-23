"use client";

import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { FileTextIcon, LayoutGridIcon, ListIcon, PlusIcon } from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore
} from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  APPLICATION_OUTCOME_LABELS,
  APPLICATION_SOURCE_TAG_LABELS,
  APPLICATION_SOURCE_TAGS,
  APPLICATION_STAGE_LABELS,
  APPLICATION_STAGES,
  APPLICATION_OUTCOMES,
  type ApplicationOutput
} from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { type FilterValue } from "@tsu-stack/ui/components/filters";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { useInfiniteScroll } from "@/shared/hooks/use-infinite-scroll";
import { invalidateApplicationsListQueries } from "@/shared/lib/invalidate-applications-list";
import { invalidateStacksListQueries } from "@/shared/lib/invalidate-stacks-list";
import { omitSearchKey, scheduleAfterLayoutClose } from "@/shared/lib/list-inspect-search";
import { AiLoader } from "@/shared/ui/ai-loader";
import { LIST_COLUMN_INSET_CLASSNAME } from "@/shared/ui/list-column";

import { useEntityPanelHostActive } from "@/features/agent-hub";
import {
  flattenApplicationsPages,
  useCountApplicationsQuery,
  useListApplicationsBoardQuery,
  useListApplicationsPageInfiniteQuery
} from "@/features/applications";

import {
  isAnyOpened,
  ItemsNavProvider,
  ListSearchBar,
  PageHeader,
  PageLayout,
  TRACKED_SEED,
  createMatchScoreField,
  createOutcomeField,
  createRelationMultiselectField,
  createStageField,
  filterValuesFromRsql,
  isListNarrowed,
  isListQueryBadRequest,
  resolveJobsFilterParam,
  rsqlFromFilterValues,
  useItemsNavigation,
  withListSearch,
  type ListSearch
} from "@/widgets/items-page";

import { ItemsInspectHost } from "@/pages/dashboard/_lib/items-inspect-host";
import {
  peekSidePanelFrame,
  popSidePanelFrame,
  subscribeSidePanelStack
} from "@/pages/dashboard/_lib/side-panel-stack";
import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import { useApplicationsView } from "@/pages/dashboard/tracked-jobs/_lib/use-applications-view";
import { ApplicationsBoard } from "@/pages/dashboard/tracked-jobs/ui/board";
import { ApplicationsList } from "@/pages/dashboard/tracked-jobs/ui/list";

const ApplicationFormSheet = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/application-form-sheet").then((m) => {
    return {
      default: m.ApplicationFormSheet
    };
  })
);
const StackForm = lazy(() =>
  import("@/pages/dashboard/stacks/ui/stack-form").then((m) => {
    return {
      default: m.StackForm
    };
  })
);
const ApplicationInfoPanel = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/ui/application-info-panel").then((m) => {
    return {
      default: m.ApplicationInfoPanel
    };
  })
);
const ApplicationMaterialPreviewDialog = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/ui/apply-package-entry-actions").then((m) => {
    return {
      default: m.ApplicationMaterialPreviewDialog
    };
  })
);
const ApplyPackageSheet = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/ui/apply-package-sheet").then((m) => {
    return {
      default: m.ApplyPackageSheet
    };
  })
);
const ImportJdSheet = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/ui/import-jd-sheet").then((m) => {
    return {
      default: m.ImportJdSheet
    };
  })
);
const SendOutreachDialog = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/ui/send-outreach-dialog").then((m) => {
    return {
      default: m.SendOutreachDialog
    };
  })
);
const DeleteApplicationDialog = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/ui/delete-application-dialog").then((m) => {
    return {
      default: m.DeleteApplicationDialog
    };
  })
);

const TRACKED_SORT_OPTIONS = [
  { value: "updatedAt", label: "Updated" },
  { value: "stage", label: "Stage" },
  { value: "matchScore", label: "Match score" },
  { value: "company", label: "Company" }
] as const;

const trackedJobsRouteApi = getRouteApi("/(root-layout)/__protected/dashboard/tracked-jobs/");

export function TrackedJobsPage() {
  const { view, setView } = useApplicationsView();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = trackedJobsRouteApi.useSearch();
  const deepLinkApplicationId = search.applicationId;
  const resolvedFilter = resolveJobsFilterParam({ page: "tracked-jobs", filter: search.filter });
  const listQueryInput = useMemo(() => {
    return {
      scope: "tracked-jobs" as const,
      q: search.q,
      filter: resolvedFilter,
      sortBy: search.sortBy,
      sortDir: search.sortDir
    };
  }, [resolvedFilter, search.q, search.sortBy, search.sortDir]);
  const boardQueryInput = useMemo(() => {
    return {
      q: search.q,
      filter: resolvedFilter,
      sortBy: search.sortBy,
      sortDir: search.sortDir
    };
  }, [resolvedFilter, search.q, search.sortBy, search.sortDir]);
  const listQuery = useListApplicationsPageInfiniteQuery(listQueryInput);
  const boardQuery = useListApplicationsBoardQuery(boardQueryInput);
  const trackedCountQuery = useCountApplicationsQuery("tracked");
  // Hub tool invalidation lives on HubChatProvider (dashboard layout).
  const {
    sheetOpen,
    sheetMode,
    editItem,
    viewItem,
    openCreate,
    openEdit,
    closeSheet,
    closeView,
    showView,
    packageSheetAppId,
    closePackageSheet,
    sendOutreachAppId,
    closeSendOutreach,
    deleteConfirmAppId,
    closeDeleteConfirm,
    importJdSheetOpen,
    openImportJdSheet,
    closeImportJdSheet,
    materialPreview,
    closeMaterialPreview
  } = useApplicationStore();
  // Host wins the panel (any kind). Dirty application sheet is discarded without confirm.
  const hostOwnsPanel = useEntityPanelHostActive();
  if (hostOwnsPanel && sheetOpen) closeSheet();
  const frame = useSyncExternalStore(
    subscribeSidePanelStack,
    peekSidePanelFrame,
    peekSidePanelFrame
  );

  const listApplications = useMemo(
    () => flattenApplicationsPages(listQuery.data),
    [listQuery.data]
  );
  const boardItems = boardQuery.data?.items;
  const boardApplications = useMemo(() => boardItems ?? [], [boardItems]);
  const applications = view === "list" ? listApplications : boardApplications;
  const trackedTotal = trackedCountQuery.data?.count ?? 0;
  const narrowed = isListNarrowed({ q: search.q, filter: search.filter, page: "tracked-jobs" });
  const listTotalCount = listQuery.data?.pages[0]?.totalCount;
  const boardTotalCount = boardQuery.data?.totalCount ?? 0;

  const patchListSearch = useCallback(
    (patch: Partial<Pick<ListSearch, "q" | "filter" | "sortBy" | "sortDir">>) => {
      void navigate({
        to: "/dashboard/tracked-jobs",
        search: (prev) => withListSearch(prev, patch),
        replace: true
      });
    },
    [navigate]
  );

  const clearListSearch = useCallback(() => {
    patchListSearch({ q: undefined, filter: TRACKED_SEED });
  }, [patchListSearch]);

  useEffect(() => {
    if (search.filter?.trim()) return;
    patchListSearch({ filter: TRACKED_SEED });
  }, [search.filter, patchListSearch]);

  const listQueryError = listQuery.error;
  const boardQueryError = boardQuery.error;
  useEffect(() => {
    const error = listQueryError ?? boardQueryError;
    const isError = listQuery.isError || boardQuery.isError;
    if (!isError || !isListQueryBadRequest(error)) return;
    toast.error(error instanceof Error ? error.message : "Invalid filters. They were reset.");
    if (search.filter !== TRACKED_SEED || search.sortBy || search.sortDir) {
      patchListSearch({ filter: TRACKED_SEED, sortBy: undefined, sortDir: undefined });
    }
  }, [
    listQuery.isError,
    boardQuery.isError,
    listQueryError,
    boardQueryError,
    search.filter,
    search.sortBy,
    search.sortDir,
    patchListSearch
  ]);

  const filterValues = useMemo(
    () => filterValuesFromRsql(resolvedFilter, "tracked-jobs"),
    [resolvedFilter]
  );

  const filterFields = useMemo(
    () => [
      createOutcomeField(
        APPLICATION_OUTCOMES.map((value) => {
          return { value, label: APPLICATION_OUTCOME_LABELS[value] };
        })
      ),
      createStageField(
        APPLICATION_STAGES.map((value) => {
          return { value, label: APPLICATION_STAGE_LABELS[value] };
        })
      ),
      createRelationMultiselectField(
        "sourceTags",
        "Source",
        APPLICATION_SOURCE_TAGS.map((tag) => {
          return { value: tag, label: APPLICATION_SOURCE_TAG_LABELS[tag] };
        })
      ),
      createMatchScoreField()
    ],
    []
  );

  const { sentinelRef } = useInfiniteScroll<HTMLLIElement>({
    hasNextPage: listQuery.hasNextPage,
    isFetchingNextPage: listQuery.isFetchingNextPage,
    fetchNextPage: () => {
      void listQuery.fetchNextPage();
    },
    enabled: view === "list" && listApplications.length > 0
  });

  // Hub JD save/package lands here with ?applicationId= — open the inspect panel.
  useEffect(() => {
    if (!deepLinkApplicationId) return;

    let cancelled = false;
    let cancelFlush: (() => void) | undefined;

    const openAndStrip = (row: ApplicationOutput | null | undefined) => {
      cancelFlush = scheduleAfterLayoutClose(() => {
        if (cancelled) return;
        if (row) showView(row);
        void navigate({
          to: "/dashboard/tracked-jobs",
          search: (prev) => omitSearchKey(prev, "applicationId"),
          replace: true
        });
      });
    };

    const fromList =
      listApplications.find((application) => application.id === deepLinkApplicationId) ??
      boardApplications.find((application) => application.id === deepLinkApplicationId);
    if (fromList) {
      openAndStrip(fromList);
    } else if (!listQuery.isLoading && !boardQuery.isLoading) {
      void queryClient
        .fetchQuery(
          orpcQueryClient.applications.get.queryOptions({ input: { id: deepLinkApplicationId } })
        )
        .then((row) => {
          if (cancelled) return;
          openAndStrip(row);
        });
    }

    return () => {
      cancelled = true;
      cancelFlush?.();
    };
  }, [
    listApplications,
    boardApplications,
    deepLinkApplicationId,
    listQuery.isLoading,
    boardQuery.isLoading,
    navigate,
    queryClient,
    showView
  ]);

  // Prefer live list row so stage/outcome/edit/package changes refresh the side panel.
  const knownById = useMemo(() => {
    const map = new Map<string, ApplicationOutput>();
    for (const row of listApplications) map.set(row.id, row);
    for (const row of boardApplications) map.set(row.id, row);
    return map;
  }, [listApplications, boardApplications]);

  const liveViewItem = useMemo(() => {
    if (!viewItem) return null;
    return knownById.get(viewItem.id) ?? viewItem;
  }, [knownById, viewItem]);

  const packageApplication = useMemo(() => {
    if (!packageSheetAppId) return null;
    return knownById.get(packageSheetAppId) ?? null;
  }, [packageSheetAppId, knownById]);

  const sendApplication = useMemo(() => {
    if (!sendOutreachAppId) return null;
    return knownById.get(sendOutreachAppId) ?? null;
  }, [sendOutreachAppId, knownById]);

  const deleteApplication = useMemo(() => {
    if (!deleteConfirmAppId) return null;
    return knownById.get(deleteConfirmAppId) ?? null;
  }, [deleteConfirmAppId, knownById]);

  const materialPreviewApplication = useMemo(() => {
    if (!materialPreview) return null;
    return knownById.get(materialPreview.applicationId) ?? null;
  }, [materialPreview, knownById]);

  // Side panel works for both board (View / card click) and list (row click).
  const isItemOpen = useMemo(
    () => (liveViewItem ? { [liveViewItem.id]: true } : null),
    [liveViewItem]
  );
  const isAnyOpen = isAnyOpened(isItemOpen);

  // Keyboard/footer nav must not toggle-close when re-selecting the current id.
  const setOpenedItem = useCallback(
    (item: (typeof applications)[number] | null) => {
      if (item) showView(item);
      else closeView();
    },
    [showView, closeView]
  );

  const setIsItemOpen = useCallback(
    (open: Record<string, boolean> | null) => {
      if (!open) {
        closeView();
        return;
      }
      const id = Object.keys(open).find((k) => open[k]);
      if (!id) {
        closeView();
        return;
      }
      const item = knownById.get(id);
      if (item) showView(item);
    },
    [knownById, showView, closeView]
  );

  const containerRef = useRef<HTMLUListElement | null>(null);
  const { handleNext, handlePrev } = useItemsNavigation({
    items: applications,
    openedItem: liveViewItem,
    isItemOpen,
    setOpenedItem,
    setIsItemOpen,
    containerRef
  });

  return (
    <ItemsNavProvider value={{ handleNext, handlePrev, containerRef }}>
      <PageLayout className="flex h-[calc(100dvh-var(--navbar-height)-10px)] min-h-0 flex-col gap-5 overflow-hidden p-5">
        <PageHeader
          title="Tracked jobs"
          description="Pipeline board and list for roles you are actively tracking."
          actions={
            <Group>
              <Button type="button" size="sm" onClick={openCreate}>
                <PlusIcon />
                New
              </Button>
              <GroupSeparator />
              <Button type="button" size="sm" variant="outline" onClick={openImportJdSheet}>
                <FileTextIcon />
                Import
              </Button>
            </Group>
          }
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <ListSearchBar
            variant="tracked-jobs"
            className={LIST_COLUMN_INSET_CLASSNAME}
            fields={filterFields}
            value={filterValues}
            onValueChange={(next: FilterValue[]) => {
              patchListSearch({ filter: rsqlFromFilterValues(next, "tracked-jobs") });
            }}
            q={search.q}
            onQChange={(q) => patchListSearch({ q })}
            sortBy={search.sortBy}
            sortDir={search.sortDir}
            sortOptions={TRACKED_SORT_OPTIONS}
            onSortChange={(next) => patchListSearch(next)}
            onJobsClear={clearListSearch}
            status={
              view === "list" && listApplications.length > 0 && listTotalCount != null
                ? listTotalCount > listApplications.length
                  ? `${listApplications.length} of ${listTotalCount} jobs`
                  : `${listApplications.length} job${listApplications.length === 1 ? "" : "s"}`
                : view === "board" && boardApplications.length > 0
                  ? boardTotalCount > boardApplications.length
                    ? `${boardApplications.length} of ${boardTotalCount} jobs`
                    : `${boardApplications.length} job${boardApplications.length === 1 ? "" : "s"}`
                  : undefined
            }
            beforeSort={
              <Group aria-label="View">
                <Button
                  type="button"
                  size="sm"
                  variant={view === "board" ? "default" : "outline"}
                  aria-pressed={view === "board"}
                  onClick={() => {
                    setView("board");
                  }}
                >
                  <LayoutGridIcon aria-hidden="true" />
                  {view === "board" ? "Board" : <span className="sr-only">Board</span>}
                </Button>
                <GroupSeparator />
                <Button
                  type="button"
                  size="sm"
                  variant={view === "list" ? "default" : "outline"}
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  <ListIcon aria-hidden="true" />
                  {view === "list" ? "List" : <span className="sr-only">List</span>}
                </Button>
              </Group>
            }
            labels={{
              searchPlaceholder: "Search jobs",
              searchAriaLabel: "Search jobs"
            }}
          />
          {boardQuery.isLoading && view === "board" ? (
            <AiLoader />
          ) : view === "board" ? (
            <ApplicationsBoard
              applications={boardApplications}
              narrowed={narrowed}
              trackedTotal={trackedTotal}
              totalCount={boardTotalCount}
              onClearFilters={clearListSearch}
            />
          ) : (
            <ApplicationsList
              applications={listApplications}
              isLoading={listQuery.isLoading}
              listRef={containerRef}
              narrowed={narrowed}
              trackedTotal={trackedTotal}
              onClearFilters={clearListSearch}
              sentinelRef={sentinelRef}
              isFetchingNextPage={listQuery.isFetchingNextPage}
              hasNextPage={listQuery.hasNextPage}
            />
          )}
        </div>

        <Suspense fallback={null}>
          <ItemsInspectHost
            open={isAnyOpen && !sheetOpen && frame?.type !== "stack-create" && !hostOwnsPanel}
            item={liveViewItem}
            title="Application"
            onOpenChange={(next) => {
              if (!next) closeView();
            }}
          >
            {(item) => (
              <Suspense
                fallback={
                  <div className="flex min-h-48 items-center justify-center py-10">
                    <Spinner className="size-6" aria-label="Loading application" />
                  </div>
                }
              >
                <ApplicationInfoPanel item={item} onEdit={() => openEdit(item)} />
              </Suspense>
            )}
          </ItemsInspectHost>

          {frame?.type === "stack-create" && !hostOwnsPanel ? (
            <StackForm
              key={`stack-create-${frame.name}`}
              open
              createSeed={{ name: frame.name }}
              onOpenChange={(open) => {
                if (!open) popSidePanelFrame();
              }}
              onSaved={() => {
                void invalidateStacksListQueries(queryClient);
                void queryClient.invalidateQueries({
                  queryKey: orpcQueryClient.applications.get.key()
                });
                void invalidateApplicationsListQueries(queryClient);
              }}
            />
          ) : null}

          {sheetOpen && !hostOwnsPanel ? (
            <ApplicationFormSheet
              key={editItem?.id ?? "new"}
              open={sheetOpen}
              onOpenChange={(open) => {
                if (!open) closeSheet();
                else if (sheetMode === "create") openCreate();
              }}
              mode={sheetMode}
              initialData={editItem}
            />
          ) : null}

          {packageSheetAppId != null ? (
            <ApplyPackageSheet
              open
              application={packageApplication}
              onOpenChange={(open) => {
                if (!open) closePackageSheet();
              }}
            />
          ) : null}

          {sendOutreachAppId != null ? (
            <SendOutreachDialog
              open
              application={sendApplication}
              onOpenChange={(open) => {
                if (!open) closeSendOutreach();
              }}
            />
          ) : null}

          {deleteConfirmAppId != null ? (
            <DeleteApplicationDialog
              open
              application={deleteApplication}
              onOpenChange={(open) => {
                if (!open) closeDeleteConfirm();
              }}
            />
          ) : null}

          {importJdSheetOpen ? (
            <ImportJdSheet
              open
              onOpenChange={(open) => {
                if (open) openImportJdSheet();
                else closeImportJdSheet();
              }}
            />
          ) : null}

          {materialPreviewApplication && materialPreview ? (
            <ApplicationMaterialPreviewDialog
              app={materialPreviewApplication}
              kind={materialPreview.kind}
              open
              onOpenChange={(open) => {
                if (!open) closeMaterialPreview();
              }}
            />
          ) : null}
        </Suspense>
      </PageLayout>
    </ItemsNavProvider>
  );
}
