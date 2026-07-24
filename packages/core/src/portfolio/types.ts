import { z } from "zod";

import { ExperiencePublicOutputSchema } from "#@/experience/types";
import { contactOutputSchema } from "#@/profile/index";
import { ProjectPublicOutputSchema } from "#@/project/index";
import { StackOutputSchema } from "#@/stack/types";

export const PortfolioEntryTypeSchema = z.enum(["experience", "project", "stack", "contact"]);
export type PortfolioEntryType = z.infer<typeof PortfolioEntryTypeSchema>;

export const PortfolioEntryOutputSchema = z.object({
  id: z.string().describe("Unique portfolio entry ID"),
  type: PortfolioEntryTypeSchema.describe("Entity type this entry belongs to"),
  entityId: z.string().describe("ID of the entity (experience/project/stack/contact)"),
  createdAt: z.date().describe("When the entry was added to portfolio"),
  updatedAt: z.date().describe("Last update timestamp")
});
export type PortfolioEntryOutput = z.infer<typeof PortfolioEntryOutputSchema>;

export const PortfolioEntryListOutputSchema = z.object({
  experiences: z.array(z.object({ entryId: z.string(), id: z.string() })),
  projects: z.array(z.object({ entryId: z.string(), id: z.string() })),
  stacks: z.array(z.object({ entryId: z.string(), id: z.string() })),
  contacts: z.array(z.object({ entryId: z.string(), userId: z.string(), type: z.string() }))
});
export type PortfolioEntryListOutput = z.infer<typeof PortfolioEntryListOutputSchema>;

export const PortfolioToggleInputSchema = z.object({
  type: PortfolioEntryTypeSchema.describe("Entity type to toggle portfolio inclusion for"),
  entityId: z.string().min(1).describe("ID of the entity to include or exclude"),
  included: z.boolean().describe("`true` to add to portfolio, `false` to remove")
});
export type PortfolioToggleInput = z.infer<typeof PortfolioToggleInputSchema>;

export const PortfolioToggleOutputSchema = z.object({
  included: z.boolean().describe("Whether the entity is now included in portfolio"),
  entry: PortfolioEntryOutputSchema.nullable().describe(
    "Created portfolio entry, or null if removed"
  )
});
export type PortfolioToggleOutput = z.infer<typeof PortfolioToggleOutputSchema>;

export const PortfolioListInputSchema = z.object({
  filter: z.string().optional().describe("RSQL filter string, e.g. `type==experience;year>=2024`"),
  paginated: z.boolean().optional().default(false).describe("Enable cursor-based pagination"),
  cursor: z.string().optional().describe("Cursor from previous response (opaque)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe("Max items per entity type (1-100)")
});
export type PortfolioListInput = z.infer<typeof PortfolioListInputSchema>;

export const PortfolioListOutputSchema = z.object({
  experiences: z
    .array(ExperiencePublicOutputSchema)
    .describe("Full experience objects with nested projects and stacks (public-safe)"),
  projects: z
    .array(ProjectPublicOutputSchema)
    .describe("Full project objects with nested stacks (public-safe)"),
  stacks: z.array(StackOutputSchema).describe("Full stack objects"),
  contacts: z.array(contactOutputSchema).describe("Full contact objects"),
  nextCursor: z.string().nullable().describe("Cursor for next page, null if last page")
});
export type PortfolioListOutput = z.infer<typeof PortfolioListOutputSchema>;
