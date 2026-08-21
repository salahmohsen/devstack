"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  formatStackTypeLabel,
  type DetectStacksResult,
  type DetectedStack,
  type StackOutput
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
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";

import { invalidateProjectsListQueries } from "@/shared/lib/invalidate-projects-list";
import { invalidateStacksListQueries } from "@/shared/lib/invalidate-stacks-list";
import { AiChangeList, type AiChangeItem, type AiChangeKindMeta } from "@/shared/ui/ai-change-list";
import { Icon } from "@/shared/ui/icon";

import {
  dismissDetectStacksJob,
  setDetectReviewOpen,
  useDetectStacksJobSelector
} from "@/features/stacks";

import { notifyDetectStacksApplied } from "@/pages/dashboard/projects/_lib/detect-stacks-form-bridge";

const confidenceVariant = (confidence: string) => {
  if (confidence === "high") return "success";
  if (confidence === "medium") return "warning";
  return "error";
};

function DetectRowCheckbox({
  id,
  title,
  checked,
  onToggle
}: {
  id: string;
  title: string;
  checked: boolean;
  onToggle: (id: string, next: boolean) => void;
}) {
  return (
    <Checkbox
      aria-label={`Select ${title}`}
      checked={checked}
      onCheckedChange={(v) => onToggle(id, !!v)}
    />
  );
}

/** Detect-scan labels: new / already in library / gone since last scan. */
const DETECT_KIND_META: Record<"added" | "modified" | "removed", AiChangeKindMeta> = {
  added: {
    symbol: "+",
    label: "New",
    className: "text-emerald-600 dark:text-emerald-400",
    surface: "bg-emerald-500/10"
  },
  modified: {
    symbol: "~",
    label: "In library",
    className: "text-amber-600 dark:text-amber-400",
    surface: "bg-amber-500/10"
  },
  removed: {
    symbol: "−",
    label: "Removed",
    className: "text-destructive",
    surface: "bg-destructive/8"
  }
};

export type UpsertedDetectedStack = {
  id: string;
  name: string;
  icon: string | null;
  type: string | null;
  description: string | null;
};

/**
 * Results-only dialog. Progress lives in the sticky toast + form button;
 * this dialog opens only when the detached job is `ready` with reviewable stacks.
 */
