import { z } from "zod";

/** Palette `search.entities` — min query length before the RPC runs. */
export const SEARCH_ENTITIES_Q_MIN = 2;

/** Max hits returned per entity type. */
export const SEARCH_ENTITIES_PER_TYPE = 8;

export const SearchEntityTypeSchema = z.enum([
  "experience",
  "project",
  "stack",
  "resume",
  "inbox_job",
  "tracked_job"
]);
export const SEARCH_ENTITY_TYPES = SearchEntityTypeSchema.options;
export type SearchEntityType = z.infer<typeof SearchEntityTypeSchema>;

export const SearchEntitiesInputSchema = z.object({
  q: z.string().trim().min(SEARCH_ENTITIES_Q_MIN).max(200),
  types: z.array(SearchEntityTypeSchema).min(1).max(SEARCH_ENTITY_TYPES.length).optional()
});
export type SearchEntitiesInput = z.infer<typeof SearchEntitiesInputSchema>;

export const SEARCH_ENTITY_ROUTES = {
  experience: { to: "/dashboard/experiences", searchKey: "experienceId" },
  project: { to: "/dashboard/projects", searchKey: "projectId" },
  stack: { to: "/dashboard/skills", searchKey: "stackId" },
  resume: { to: "/dashboard/resumes", searchKey: "resumeId" },
  inbox_job: { to: "/dashboard/new-jobs", searchKey: "applicationId" },
  tracked_job: { to: "/dashboard/tracked-jobs", searchKey: "applicationId" }
} as const satisfies Record<SearchEntityType, { to: string; searchKey: string }>;

export const SearchEntityHitSchema = z.object({
  type: SearchEntityTypeSchema,
  id: z.string().min(1),
  label: z.string(),
  sublabel: z.string().nullable(),
  to: z.string().min(1),
  search: z.record(z.string(), z.string())
});
export type SearchEntityHit = z.infer<typeof SearchEntityHitSchema>;

export const SearchEntitiesOutputSchema = z.array(SearchEntityHitSchema);
export type SearchEntitiesOutput = z.infer<typeof SearchEntitiesOutputSchema>;
