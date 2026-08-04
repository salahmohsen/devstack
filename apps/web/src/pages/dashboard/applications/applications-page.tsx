"use client";

import { LayoutGridIcon, ListIcon, PlusIcon } from "lucide-react";
import { useCallback, useMemo, useRef } from "react";

import { type ApplicationOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";

import { DefaultLoader } from "@/shared/ui/default-loader";

import { useListApplicationsQuery } from "@/features/applications";

import {
  isAnyOpened,
  ItemsNavProvider,
  PageHeader,
  PageLayout,
  useItemsNavigation
} from "@/widgets/items-page";
import { ItemsInfoPanel } from "@/widgets/layout";

import { useApplicationStore } from "@/pages/dashboard/applications/_lib/application.slice";
import { useApplicationsView } from "@/pages/dashboard/applications/_lib/use-applications-view";
import { ApplicationFormSheet } from "@/pages/dashboard/applications/application-form-sheet";
import { ApplicationInfoPanel } from "@/pages/dashboard/applications/ui/application-info-panel";
import { ApplyPackageSheet } from "@/pages/dashboard/applications/ui/apply-package-sheet";
import { ApplicationsBoard } from "@/pages/dashboard/applications/ui/board";
import { ApplicationsList } from "@/pages/dashboard/applications/ui/list";
import { SendOutreachDialog } from "@/pages/dashboard/applications/ui/send-outreach-dialog";

const EMPTY_APPLICATIONS: ApplicationOutput[] = [];

export function ApplicationsPage() {
  const { view, setView } = useApplicationsView();
  const listQuery = useListApplicationsQuery();
  const {
    sheetOpen,
    sheetMode,
    editItem,
    viewItem,
    openCreate,
    closeSheet,
    closeView,
    openView,
    listFilter,
    packageSheetAppId,
    closePackageSheet,
    sendOutreachAppId,
    closeSendOutreach
  } = useApplicationStore();

  // Stable empty fallback so memo deps do not thrash every render.
  const applications = listQuery.data ?? EMPTY_APPLICATIONS;

  const filtered = useMemo(() => {
    if (listFilter === "open") return applications.filter((a) => a.outcome == null);
    if (listFilter === "closed") return applications.filter((a) => a.outcome != null);
    return applications;
  }, [applications, listFilter]);

  // Keep side panel in sync with list refetches (package generate/accept/send).
  const liveViewItem = useMemo(() => {
    if (!viewItem) return null;
    return applications.find((a) => a.id === viewItem.id) ?? viewItem;
  }, [viewItem, applications]);

  const packageApplication = useMemo(() => {
    if (!packageSheetAppId) return null;
    return applications.find((a) => a.id === packageSheetAppId) ?? null;
  }, [packageSheetAppId, applications]);

  const sendApplication = useMemo(() => {
    if (!sendOutreachAppId) return null;
    return applications.find((a) => a.id === sendOutreachAppId) ?? null;
  }, [sendOutreachAppId, applications]);

  // Side panel works for both board (View / card click) and list (row click).
  const isItemOpen = useMemo(
    () => (liveViewItem ? { [liveViewItem.id]: true } : null),
    [liveViewItem]
  );
  const isAnyOpen = isAnyOpened(isItemOpen);

  const setOpenedItem = useCallback(
    (item: (typeof applications)[number] | null) => {
      if (item) openView(item);
      else closeView();
    },
    [openView, closeView]
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
      if (item) openView(item);
    },
    [applications, openView, closeView]
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
          title="Applications"
          description="Track open roles on a board or list. Closed applications stay in the list only."
          actions={
            <div className="flex items-center gap-2">
              <Group>
                <Button
                  type="button"
                  size="sm"
                  variant={view === "board" ? "default" : "outline"}
                  onClick={() => setView("board")}
                >
                  <LayoutGridIcon className="size-4" />
                  Board
                </Button>
                <GroupSeparator />
                <Button
                  type="button"
                  size="sm"
                  variant={view === "list" ? "default" : "outline"}
                  onClick={() => setView("list")}
                >
                  <ListIcon className="size-4" />
                  List
                </Button>
              </Group>
              <Button type="button" size="sm" onClick={openCreate}>
                <PlusIcon className="size-4" />
                Add application
              </Button>
            </div>
          }
        />

        <div className="flex min-h-0 flex-1 flex-col">
          {listQuery.isLoading && view === "board" ? (
            <DefaultLoader />
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

        <ItemsInfoPanel open={isAnyOpen} item={liveViewItem}>
          {(item) => <ApplicationInfoPanel item={item} />}
        </ItemsInfoPanel>

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

        <ApplyPackageSheet
          open={packageSheetAppId != null}
          application={packageApplication}
          onOpenChange={(open) => {
            if (!open) closePackageSheet();
          }}
        />

        <SendOutreachDialog
          open={sendOutreachAppId != null}
          application={sendApplication}
          onOpenChange={(open) => {
            if (!open) closeSendOutreach();
          }}
        />
      </PageLayout>
    </ItemsNavProvider>
  );
}
