import { eq, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import {
  jobPreference,
  type StoredLevelFloor,
  type StoredWorkMode
} from "../schema/job-preference.schema.ts";

export type JobPreferenceEntity = InferSelectModel<typeof jobPreference>;

export type UpsertJobPreferenceData = {
  id: string;
  userId: string;
  workModes: StoredWorkMode[];
  locations: string[];
  remoteRegions: string[];
  roleKeywords: string[];
  excludeKeywords: string[];
  salaryMin: number | null;
  salaryCurrency: string | null;
  levelFloor: StoredLevelFloor | null;
  minMatchScore: number;
  titleId: string | null;
  customTitle: string | null;
  jobsPerRun: number;
  dailyBoardScoreCap: number;
  importFromEmail: boolean;
  reviewApplyKit: boolean;
};

export const jobPreferenceRepository = {
  async findByUserId(userId: string): Promise<JobPreferenceEntity | null> {
    const [row] = await getDb()
      .select()
      .from(jobPreference)
      .where(eq(jobPreference.userId, userId))
      .limit(1);
    return row ?? null;
  },

  async upsert(input: UpsertJobPreferenceData): Promise<JobPreferenceEntity> {
    const db = getDb();
    const existing = await this.findByUserId(input.userId);

    if (existing) {
      const [row] = await db
        .update(jobPreference)
        .set({
          workModes: input.workModes,
          locations: input.locations,
          remoteRegions: input.remoteRegions,
          roleKeywords: input.roleKeywords,
          excludeKeywords: input.excludeKeywords,
          salaryMin: input.salaryMin,
          salaryCurrency: input.salaryCurrency,
          levelFloor: input.levelFloor,
          minMatchScore: input.minMatchScore,
          titleId: input.titleId,
          customTitle: input.customTitle,
          jobsPerRun: input.jobsPerRun,
          dailyBoardScoreCap: input.dailyBoardScoreCap,
          importFromEmail: input.importFromEmail,
          reviewApplyKit: input.reviewApplyKit,
          updatedAt: new Date()
        })
        .where(eq(jobPreference.userId, input.userId))
        .returning();
      if (!row) throw new Error("Failed to update job_preference");
      return row;
    }

    const [row] = await db
      .insert(jobPreference)
      .values({
        id: input.id,
        userId: input.userId,
        workModes: input.workModes,
        locations: input.locations,
        remoteRegions: input.remoteRegions,
        roleKeywords: input.roleKeywords,
        excludeKeywords: input.excludeKeywords,
        salaryMin: input.salaryMin,
        salaryCurrency: input.salaryCurrency,
        levelFloor: input.levelFloor,
        minMatchScore: input.minMatchScore,
        titleId: input.titleId,
        customTitle: input.customTitle,
        jobsPerRun: input.jobsPerRun,
        dailyBoardScoreCap: input.dailyBoardScoreCap,
        importFromEmail: input.importFromEmail,
        reviewApplyKit: input.reviewApplyKit
      })
      .returning();
    if (!row) throw new Error("Failed to insert job_preference");
    return row;
  },

  /** All preference rows. Title validity is decided in core after map. */
  async listUsersWithValidTitle(): Promise<JobPreferenceEntity[]> {
    return getDb().select().from(jobPreference);
  },

  /** Null brief cache only. No-op when the user has no preference row. */
  async clearSearchBrief(userId: string, previousMarkdown?: string | null): Promise<void> {
    const existing = await this.findByUserId(userId);
    if (!existing) return;

    const previous =
      previousMarkdown !== undefined
        ? previousMarkdown
        : (existing.searchBriefMarkdown ?? existing.searchBriefPreviousMarkdown);
    const [row] = await getDb()
      .update(jobPreference)
      .set({
        searchBriefPreviousMarkdown: previous,
        searchBriefMarkdown: null,
        searchBriefHash: null,
        searchBriefBuiltAt: null,
        updatedAt: new Date()
      })
      .where(eq(jobPreference.userId, userId))
      .returning({ id: jobPreference.id });
    if (!row) throw new Error("Failed to clear job_preference search brief");
  },

  async saveSearchBrief(
    userId: string,
    data: { markdown: string; hash: string; builtAt: Date }
  ): Promise<boolean> {
    const existing = await this.findByUserId(userId);
    if (!existing) return false;

    const [row] = await getDb()
      .update(jobPreference)
      .set({
        searchBriefMarkdown: data.markdown,
        searchBriefHash: data.hash,
        searchBriefBuiltAt: data.builtAt,
        updatedAt: new Date()
      })
      .where(eq(jobPreference.userId, userId))
      .returning({ id: jobPreference.id });
    if (!row) throw new Error("Failed to save job_preference search brief");
    return true;
  }
};