export function DetectStacksDialog({
  open,
  setOpen,
  onStacksSelected,
  results
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  onStacksSelected: (stacks: UpsertedDetectedStack[]) => Promise<void>;
  results: DetectStacksResult | null;
}) {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** coss AlertDialog — same discard pattern as entity forms / settings. */
  const [discardOpen, setDiscardOpen] = useState(false);

  const allStacks = useMemo(() => {
    if (!results?.detectedStacks) return [];
    return results.detectedStacks;
  }, [results]);

  const stackByPackage = useMemo(
    () => new Map(allStacks.map((s) => [s.npmPackage, s])),
    [allStacks]
  );

  // All detected stacks selected by default (new + already in library) so
  // "Add Selected" associates every finding with this project. Users can uncheck.
  // Reset selection when dialog opens or detect results change (external → UI state).
  useEffect(() => {
    if (!open) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect -- sync selection to open/results
      setRowSelection({});
      setDiscardOpen(false);
      return;
    }
    if (allStacks.length === 0) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect -- sync selection to open/results
      setRowSelection({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const stack of allStacks) {
      next[stack.npmPackage] = true;
    }
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect -- sync selection to open/results
    setRowSelection(next);
  }, [open, allStacks]);

  const selectableIds = useMemo(() => allStacks.map((s) => s.npmPackage), [allStacks]);

  const selectedCount = useMemo(
    () => selectableIds.filter((id) => rowSelection[id]).length,
    [selectableIds, rowSelection]
  );

  const baseDetectItems = useMemo(() => {
    const items: Array<{
      id: string;
      kind: "added" | "modified" | "removed";
      title: string;
      summary?: string;
      reason?: string;
      leading?: ReactNode;
      badges?: ReactNode;
      details?: ReactNode;
      searchText?: string;
      selectable: boolean;
      stack?: DetectedStack;
    }> = [];

    for (const stack of allStacks) {
      const related = stack.relatedPackages ?? [];
      const firstRelated = related.slice(0, 6);
      const moreRelated = related.length - firstRelated.length;

      items.push({
        id: stack.npmPackage,
        kind: stack.exists ? "modified" : "added",
        title: stack.name,
        summary: stack.npmPackage,
        // Description only in details (AiChangeList also prints reason under details).
        leading: (
          <div className="flex size-7 items-center justify-center rounded-md bg-muted">
            <Icon
              icon={stack.iconSvg}
              className="size-3.5"
              fallbackToLetter
              letterClassName="size-7 text-[10px]"
            />
          </div>
        ),
        badges: (
          <>
            <Badge variant={confidenceVariant(stack.confidence)} size="sm">
              {stack.confidence}
            </Badge>
            {stack.type ? (
              <Badge variant="outline" size="sm">
                {formatStackTypeLabel(stack.type)}
              </Badge>
            ) : null}
            {stack.health?.deprecated ? (
              <Badge variant="error" size="sm">
                Deprecated
              </Badge>
            ) : null}
            {stack.exists ? (
              <Badge variant="secondary" size="sm">
                In library
              </Badge>
            ) : null}
          </>
        ),
        details: (
          <div className="space-y-2 text-xs text-muted-foreground">
            {stack.description ? <p className="text-foreground/90">{stack.description}</p> : null}
            {related.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                <span className="me-1 font-medium text-muted-foreground">Related:</span>
                {firstRelated.map((pkg) => (
                  <Badge variant="secondary" size="sm" key={pkg}>
                    {pkg}
                  </Badge>
                ))}
                {moreRelated > 0 ? (
                  <Badge variant="secondary" size="sm">
                    +{moreRelated}
                  </Badge>
                ) : null}
              </div>
            ) : null}
            {stack.health?.downloads != null ? (
              <p>npm downloads: {stack.health.downloads.toLocaleString()}</p>
            ) : null}
          </div>
        ),
        searchText: [
          stack.npmPackage,
          stack.type,
          stack.confidence,
          ...(stack.relatedPackages ?? [])
        ]
          .filter(Boolean)
          .join(" "),
        selectable: true,
        stack
      });
    }

    // Packages seen last scan but not this one — review-only (not selectable for add).
    for (const pkg of results?.diff?.removed ?? []) {
      // Skip if already shown as a detected stack row
      if (stackByPackage.has(pkg)) continue;
      items.push({
        id: `removed-${pkg}`,
        kind: "removed",
        title: pkg,
        summary: "Present in last scan, not found this time",
        reason: "Won’t be added — not detected in repositories now.",
        selectable: false
      });
    }

    return items;
  }, [allStacks, results?.diff?.removed, stackByPackage]);

  const onToggleSelect = useMemo(
    () => (id: string, next: boolean) => {
      setRowSelection((prev) => {
        return { ...prev, [id]: next };
      });
    },
    []
  );

  const detectItems: AiChangeItem[] = useMemo(
    () =>
      baseDetectItems.map((item) => {
        const base: AiChangeItem = {
          id: item.id,
          kind: item.kind,
          title: item.title,
          summary: item.summary,
          reason: item.reason,
          leading: item.leading,
          badges: item.badges,
          details: item.details,
          searchText: item.searchText
        };
        if (!item.selectable) return base;
        return {
          ...base,
          selectControl: (
            <DetectRowCheckbox
              id={item.id}
              title={item.title}
              checked={!!rowSelection[item.id]}
              onToggle={onToggleSelect}
            />
          )
        };
      }),
    [baseDetectItems, rowSelection, onToggleSelect]
  );

  const handleAddSelected = async () => {
    const selectedDetected = allStacks.filter((s) => rowSelection[s.npmPackage]);
    if (selectedDetected.length === 0 || !results) {
      toast.error("Select at least one stack to add.");
      return;
    }

    setIsSubmitting(true);

    try {
      const upserted = await orpcClient.stacks.upsertFromDetection({
        stacks: selectedDetected.map((s) => {
          return {
            npmPackage: s.npmPackage,
            name: s.name,
            type: s.type,
            description: s.description,
            confidence: s.confidence,
            iconSvg: s.iconSvg,
            relatedPackages: s.relatedPackages,
            existingStackId: s.existingStackId,
            health: s.health ?? null
          };
        })
      });

      if (upserted.length === 0) {
        toast.error("No stacks were saved. Please try again.");
      } else {
        await onStacksSelected(upserted);
        toast.success(
          `Added ${upserted.length} stack${upserted.length === 1 ? "" : "s"} to this project.`
        );
        setOpen(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add stacks.";
      toast.error(message);
    }
    setIsSubmitting(false);
  };

  const toggleAllSelectable = (next: boolean) => {
    setRowSelection((prev) => {
      const copy = { ...prev };
      for (const id of selectableIds) {
        copy[id] = next;
      }
      return copy;
    });
  };

  const hasResults = allStacks.length > 0;
  const repoCount = results?.groupedByRepo?.length ?? 0;

  const hasUnsavedSelection = selectedCount > 0 || isSubmitting;

  const requestClose = () => {
    if (hasUnsavedSelection && hasResults) {
      setDiscardOpen(true);
      return;
    }
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true);
      return;
    }
    requestClose();
  };

  const confirmDiscard = () => {
    setDiscardOpen(false);
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogPopup className="sm:max-w-2xl lg:max-w-3xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>Detect Stacks from Repositories</DialogTitle>
            <DialogDescription>
              Review detected technologies and choose which to associate with this project.
            </DialogDescription>
          </DialogHeader>

          {hasResults ? (
            <DialogPanel className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {allStacks.length} stack{allStacks.length === 1 ? "" : "s"} found across {repoCount}{" "}
                repositor{repoCount === 1 ? "y" : "ies"}. All findings are selected by default
                (including stacks already in your library); uncheck any you do not want on this
                project.
              </p>

              <AiChangeList
                title="Detected stacks"
                fromLabel="Repositories"
                toLabel="Project stack list"
                items={detectItems}
                kindMeta={DETECT_KIND_META}
                filterKinds={["added", "modified", "removed"]}
                emptyMessage="No stacks detected."
                maxHeightClassName="max-h-[min(28rem,50vh)]"
                toolbar={
                  <>
                    <span>
                      {selectedCount} of {selectableIds.length} selected
                      {results?.hasChanges
                        ? " · includes scan diff (removed packages are not selectable)"
                        : null}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="font-medium hover:text-foreground"
                        onClick={() => toggleAllSelectable(true)}
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        className="font-medium hover:text-foreground"
                        onClick={() => toggleAllSelectable(false)}
                      >
                        Clear
                      </button>
                    </div>
                  </>
                }
              />

              {results!.groupedByRepo?.length > 0 ? (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none">View by repository</summary>
                  <div className="mt-2 flex flex-col gap-2">
                    {results!.groupedByRepo.map(({ repo, stacks }) => (
                      <div
                        key={repo}
                        className="flex flex-col gap-1 rounded-lg border border-border bg-muted/50 p-3"
                      >
                        <p className="text-xs font-medium text-muted-foreground">
                          {repo.replace("https://github.com/", "")}
                        </p>
                        {stacks.map((s) => (
                          <span key={s.npmPackage} className="text-xs">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </DialogPanel>
          ) : (
            <DialogPanel>
              <div className="py-10 text-center text-sm text-muted-foreground">
                No stacks detected. Check that the selected repositories have a{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">package.json</code> at the
                root (or in a pnpm workspace).
              </div>
            </DialogPanel>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={requestClose}>
              Close
            </Button>
            {hasResults ? (
              <Button
                type="button"
                onClick={() => void handleAddSelected()}
                disabled={isSubmitting || selectedCount === 0}
              >
                {isSubmitting ? "Adding…" : `Add Selected (${selectedCount})`}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved stack selections. Close without adding them to the project?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep reviewing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Always-mounted host for detect results. Survives project form sheet unmount
 * so ready review stays available after navigation / closing the form.
 */
export function DetectStacksResultsHost() {
  const queryClient = useQueryClient();
  const dialogOpen = useDetectStacksJobSelector((s) => s.dialogOpen);
  const results = useDetectStacksJobSelector((s) => s.results);
  const projectId = useDetectStacksJobSelector((s) => s.projectId);

  return (
    <DetectStacksDialog
      open={dialogOpen}
      setOpen={(open) => {
        setDetectReviewOpen(open);
        // Closing without apply keeps ready results so Detect can reopen them.
      }}
      results={results}
      onStacksSelected={async (upserted) => {
        if (projectId) {
          // Form path: merge into open project form stackIds (user may still save other fields).
          notifyDetectStacksApplied(projectId, upserted);

          // List/menu path (and form path): always persist project↔stack links.
          // Previously only the form bridge ran, so menu detect never attached stacks.
          const project = await orpcClient.projects.get({ id: projectId });
          if (project) {
            const existingIds = (project.stacks ?? []).map((s) => s.id);
            const merged = Array.from(new Set([...existingIds, ...upserted.map((s) => s.id)]));
            await orpcClient.projects.update({
              id: projectId,
              data: { stackIds: merged }
            });
          }
        }

        // Optimistic full-catalog cache (pickers); listPage invalidates for dashboard grid.
        const listKey = orpcQueryClient.stacks.list.queryKey();
        queryClient.setQueryData<StackOutput[]>(listKey, (prev) => {
          const existing = prev ?? [];
          const byId = new Map(existing.map((s) => [s.id, s]));
          for (const s of upserted) {
            if (byId.has(s.id)) continue;
            byId.set(s.id, {
              id: s.id,
              name: s.name,
              description: s.description,
              icon: s.icon,
              type: s.type,
              healthStatus: null,
              confidence: null,
              projectCount: 0,
              sortOrder: existing.length,
              isFeatured: false,
              portfolioEntryId: null,
              includedInPortfolio: false,
              alternativeNames: [],
              dependencies: [],
              projects: [],
              updatedAt: new Date(),
              createdAt: new Date()
            });
          }
          return Array.from(byId.values());
        });

        void invalidateStacksListQueries(queryClient);
        void invalidateProjectsListQueries(queryClient);

        dismissDetectStacksJob();
      }}
    />
  );
}
