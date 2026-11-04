import { DiscoveryRunSchema, type DiscoveryRun } from "@tsu-stack/core";
import { type JobDiscoveryRunEntity } from "@tsu-stack/db";

export function toDiscoveryRun(row: JobDiscoveryRunEntity): DiscoveryRun {
  const outcomes = Object.values(row.candidates);
  return DiscoveryRunSchema.parse({
    runId: row.runId,
    stage: row.stage,
    reason: row.reason,
    fetched: row.fetched,
    pending: outcomes.filter((v) => v === "pending").length,
    evaluated: outcomes.filter((v) => v !== "pending").length,
    added: outcomes.filter((v) => v === "passed" || v === "heuristic").length,
    rejected: outcomes.filter((v) => v === "dismissed" || v === "skipped").length,
    warnings: row.warnings,
    scheduledAt: row.scheduledAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    retryAt: row.retryAt?.toISOString() ?? null
  });
}
