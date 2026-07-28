"use client";

import { Building2Icon, BriefcaseIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { useMemo } from "react";

import { isApplicationOpen, type ApplicationOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Tabs, TabsList, TabsTrigger } from "@tsu-stack/ui/components/tabs";

import { ListItem } from "@/shared/ui/list-item";

import {
  ApplicationStageBadge,
  ApplicationStatusBadge,
  useDeleteApplicationsMutation
} from "@/features/applications";

import { ItemsEmpty, ListSkeleton } from "@/widgets/items-page";

import { useApplicationStore } from "@/pages/dashboard/applications/_lib/application.slice";

const LIST_FILTERS = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" }
] as const;

type ApplicationsListProps = {
  applications: ApplicationOutput[];
  isLoading?: boolean;
  listRef?: React.RefObject<HTMLUListElement | null>;
};

export function ApplicationsList({ applications, isLoading, listRef }: ApplicationsListProps) {
  const {
    listFilter,
    setListFilter,
    selectedIds,
    toggleSelect,
    openView,
    openEdit,
    openCreate,
    viewItem
  } = useApplicationStore();
  const deleteMutation = useDeleteApplicationsMutation();

  const filtered = useMemo(() => {
    if (listFilter === "open") return applications.filter((a) => isApplicationOpen(a.outcome));
    if (listFilter === "closed") return applications.filter((a) => !isApplicationOpen(a.outcome));
    return applications;
  }, [applications, listFilter]);

  if (isLoading) return <ListSkeleton />;

  if (applications.length === 0) {
    return (
      <ItemsEmpty
        icon={<BriefcaseIcon aria-hidden />}
        title="No applications yet"
        description="Add a job to track it on the board or list."
        action={
          <Button type="button" onClick={openCreate}>
            <PlusIcon aria-hidden />
            Add application
          </Button>
        }
      />
    );
  }

  return (
    <Tabs
      value={listFilter}
      onValueChange={(value) => {
        if (value === "open" || value === "closed" || value === "all") {
          setListFilter(value);
        }
      }}
      className="flex min-h-0 flex-1 flex-col gap-3"
    >
      <TabsList>
        {LIST_FILTERS.map((filter) => (
          <TabsTrigger key={filter.value} value={filter.value}>
            {filter.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {filtered.length === 0 ? (
        <ItemsEmpty
          icon={<BriefcaseIcon aria-hidden />}
          title={
            listFilter === "open"
              ? "No open applications"
              : listFilter === "closed"
                ? "No closed applications"
                : "No applications"
          }
          description={
            listFilter === "open"
              ? "Everything is closed, or you have not added any open roles yet."
              : listFilter === "closed"
                ? "Close an application from the board or list when a role wraps up."
                : "Add a job to start tracking your pipeline."
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {listFilter !== "all" ? (
                <Button type="button" variant="outline" onClick={() => setListFilter("all")}>
                  Show all
                </Button>
              ) : null}
              <Button type="button" onClick={openCreate}>
                <PlusIcon aria-hidden />
                Add application
              </Button>
            </div>
          }
        />
      ) : (
        // flex-1 + min-h-0: fill remaining viewport; overflow only when content exceeds it.
        // overflow-x-clip + light py: ListItem hover/selected scale should not spawn a scroller.
        <ul ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-x-clip overflow-y-auto py-1">
          {filtered.map((app) => {
            const selected = viewItem?.id === app.id;
            const batchSelected = selectedIds.includes(app.id);
            return (
              <ListItem
                key={app.id}
                selected={selected}
                onSelect={() => openView(app)}
                isBatchSelected={batchSelected}
                onToggleSelect={() => toggleSelect(app.id)}
                onEdit={() => openEdit(app)}
                onDelete={() => deleteMutation.mutate({ ids: [app.id] })}
                isDeleting={deleteMutation.isPending}
                deleteTitle="Delete this application?"
                deleteDescription="This permanently removes the application from your pipeline."
                title={app.title}
                titleEnd={
                  <span className="flex shrink-0 items-center gap-1.5">
                    <ApplicationStageBadge stage={app.stage} />
                    {app.outcome ? <ApplicationStatusBadge outcome={app.outcome} /> : null}
                  </span>
                }
                meta={
                  <>
                    <p className="flex items-center gap-1">
                      <Building2Icon size={14} />
                      <span>{app.companyName}</span>
                    </p>
                    {app.location ? (
                      <p className="flex items-center gap-1">
                        <MapPinIcon size={14} />
                        <span>{app.location}</span>
                      </p>
                    ) : null}
                  </>
                }
              />
            );
          })}
        </ul>
      )}
    </Tabs>
  );
}
