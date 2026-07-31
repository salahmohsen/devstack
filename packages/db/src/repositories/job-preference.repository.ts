import { eq, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { jobPreference, type StoredWorkMode } from "../schema/job-preference.schema.ts";

export type JobPreferenceEntity = InferSelectModel<typeof jobPreference>;

export type UpsertJobPreferenceData = {
  id: string;
  userId: string;
  workModes: StoredWorkMode[];
  locations: string[];
  roleKeywords: string[];
  excludeKeywords: string[];
  salaryMin: number | null;
  salaryCurrency: string | null;
  minMatchScore: number;
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
          roleKeywords: input.roleKeywords,
          excludeKeywords: input.excludeKeywords,
          salaryMin: input.salaryMin,
          salaryCurrency: input.salaryCurrency,
          minMatchScore: input.minMatchScore,
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
        roleKeywords: input.roleKeywords,
        excludeKeywords: input.excludeKeywords,
        salaryMin: input.salaryMin,
        salaryCurrency: input.salaryCurrency,
        minMatchScore: input.minMatchScore
      })
      .returning();
    if (!row) throw new Error("Failed to insert job_preference");
    return row;
  }
};
