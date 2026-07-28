"use client";

import { LayoutGridIcon, ListIcon, PlusIcon } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";

import { DefaultLoader } from "@/shared/ui/default-loader";

import { useListApplicationsQuery } from "@/features/applications";

import { PageHeader, PageLayout } from "@/widgets/items-page";
import { ItemsInfoPanel } from "@/widgets/layout";

import { useApplicationStore } from "@/pages/dashboard/applications/_lib/application.slice";
import { useApplicationsView } from "@/pages/dashboard/applications/_lib/use-applications-view";
import { ApplicationFormSheet } from "@/pages/dashboard/applications/application-form-sheet";
import { ApplicationInfoPanel } from "@/pages/dashboard/applications/ui/application-info-panel";
import { ApplicationsBoard } from "@/pages/dashboard/applications/ui/board";
import { ApplicationsList } from "@/pages/dashboard/applications/ui/list";

export function ApplicationsPage() {
  const { view, setView } = useApplicationsView();
  const listQuery = useListApplicationsQuery();
  const { sheetOpen, sheetMode, editItem, viewItem, openCreate, closeSheet, closeView } =
    useApplicationStore();

  const applications = listQuery.data ?? [];
  const isListView = view === "list";
  const sidePanelOpen = isListView && viewItem != null;

  return (
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
                onClick={() => {
                  closeView();
                  setView("board");
                }}
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
          <ApplicationsList applications={applications} isLoading={listQuery.isLoading} />
        )}
      </div>

      <ItemsInfoPanel open={sidePanelOpen} item={viewItem}>
        {(item) => <ApplicationInfoPanel item={item} />}
      </ItemsInfoPanel>

      <ApplicationFormSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) closeSheet();
          else if (sheetMode === "create") openCreate();
        }}
        mode={sheetMode}
        initialData={editItem}
      />
    </PageLayout>
  );
}
