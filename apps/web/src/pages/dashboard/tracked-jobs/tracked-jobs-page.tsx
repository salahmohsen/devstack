"use client";

import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { FileTextIcon, LayoutGridIcon, ListIcon, PlusIcon } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";

import { omitSearchKey } from "@/shared/lib/list-inspect-search";
import { AiLoader } from "@/shared/ui/ai-loader";

import { useEntityPanelHostActive } from "@/features/agent-hub";
import { useListApplicationsQuery } from "@/features/applications";

import {
  isAnyOpened,
  ItemsNavProvider,
  PageHeader,
  PageLayout,
  useItemsNavigation
} from "@/widgets/items-page";

import { ItemsInspectHost } from "@/pages/dashboard/_lib/items-inspect-host";
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

const EMPTY_APPLICATIONS: ApplicationOutput[] = [];

const trackedJobsRouteApi = getRouteApi("/(root-layout)/__protected/dashboard/tracked-jobs/");

export function TrackedJobsPage() {
  const { view, setView } = useApplicationsView();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = trackedJobsRouteApi.useSearch();
  const deepLinkApplicationId = search.applicationId;
  /** Tracked jobs only — pipeline CRM. */
  const listQuery = useListApplicationsQuery("tracked");
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
    listFilter,
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

  // Stable empty fallback so memo deps do not thrash every render.
  const applications = listQuery.data ?? EMPTY_APPLICATIONS;

  const filtered = useMemo(() => {
    if (listFilter === "open") return applications.filter((a) => a.outcome == null);
    if (listFilter === "closed") return applications.filter((a) => a.outcome != null);
    return applications;
  }, [applications, listFilter]);

  // Hub JD save/package lands here with ?applicationId= — open the inspect panel.
  useEffect(() => {
    if (!deepLinkApplicationId) return;

    const fromList = applications.find((application) => application.id === deepLinkApplicationId);
    if (fromList) {
      showView(fromList);
      void navigate({
        to: "/dashboard/tracked-jobs",
        search: omitSearchKey(search, "applicationId"),
        replace: true
      });
      return;
    }

    if (listQuery.isLoading) return;

    let cancelled = false;
    void queryClient
      .fetchQuery(
        orpcQueryClient.applications.get.queryOptions({ input: { id: deepLinkApplicationId } })
      )
      .then((row) => {
        if (cancelled) return;
        if (row) showView(row);
        void navigate({
          to: "/dashboard/tracked-jobs",
          search: omitSearchKey(search, "applicationId"),
          replace: true
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    applications,
    deepLinkApplicationId,
    listQuery.isLoading,
    navigate,
    queryClient,
    search,
    showView
  ]);

  // Prefer live list row so stage/outcome/edit/package changes refresh the side panel.
  const liveViewItem = useMemo(() => {
    if (!viewItem) return null;
    return applications.find((a) => a.id === viewItem.id) ?? viewItem;
  }, [applications, viewItem]);

  const packageApplication = useMemo(() => {
    if (!packageSheetAppId) return null;
    return applications.find((a) => a.id === packageSheetAppId) ?? null;
  }, [packageSheetAppId, applications]);

  const sendApplication = useMemo(() => {
    if (!sendOutreachAppId) return null;
    return applications.find((a) => a.id === sendOutreachAppId) ?? null;
  }, [sendOutreachAppId, applications]);

  const deleteApplication = useMemo(() => {
    if (!deleteConfirmAppId) return null;
    return applications.find((a) => a.id === deleteConfirmAppId) ?? null;
  }, [deleteConfirmAppId, applications]);

  const materialPreviewApplication = useMemo(() => {
    if (!materialPreview) return null;
    return applications.find((a) => a.id === materialPreview.applicationId) ?? null;
  }, [materialPreview, applications]);

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
      const item = applications.find((a) => a.id === id);
      if (item) showView(item);
    },
    [applications, showView, closeView]
  );

  const containerRef = useRef<HTMLUListElement | null>(null);
  const { handleNext, handlePrev } = useItemsNavigation({
    items: filtered,
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
            <>
              <Group>
                <Button
                  type="button"
                  size="sm"
                  variant={view === "board" ? "default" : "outline"}
                  onClick={() => {
                    setView("board");
                  }}
                >
                  <LayoutGridIcon />
                  Board
                </Button>
                <GroupSeparator />
                <Button
                  type="button"
                  size="sm"
                  variant={view === "list" ? "default" : "outline"}
                  onClick={() => setView("list")}
                >
                  <ListIcon />
                  List
                </Button>
              </Group>
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
            </>
          }
        />

        <div className="flex min-h-0 flex-1 flex-col">
          {listQuery.isLoading && view === "board" ? (
            <AiLoader />
          ) : view === "board" ? (
            <ApplicationsBoard applications={applications} />
          ) : (
            <ApplicationsList
              applications={applications}
              isLoading={listQuery.isLoading}
              listRef={containerRef}
            />
          )}
        </div>

        <Suspense fallback={null}>
          <ItemsInspectHost
            open={isAnyOpen && !sheetOpen && !hostOwnsPanel}
            item={liveViewItem}
            title="Application"
            onOpenChange={(next) => {
              if (!next) closeView();
            }}
          >
            {(item) => <ApplicationInfoPanel item={item} onEdit={() => openEdit(item)} />}
          </ItemsInspectHost>

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
