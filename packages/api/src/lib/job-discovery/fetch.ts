import { type JobPreferenceOutput } from "@tsu-stack/core";
import { userJobRepository } from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

import { searchFreehireJobs } from "#@/lib/job-discovery/freehire/client";
import { toUserJobRow } from "#@/lib/job-discovery/freehire/map";
import { buildFreehireQuery } from "#@/lib/job-discovery/freehire/query-builder";

export type FetchUserJobsResult = {
  ok: boolean;
  total?: number;
  /** Hash of the filter set the rows were fetched with (when ok). */
  hash?: string;
};

const OPERATION = "api__job_discovery_fetch_user_jobs";

/**
 * One per-user freehire fetch: build the validated query → search → map →
 * upsert `user_job`. Fail soft — any throw keeps the previous shelf, no retry.
 */
export async function fetchUserJobs(input: {
  userId: string;
  preference: JobPreferenceOutput;
}): Promise<FetchUserJobsResult> {
  const log = createLogger({ operation: OPERATION, userId: input.userId });
  try {
    const query = await buildFreehireQuery(input.preference);
    const result = await searchFreehireJobs(query.params);
    const rows = result.jobs.map((job) =>
      toUserJobRow(job, {
        userId: input.userId,
        queryHash: query.hash,
        queryFilters: query.filters
      })
    );
    const upserted = await userJobRepository.upsertMany(input.userId, rows);
    log.set({
      event: "job_discovery_fetch_completed",
      total: result.total,
      upserted,
      queryHash: query.hash,
      droppedFacets: query.dropped
    });
    log.emit();
    return { ok: true, total: result.total, hash: query.hash };
  } catch (error) {
    log.error(error instanceof Error ? error : new Error(String(error)), {
      event: "job_discovery_fetch_failed"
    });
    log.emit({ _forceKeep: true });
    return { ok: false };
  }
}
