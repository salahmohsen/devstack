import {
  and,
  desc,
  eq,
  lt,
  notExists,
  notInArray,
  sql,
  type InferInsertModel,
  type InferSelectModel
} from "drizzle-orm";

import { getDb } from "../index.ts";
import { application } from "../schema/application.schema.ts";
import { userJob } from "../schema/user-job.schema.ts";

export type UserJobEntity = InferSelectModel<typeof userJob>;
export type NewUserJob = InferInsertModel<typeof userJob> & { id?: string };

export type ListUnlandedInput = {
  userId: string;
  excludeUrls: string[];
  excludeJobIds: string[];
  limit: number;
  /** Restrict to rows fetched for this freehire query when present. */
  queryHash?: string;
};

/** Snapshot fields refreshed on conflict; id/user/slug/firstSeenAt stay fixed. */
const SNAPSHOT_COLUMNS = [
  "title",
  "companyName",
  "companySlug",
  "companyLogoUrl",
  "listingUrl",
  "location",
  "workMode",
  "employmentType",
  "seniority",
  "experienceYearsMin",
  "salaryMin",
  "salaryMax",
  "salaryCurrency",
  "skills",
  "category",
  "domains",
  "summary",
  "description",
  "postedAt",
  "reality",
  "source",
  "queryHash",
  "queryFilters"
] as const;

function unlandedConditions(input: ListUnlandedInput) {
  const conditions = [eq(userJob.userId, input.userId)];
  if (input.queryHash !== undefined) {
    conditions.push(eq(userJob.queryHash, input.queryHash));
  }
  if (input.excludeUrls.length > 0) {
    conditions.push(notInArray(userJob.listingUrl, input.excludeUrls));
  }
  if (input.excludeJobIds.length > 0) {
    conditions.push(notInArray(userJob.id, input.excludeJobIds));
  }
  return conditions;
}

export const userJobRepository = {
  /**
   * Idempotent per-user staging write on `(userId, freehireSlug)`.
   * Conflicts refresh all snapshot fields plus `lastSeenAt`; `firstSeenAt`
   * keeps its original value. Returns the number of rows written.
   */
  async upsertMany(userId: string, rows: NewUserJob[]): Promise<number> {
    if (rows.length === 0) return 0;

    const inserted = await getDb()
      .insert(userJob)
      .values(
        rows.map((row) => {
          return {
            ...row,
            id: row.id ?? crypto.randomUUID(),
            userId
          };
        })
      )
      .onConflictDoUpdate({
        target: [userJob.userId, userJob.freehireSlug],
        set: {
          ...Object.fromEntries(
            SNAPSHOT_COLUMNS.map((column) => [
              column,
              sql.raw(`excluded."${userJob[column].name}"`)
            ])
          ),
          lastSeenAt: sql`now()`
        }
      })
      .returning({ id: userJob.id });

    return inserted.length;
  },

  async listUnlanded(input: ListUnlandedInput): Promise<UserJobEntity[]> {
    if (input.limit <= 0) return [];
    return getDb()
      .select()
      .from(userJob)
      .where(and(...unlandedConditions(input)))
      .orderBy(desc(userJob.lastSeenAt), desc(userJob.id))
      .limit(input.limit);
  },

  async countUnlanded(input: ListUnlandedInput): Promise<number> {
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(userJob)
      .where(and(...unlandedConditions(input)));
    return row?.count ?? 0;
  },

  /** Delete stale rows no application landed from. Returns deleted count. */
  async purgeStale(cutoff: Date): Promise<number> {
    const referenced = getDb()
      .select({ id: application.id })
      .from(application)
      .where(eq(application.jobId, userJob.id));
    const deleted = await getDb()
      .delete(userJob)
      .where(and(lt(userJob.lastSeenAt, cutoff), notExists(referenced)))
      .returning({ id: userJob.id });
    return deleted.length;
  },

  async countByUser(userId: string): Promise<number> {
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(userJob)
      .where(eq(userJob.userId, userId));
    return row?.count ?? 0;
  },

  async findById(id: string): Promise<UserJobEntity | null> {
    const [row] = await getDb().select().from(userJob).where(eq(userJob.id, id)).limit(1);
    return row ?? null;
  }
};
