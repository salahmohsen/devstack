"use client";

import { useMemo, useState } from "react";

import {
  APPLICATION_OUTCOME_LABELS,
  APPLICATION_STAGE_LABELS,
  HIRING_URGENCY_LABELS,
  isApplicationOpen,
  type ApplicationOutput
} from "@tsu-stack/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useDeleteApplicationsMutation } from "@/features/applications";

import { useApplicationStore } from "@/pages/dashboard/applications/_lib/application.slice";

type ApplicationsListProps = {
  applications: ApplicationOutput[];
};

export function ApplicationsList({ applications }: ApplicationsListProps) {
  const {
    listFilter,
    setListFilter,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    openEdit
  } = useApplicationStore();
  const deleteMutation = useDeleteApplicationsMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const filtered = useMemo(() => {
    if (listFilter === "open") return applications.filter((a) => isApplicationOpen(a.outcome));
    if (listFilter === "closed") return applications.filter((a) => !isApplicationOpen(a.outcome));
    return applications;
  }, [applications, listFilter]);

  const allSelected = filtered.length > 0 && filtered.every((a) => selectedIds.includes(a.id));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
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
        {selectedIds.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={deleteMutation.isPending}
          >
            Delete {selectedIds.length}
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => {
              if (checked) selectAll(filtered.map((a) => a.id));
              else clearSelection();
            }}
          />
          <span className="flex-1">Company / Role</span>
          <span className="w-24">Stage</span>
          <span className="w-24">Status</span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No applications in this filter.
          </div>
        ) : (
          filtered.map((app) => {
            const selected = selectedIds.includes(app.id);
            return (
              <div
                key={app.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 hover:bg-muted/30",
                  selected && "bg-muted/40"
                )}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => toggleSelect(app.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => openEdit(app)}
                >
                  <div className="truncate font-medium">{app.companyName}</div>
                  <div className="truncate text-sm text-muted-foreground">{app.title}</div>
                  {app.hiringUrgency !== "unknown" ? (
                    <span className="mt-1 inline-block text-xs text-muted-foreground">
                      {HIRING_URGENCY_LABELS[app.hiringUrgency]}
                      {app.resumeId ? " · Resume" : ""}
                    </span>
                  ) : app.resumeId ? (
                    <span className="mt-1 inline-block text-xs text-muted-foreground">
                      Resume linked
                    </span>
                  ) : null}
                </button>
                <div className="w-24">
                  <Badge variant="outline">{APPLICATION_STAGE_LABELS[app.stage]}</Badge>
                </div>
                <div className="w-24">
                  {app.outcome ? (
                    <Badge variant="secondary">{APPLICATION_OUTCOME_LABELS[app.outcome]}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Open</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.length} application
              {selectedIds.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected applications. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate(
                  { ids: selectedIds },
                  {
                    onSuccess: () => {
                      clearSelection();
                      setDeleteOpen(false);
                    }
                  }
                );
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
