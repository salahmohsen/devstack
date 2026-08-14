import { and, desc, eq, inArray, isNull, notInArray, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { jobPosting } from "../schema/job-posting.schema.ts";

export type JobPostingEntity = InferSelectModel<typeof jobPosting>;

export type UpsertJobPostingInput = {
  adapterId: string;
  externalId: string;
  listingUrl: string;
  title: string;
  companyName: string;
  location: string | null;
  workMode: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  skills: string[];
  description: string | null;
  sourcePlatform: string | null;
  contentHash: string;
  postedAt: Date | null;
  raw?: unknown;
};

export type ListOpenForLandInput = {
  excludeUrls: string[];
  excludePostingIds: string[];
  /** Callers score a large unseen shelf (v1 up to 400). */
  limit?: number;
};

const DEFAULT_OPEN_FOR_LAND_LIMIT = 400;

export const jobPostingRepository = {
  /**
   * Idempotent catalog write on `(adapterId, externalId)`.
   * Unchanged `contentHash` only bumps `lastSeenAt`. Incoming null description
   * does not wipe a stored JD.
   */
  async upsert(input: UpsertJobPostingInput): Promise<{ row: JobPostingEntity; changed: boolean }> {
    const now = new Date();
    const existing = await this.findByAdapterExternal(input.adapterId, input.externalId);

    if (!existing) {
      const [inserted] = await getDb()
        .insert(jobPosting)
        .values({
          id: crypto.randomUUID(),
          adapterId: input.adapterId,
          externalId: input.externalId,
          listingUrl: input.listingUrl,
          title: input.title,
          companyName: input.companyName,
          location: input.location,
          workMode: input.workMode,
          salaryMin: input.salaryMin,
          salaryMax: input.salaryMax,
          salaryCurrency: input.salaryCurrency,
          skills: input.skills,
          description: input.description,
          sourcePlatform: input.sourcePlatform,
          contentHash: input.contentHash,
          postedAt: input.postedAt,
          firstSeenAt: now,
          lastSeenAt: now,
          raw: input.raw ?? null
        })
        .onConflictDoNothing({
          target: [jobPosting.adapterId, jobPosting.externalId]
        })
        .returning();

      if (inserted) {
        return { row: inserted, changed: true };
      }
    }

    const current =
      existing ?? (await this.findByAdapterExternal(input.adapterId, input.externalId));
    if (!current) {
      throw new Error(
        `jobPosting upsert: conflict without existing row adapterId=${input.adapterId} externalId=${input.externalId}`
      );
    }

    if (current.contentHash === input.contentHash) {
      const [row] = await getDb()
        .update(jobPosting)
        .set({ lastSeenAt: now })
        .where(eq(jobPosting.id, current.id))
        .returning();
      if (!row) throw new Error("Failed to bump job_posting.last_seen_at");
      return { row, changed: false };
    }

    const [row] = await getDb()
      .update(jobPosting)
      .set({
        listingUrl: input.listingUrl,
        title: input.title,
        companyName: input.companyName,
        location: input.location,
        workMode: input.workMode,
        salaryMin: input.salaryMin,
        salaryMax: input.salaryMax,
        salaryCurrency: input.salaryCurrency,
        skills: input.skills,
        description: input.description ?? current.description,
        sourcePlatform: input.sourcePlatform,
        contentHash: input.contentHash,
        postedAt: input.postedAt,
        lastSeenAt: now,
        ...(input.raw !== undefined ? { raw: input.raw } : {})
      })
      .where(eq(jobPosting.id, current.id))
      .returning();
    if (!row) throw new Error("Failed to update job_posting");
    return { row, changed: true };
  },

  async findById(id: string): Promise<JobPostingEntity | null> {
    const [row] = await getDb().select().from(jobPosting).where(eq(jobPosting.id, id)).limit(1);
    return row ?? null;
  },

  async findByAdapterExternal(
    adapterId: string,
    externalId: string
  ): Promise<JobPostingEntity | null> {
    const [row] = await getDb()
      .select()
      .from(jobPosting)
      .where(and(eq(jobPosting.adapterId, adapterId), eq(jobPosting.externalId, externalId)))
      .limit(1);
    return row ?? null;
  },

  async findOpenByIds(ids: string[]): Promise<JobPostingEntity[]> {
    if (ids.length === 0) return [];
    return getDb()
      .select()
      .from(jobPosting)
      .where(and(inArray(jobPosting.id, ids), isNull(jobPosting.closedAt)));
  },

  async listOpenForLand(input: ListOpenForLandInput): Promise<JobPostingEntity[]> {
    const limit = input.limit ?? DEFAULT_OPEN_FOR_LAND_LIMIT;
    if (limit <= 0) return [];

    const conditions = [isNull(jobPosting.closedAt)];
    if (input.excludeUrls.length > 0) {
      conditions.push(notInArray(jobPosting.listingUrl, input.excludeUrls));
    }
    if (input.excludePostingIds.length > 0) {
      conditions.push(notInArray(jobPosting.id, input.excludePostingIds));
    }

    return getDb()
      .select()
      .from(jobPosting)
      .where(and(...conditions))
      .orderBy(desc(jobPosting.lastSeenAt), desc(jobPosting.id))
      .limit(limit);
  },

  async setDescription(id: string, description: string): Promise<JobPostingEntity | null> {
    const [row] = await getDb()
      .update(jobPosting)
      .set({ description })
      .where(eq(jobPosting.id, id))
      .returning();
    return row ?? null;
  },

  async markClosed(id: string, closedAt: Date): Promise<JobPostingEntity | null> {
    const [row] = await getDb()
      .update(jobPosting)
      .set({ closedAt })
      .where(eq(jobPosting.id, id))
      .returning();
    return row ?? null;
  }
};
