import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  notExists,
  notInArray,
  type InferSelectModel
} from "drizzle-orm";

import { getDb } from "../index.ts";
import { application } from "../schema/application.schema.ts";
import { jobPosting } from "../schema/job-posting.schema.ts";

export type JobPostingEntity = InferSelectModel<typeof jobPosting>;

export type UpsertJobPostingInput = {
  adapterId: string;
  externalId: string;
  listingUrl: string;
  title: string;
  companyName: string;
  location?: string | null;
  workMode?: string | null;
  hiringRegion?: string | null;
  employmentType?: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  skills: string[];
  description: string | null;
  sourcePlatform: string | null;
  contentHash: string;
  postedAt: Date | null;
  raw?: unknown;
  companyId?: string | null;
  experienceYearsMin?: number | null;
  companyLogoUrl?: string | null;
};

export type ListOpenForLandInput = {
  excludeUrls: string[];
  excludePostingIds: string[];
  /** Callers score a large unseen shelf (v1 up to 400). */
  limit?: number;
};

const DEFAULT_OPEN_FOR_LAND_LIMIT = 400;

/** Keep stored skills when the incoming adapter payload did not state any. */
export function preferCatalogSkills(
  incoming: readonly string[] | null | undefined,
  stored: readonly string[] | null | undefined
): string[] {
  const next = incoming?.filter((skill) => skill.trim().length > 0) ?? [];
  const prev = stored?.filter((skill) => skill.trim().length > 0) ?? [];
  if (next.length === 0 && prev.length > 0) return [...prev];
  return [...next];
}

/** Keep the longer JD; incoming null/blank does not wipe a stored description. */
export function preferLongerJobDescription(
  incoming: string | null | undefined,
  stored: string | null | undefined
): string | null {
  const next = incoming?.trim() ?? "";
  const prev = stored?.trim() ?? "";
  if (next.length === 0) return stored ?? null;
  if (next.length >= prev.length) return incoming ?? next;
  return stored ?? prev;
}

export const jobPostingRepository = {
  /**
   * Idempotent catalog write on `(adapterId, externalId)`.
   * Unchanged `contentHash` only bumps `lastSeenAt`. Never replaces a longer
   * stored JD with a shorter incoming one (null/blank incoming keeps stored).
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
          location: input.location ?? null,
          workMode: input.workMode ?? null,
          hiringRegion: input.hiringRegion ?? null,
          employmentType: input.employmentType ?? null,
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
          raw: input.raw ?? null,
          ...(input.companyId !== undefined ? { companyId: input.companyId } : {}),
          ...(input.experienceYearsMin !== undefined
            ? { experienceYearsMin: input.experienceYearsMin }
            : {}),
          ...(input.companyLogoUrl !== undefined ? { companyLogoUrl: input.companyLogoUrl } : {})
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

    if (current.closedAt != null) {
      return { row: current, changed: false };
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
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.workMode !== undefined ? { workMode: input.workMode } : {}),
        ...(input.hiringRegion !== undefined ? { hiringRegion: input.hiringRegion } : {}),
        ...(input.employmentType !== undefined ? { employmentType: input.employmentType } : {}),
        salaryMin: input.salaryMin,
        salaryMax: input.salaryMax,
        salaryCurrency: input.salaryCurrency,
        skills: preferCatalogSkills(input.skills, current.skills),
        description: preferLongerJobDescription(input.description, current.description),
        sourcePlatform: input.sourcePlatform,
        contentHash: input.contentHash,
        postedAt: input.postedAt,
        lastSeenAt: now,
        ...(input.raw !== undefined ? { raw: input.raw } : {}),
        ...(input.companyId !== undefined ? { companyId: input.companyId } : {}),
        ...(input.experienceYearsMin !== undefined
          ? { experienceYearsMin: input.experienceYearsMin }
          : {}),
        ...(input.companyLogoUrl !== undefined ? { companyLogoUrl: input.companyLogoUrl } : {})
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

  /** Batch load by id — includes closed postings (unlike findOpenByIds). */
  async findByIds(ids: string[]): Promise<JobPostingEntity[]> {
    if (ids.length === 0) return [];
    return getDb().select().from(jobPosting).where(inArray(jobPosting.id, ids));
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

  /**
   * Fill stated HTTP/ATS catalog fields. Only provided keys are written.
   * Callers must omit a key to leave the stored value untouched.
   */
  async patchStatedFields(
    id: string,
    patch: {
      description?: string;
      contentHash?: string;
      location?: string;
      workMode?: string;
      hiringRegion?: string;
      employmentType?: string;
      skills?: string[];
    }
  ): Promise<JobPostingEntity | null> {
    const set: {
      description?: string;
      contentHash?: string;
      location?: string;
      workMode?: string;
      hiringRegion?: string;
      employmentType?: string;
      skills?: string[];
    } = {};
    if (patch.description !== undefined) set.description = patch.description;
    if (patch.contentHash !== undefined) set.contentHash = patch.contentHash;
    if (patch.location !== undefined) set.location = patch.location;
    if (patch.workMode !== undefined) set.workMode = patch.workMode;
    if (patch.hiringRegion !== undefined) set.hiringRegion = patch.hiringRegion;
    if (patch.employmentType !== undefined) set.employmentType = patch.employmentType;
    if (patch.skills !== undefined) set.skills = patch.skills;
    if (Object.keys(set).length === 0) return this.findById(id);

    const [row] = await getDb()
      .update(jobPosting)
      .set(set)
      .where(eq(jobPosting.id, id))
      .returning();
    return row ?? null;
  },

  async setDescription(
    id: string,
    description: string,
    contentHash?: string
  ): Promise<JobPostingEntity | null> {
    const [row] = await getDb()
      .update(jobPosting)
      .set({
        description,
        ...(contentHash != null ? { contentHash } : {})
      })
      .where(eq(jobPosting.id, id))
      .returning();
    return row ?? null;
  },

  async markClosed(
    id: string,
    closedAt: Date,
    closedReason: string
  ): Promise<JobPostingEntity | null> {
    const [row] = await getDb()
      .update(jobPosting)
      .set({ closedAt, closedReason })
      .where(eq(jobPosting.id, id))
      .returning();
    return row ?? null;
  },

  /**
   * Delete pantry rows closed longer than `olderThanMs` that no application
   * still references. Tracked history keeps `postingId` set-null as a backstop.
   */
  async deleteClosedUnreferenced(
    now = new Date(),
    olderThanMs = 90 * 24 * 60 * 60 * 1000
  ): Promise<number> {
    const cutoff = new Date(now.getTime() - olderThanMs);
    const referenced = getDb()
      .select({ id: application.id })
      .from(application)
      .where(eq(application.postingId, jobPosting.id));
    const deleted = await getDb()
      .delete(jobPosting)
      .where(
        and(isNotNull(jobPosting.closedAt), lt(jobPosting.closedAt, cutoff), notExists(referenced))
      )
      .returning({ id: jobPosting.id });
    return deleted.length;
  }
};
