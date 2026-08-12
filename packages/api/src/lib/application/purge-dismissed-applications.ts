import {
  DISMISSED_APPLICATION_PURGE_AFTER_DAYS,
  DISMISSED_APPLICATION_PURGE_BATCH_LIMIT
} from "@tsu-stack/core";
import { applicationRepository } from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

export type PurgeDismissedApplicationsResult = {
  deleted: number;
  coverCleanupFailed: number;
  cutoff: Date;
  afterDays: number;
};

/**
 * Hard-delete dismissed applications older than {@link DISMISSED_APPLICATION_PURGE_AFTER_DAYS}.
 * Uses `updatedAt` as the soft-archive clock (dismiss/restore/edit refresh it).
 * Optional `deleteObject` cleans cover-letter objects best-effort.
 */
export async function purgeDismissedApplications(options?: {
  afterDays?: number;
  limit?: number;
  now?: Date;
  deleteObject?: (key: string) => Promise<void>;
}): Promise<PurgeDismissedApplicationsResult> {
  const log = createLogger({ operation: "api__purge_dismissed_applications" });
  const afterDays = options?.afterDays ?? DISMISSED_APPLICATION_PURGE_AFTER_DAYS;
  const limit = options?.limit ?? DISMISSED_APPLICATION_PURGE_BATCH_LIMIT;
  const now = options?.now ?? new Date();
  const cutoff = new Date(now.getTime() - afterDays * 24 * 60 * 60 * 1000);

  const deletedRows = await applicationRepository.deleteDismissedOlderThan(cutoff, limit);
  let coverCleanupFailed = 0;

  if (options?.deleteObject) {
    for (const row of deletedRows) {
      if (!row.coverLetterR2Key) continue;
      try {
        await options.deleteObject(row.coverLetterR2Key);
      } catch {
        coverCleanupFailed += 1;
      }
    }
  }

  log.set({
    event: "purge_dismissed_applications_done",
    deleted: deletedRows.length,
    coverCleanupFailed,
    afterDays,
    cutoff: cutoff.toISOString(),
    limit
  });
  log.emit();

  return {
    deleted: deletedRows.length,
    coverCleanupFailed,
    cutoff,
    afterDays
  };
}
