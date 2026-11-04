import { preferenceQueryHash, type JobPreferenceOutput } from "@tsu-stack/core";
import { userJobRepository } from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

import { searchFreehireJobs } from "#@/lib/job-discovery/freehire/client";
import { toUserJobRow } from "#@/lib/job-discovery/freehire/map";
import { buildFreehireQuery } from "#@/lib/job-discovery/freehire/query-builder";

import { FreehireError } from "./freehire/errors";

export type FetchUserJobsResult = {
  ok: true;
  total: number;
  fetchedCount: number;
  /** Snapshot hash scopes fetched rows to their filters and discovery run. */
  hash: string;
};

const OPERATION = "api__job_discovery_fetch_user_jobs";

/**
 * One per-user freehire fetch: build the validated query → search → map →
 * upsert `user_job`. Any throw keeps the previous shelf and propagates to the queue for retry.
 */
export async function fetchUserJobs(input: {
  userId: string;
  preference: JobPreferenceOutput;
  runId?: string;
}): Promise<FetchUserJobsResult> {
  const log = createLogger({ operation: OPERATION, userId: input.userId });
  try {
    const query = await buildFreehireQuery(input.preference);
    if (query.dropped.length > 0) {
      throw new FreehireError(
        "Some saved search filters are no longer supported. Review Job preferences.",
        false
      );
    }
    const snapshotHash = input.runId
      ? await preferenceQueryHash({ ...query.filters, discoveryRunId: input.runId })
      : query.hash;
    const result = await searchFreehireJobs(query.params);
    const rows = result.jobs.map((job) =>
      toUserJobRow(job, {
        userId: input.userId,
        queryHash: snapshotHash,
        queryFilters: query.filters
      })
    );
    const upserted = await userJobRepository.upsertMany(input.userId, rows);
    log.set({
      event: "job_discovery_fetch_completed",
      total: result.total,
      upserted,
      queryHash: snapshotHash,
      droppedFacets: query.dropped
    });
    log.emit();
    return { ok: true, total: result.total, fetchedCount: result.jobs.length, hash: snapshotHash };
  } catch (error) {
    log.error(error instanceof Error ? error : new Error(String(error)), {
      event: "job_discovery_fetch_failed"
    });
    log.emit({ _forceKeep: true });
    throw error;
  }
}
