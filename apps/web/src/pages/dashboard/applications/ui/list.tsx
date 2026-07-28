"use client";

import { Building2Icon, MapPinIcon } from "lucide-react";
import { useMemo } from "react";

import {
  APPLICATION_OUTCOME_LABELS,
  APPLICATION_STAGE_LABELS,
  isApplicationOpen,
  type ApplicationOutput
} from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";

import { ListItem } from "@/shared/ui/list-item";

import { useDeleteApplicationsMutation } from "@/features/applications";

import { ItemsEmpty, ListSkeleton } from "@/widgets/items-page";

import { useApplicationStore } from "@/pages/dashboard/applications/_lib/application.slice";

type ApplicationsListProps = {
  applications: ApplicationOutput[];
  isLoading?: boolean;
  listRef?: React.RefObject<HTMLUListElement | null>;
};

export function ApplicationsList({ applications, isLoading, listRef }: ApplicationsListProps) {
  const { listFilter, setListFilter, selectedIds, toggleSelect, openView, openEdit, viewItem } =
    useApplicationStore();
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
        title="No applications yet"
        description="Add a job to track it on the board or list."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        {(["open", "closed", "all"] as const).map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={listFilter === f ? "default" : "outline"}
            onClick={() => setListFilter(f)}
          >
            {f === "open" ? "Open" : f === "closed" ? "Closed" : "All"}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No applications in this filter.
        </p>
      ) : (
        <ul ref={listRef} className="space-y-2">
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
                    <Badge variant="outline" className="font-normal">
                      {APPLICATION_STAGE_LABELS[app.stage]}
                    </Badge>
                    {app.outcome ? (
                      <Badge variant="secondary" className="font-normal">
                        {APPLICATION_OUTCOME_LABELS[app.outcome]}
                      </Badge>
                    ) : null}
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
    </div>
  );
}
