import { z } from "zod";

import { WorkModeSchema, type WorkMode } from "#@/job-preference/types";

import { JOB_ADAPTER_IDS, type JobAdapterId } from "./constants";

export const AdapterCapabilitySchema = z.enum(["search", "feed"]);
export type AdapterCapability = z.infer<typeof AdapterCapabilitySchema>;

export const NormalizedListingSchema = z.object({
  adapterId: z.enum(JOB_ADAPTER_IDS),
  externalId: z.string().min(1),
  listingUrl: z.string().url(),
  title: z.string().min(1),
  companyName: z.string().min(1),
  location: z.string().nullable(),
  workMode: WorkModeSchema.nullable(),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  salaryCurrency: z.string().nullable(),
  skills: z.array(z.string()),
  description: z.string().nullable(),
  postedAt: z.coerce.date().nullable(),
  sourcePlatform: z.string().nullable()
});
export type NormalizedListing = z.infer<typeof NormalizedListingSchema>;

export type AdapterFetchInput = {
  q?: string;
  workMode?: WorkMode | null;
  page?: number;
  limit?: number;
};

export type JobSourceAdapter = {
  id: JobAdapterId;
  capabilities: readonly AdapterCapability[];
  fetch(input: AdapterFetchInput): Promise<NormalizedListing[]>;
};

export type CheapScoreResult = {
  /** 0–100 heuristic rank; not compared to minMatchScore. */
  score: number;
  /** false only for exclude / no title hit / garbage — eligible to land/rank. */
  passed: boolean;
  reasons: string[];
};
