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
export type NewUserJob = Omit<InferInsertModel<typeof userJob>, "id"> & { id?: string };

export type ListUnlandedInput = {
  userId: string;
  excludeUrls: string[];
  excludeJobIds: string[];
  limit: number;
  /** Restrict to rows fetched for this freehire query when present. */
  queryHash?: string;
};

/**
 * Snapshot fields refreshed on conflict; id/user/slug/firstSeenAt stay fixed.
 * `description`, `summary`, and `skills` get prefer-guards so a thin re-fetch
 * cannot degrade a rich stored row.
 */
const SNAPSHOT_COLUMNS = [
  "title",
  "companyName",
  "companySlug",
  "companyLogoUrl",
  "listingUrl",
  "location",
  "regions",
  "countries",
  "cities",
  "salaryPeriod",
  "workMode",
  "employmentType",
  "seniority",
  "experienceYearsMin",
  "salaryMin",
  "salaryMax",
  "salaryCurrency",
  "category",
  "domains",
  "postedAt",
  "reality",
  "source",
  "queryHash",
  "queryFilters"
] as const;

function colName(column: keyof typeof userJob) {
  return (userJob[column] as { name: string }).name;
}

function colSql(column: keyof typeof userJob) {
  return sql.raw(`"${colName(column)}"`);
}

/** Keep the longer value; incoming null/blank does not wipe a stored one. */
function preferLongerSnapshot(column: "description" | "summary") {
  const name = sql.raw(`"${colName(column)}"`);
  return sql`case
    when btrim(coalesce(excluded.${name}, '')) = '' then user_job.${name}
    when length(excluded.${name}) >= length(user_job.${name}) then excluded.${name}
    else user_job.${name}
  end`;
}

/** Keep stored skills when the incoming payload did not state any. */
function preferStoredSkills() {
  const name = colSql("skills");
  return sql`case when coalesce(excluded.${name}, '[]'::jsonb) = '[]'::jsonb then user_job.${name} else excluded.${name} end`;
}

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
   * keeps its original value. Incoming null/blank description/summary keeps
   * the stored value (longer wins otherwise), and empty incoming skills keep
   * stored skills. Audit timestamps always come from the DB. Returns the
   * number of rows written.
   */
  async upsertMany(userId: string, rows: NewUserJob[]): Promise<number> {
    if (rows.length === 0) return 0;

    const inserted = await getDb()
      .insert(userJob)
      .values(
        rows.map((row) => {
          const { firstSeenAt: _firstSeenAt, lastSeenAt: _lastSeenAt, ...snapshot } = row;
          return {
            ...snapshot,
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
          description: preferLongerSnapshot("description"),
          summary: preferLongerSnapshot("summary"),
          skills: preferStoredSkills(),
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
