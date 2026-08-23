import { type QueryClient } from "@tanstack/react-query";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { ApplyPackageDraftSchema, type ApplicationOutput } from "@tsu-stack/core";

import {
  completeAiJobIsland,
  createDetachedJobController,
  dismissAiJobIsland,
  isAbortError,
  patchAiJobIsland,
  upsertAiJobIsland,
  type AiIslandStep
} from "@/shared/lib/ai-job";
import { invalidateApplicationsListQueries } from "@/shared/lib/invalidate-applications-list";

const BATCH_PACKAGE_ISLAND_ID = "batch-generate-packages";

export type BatchGeneratePackageLabel = {
  id: string;
  title?: string;
  companyName?: string;
};

const jobController = createDetachedJobController({
  cancelRemoteRun: () => undefined
});

function jobLabel(row: BatchGeneratePackageLabel): string {
  const company = row.companyName?.trim() ?? "";
  const title = row.title?.trim() ?? "";
  if (company && title) return `${title} · ${company}`;
  return company || title || row.id;
}

/** Draft or accepted kit materials — skip regenerate on Confirm. */
function hasExistingDraft(app: ApplicationOutput | null | undefined): boolean {
  if (!app) return false;
  if (ApplyPackageDraftSchema.safeParse(app.applyPackageDraft).success) return true;
  if (app.resumeId || app.coverLetterR2Key || app.coverLetterBody || app.outreachBody) {
    return true;
  }
  return false;
}

function setStepState(
  steps: AiIslandStep[],
  id: string,
  state: AiIslandStep["state"],
  label?: string
): AiIslandStep[] {
  return steps.map((step) => {
    if (step.id !== id) return step;
    return {
      ...step,
      state,
      ...(label != null ? { label } : {})
    };
  });
}

export function cancelBatchGeneratePackagesJob(): void {
  jobController.cancel(null);
  dismissAiJobIsland(BATCH_PACKAGE_ISLAND_ID);
}

/**
 * Confirm already completed the HITL card. Run generates in the AI island —
 * one step per job; mark ready immediately when a draft already exists.
 */
export function startBatchGeneratePackagesJob(
  queryClient: QueryClient,
  ids: string[],
  labels: BatchGeneratePackageLabel[] = []
): void {
  if (ids.length === 0) return;

  const labelById = new Map(labels.map((row) => [row.id, row]));
  const rows = ids.map((id) => labelById.get(id) ?? { id });

  const { generation, signal } = jobController.begin();

  const steps: AiIslandStep[] = rows.map((row, index) => {
    return {
      id: row.id,
      label: jobLabel(row),
      state: index === 0 ? "active" : "pending"
    };
  });

  upsertAiJobIsland({
    id: BATCH_PACKAGE_ISLAND_ID,
    title: `Generating ${rows.length} apply package${rows.length === 1 ? "" : "s"}…`,
    cancelLabel: "Dismiss",
    onCancel: cancelBatchGeneratePackagesJob,
    steps,
    activeStepLabel: jobLabel(rows[0]!),
    status: "running"
  });

  void (async () => {
    let ok = 0;
    let failed = 0;
    let skipped = 0;
    let nextSteps = steps;

    try {
      for (let i = 0; i < rows.length; i++) {
        if (signal.aborted || !jobController.isCurrent(generation)) return;
        const row = rows[i]!;
        const baseLabel = jobLabel(row);

        nextSteps = nextSteps.map((step, index) => {
          if (index < i) return { ...step, state: "done" as const };
          if (index === i) return { ...step, state: "active" as const, label: baseLabel };
          return { ...step, state: "pending" as const };
        });
        patchAiJobIsland(BATCH_PACKAGE_ISLAND_ID, {
          steps: nextSteps,
          activeStepLabel: baseLabel
        });

        let existing: ApplicationOutput | null = null;
        try {
          existing = await orpcClient.applications.get({ id: row.id });
        } catch {
          existing = null;
        }
        if (signal.aborted || !jobController.isCurrent(generation)) return;

        if (hasExistingDraft(existing)) {
          skipped += 1;
          nextSteps = setStepState(nextSteps, row.id, "done", `${baseLabel} · ready`);
          patchAiJobIsland(BATCH_PACKAGE_ISLAND_ID, {
            steps: nextSteps,
            activeStepLabel: `${baseLabel} · ready`
          });
          continue;
        }

        try {
          await orpcClient.applications.generateApplyPackage({ applicationId: row.id });
          if (signal.aborted || !jobController.isCurrent(generation)) return;
          ok += 1;
          nextSteps = setStepState(nextSteps, row.id, "done", `${baseLabel} · done`);
          patchAiJobIsland(BATCH_PACKAGE_ISLAND_ID, {
            steps: nextSteps,
            activeStepLabel: `${baseLabel} · done`
          });
        } catch {
          if (signal.aborted || !jobController.isCurrent(generation)) return;
          failed += 1;
          nextSteps = setStepState(nextSteps, row.id, "done", `${baseLabel} · failed`);
          patchAiJobIsland(BATCH_PACKAGE_ISLAND_ID, {
            steps: nextSteps,
            activeStepLabel: `${baseLabel} · failed`
          });
        }
      }

      if (!jobController.isCurrent(generation)) return;

      await invalidateApplicationsListQueries(queryClient);

      const parts = [
        ok > 0 ? `${ok} drafted` : null,
        skipped > 0 ? `${skipped} already ready` : null,
        failed > 0 ? `${failed} failed` : null
      ].filter(Boolean);

      completeAiJobIsland(BATCH_PACKAGE_ISLAND_ID, {
        status: failed > 0 && ok + skipped === 0 ? "error" : "success",
        resultTitle: parts.length > 0 ? parts.join(" · ") : "Packages updated",
        requiresAction: true,
        resultAction: {
          label: "Open tracked jobs",
          to: "/dashboard/tracked-jobs"
        },
        errorMessage: failed > 0 ? `${failed} package${failed === 1 ? "" : "s"} failed` : undefined
      });
    } catch (error) {
      if (isAbortError(error) || !jobController.isCurrent(generation)) return;
      completeAiJobIsland(BATCH_PACKAGE_ISLAND_ID, {
        status: "error",
        resultTitle: "Could not generate packages",
        requiresAction: true,
        errorMessage: error instanceof Error ? error.message : "Batch generate failed"
      });
    }
  })();
}
