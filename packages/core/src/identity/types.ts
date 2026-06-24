import { z } from "zod";

import {
  facetKeySchema,
  portfolioIdentitySourceSchema,
  type FacetKey
} from "#@/identity/constants";

// Per spec §"Identity data layer / Facets (v1 set)"

export const HeadlineSchema = z.object({
  oneLiner: z.string().min(1).max(160),
  valueProps: z.array(z.string().min(1).max(140)).min(1).max(8)
});
export type Headline = z.infer<typeof HeadlineSchema>;

export const BioSchema = z.object({
  short: z.string().min(1).max(160),
  long: z.string().min(1).max(2000)
});
export type Bio = z.infer<typeof BioSchema>;

export const FocusLogItemSchema = z.object({
  title: z.string().min(1).max(140),
  body: z.string().min(1).max(1000),
  startedAt: z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM")
});
export type FocusLogItem = z.infer<typeof FocusLogItemSchema>;

export const FocusLogSchema = z.object({
  items: z.array(FocusLogItemSchema)
});
export type FocusLog = z.infer<typeof FocusLogSchema>;

export const NarrativeSchema = z.object({
  text: z.string().min(1).max(5000)
});
export type Narrative = z.infer<typeof NarrativeSchema>;

export const FACET_SCHEMAS: Readonly<Record<FacetKey, z.ZodType>> = {
  headline: HeadlineSchema,
  bio: BioSchema,
  focus_log: FocusLogSchema,
  narrative: NarrativeSchema
};

export type FacetValueByKey = {
  headline: Headline;
  bio: Bio;
  focus_log: FocusLog;
  narrative: Narrative;
};

export type FacetValue = FacetValueByKey[FacetKey];

export const IdentityFacetSchema = z.object({
  key: facetKeySchema,
  // Refined per-key by FACET_SCHEMAS at write time; rows coming back from the
  // DB have already been validated, so z.unknown() is safe at the boundary.
  value: z.unknown(),
  version: z.number().int().min(1),
  source: portfolioIdentitySourceSchema,
  sourceRef: z.string().nullable(),
  reason: z.string(),
  updatedBy: z.string(),
  updatedAt: z.coerce.date()
});
export type IdentityFacet = z.infer<typeof IdentityFacetSchema>;

export const IdentityRevisionSchema = z.object({
  id: z.uuid(),
  facetKey: facetKeySchema,
  version: z.number().int().min(1),
  // Refined per-key by FACET_SCHEMAS at write time (see IdentityFacetSchema).
  value: z.unknown(),
  source: portfolioIdentitySourceSchema,
  sourceRef: z.string().nullable(),
  reason: z.string(),
  actor: z.string(),
  createdAt: z.coerce.date()
});
export type IdentityRevision = z.infer<typeof IdentityRevisionSchema>;
