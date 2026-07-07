import { z } from "zod";

import { type ResumeSchemaSelect } from "@tsu-stack/db/types";

export const ResumeAuthorSchema = z.enum(["admin", "agent"]);
export type ResumeAuthor = z.infer<typeof ResumeAuthorSchema>;

export const ResumeOutputSchema = z.object({
  id: z.string(),
  prompt: z.string().nullable(),
  author: ResumeAuthorSchema,
  filename: z.string(),
  r2Key: z.string(),
  default: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
}) satisfies z.ZodType<ResumeSchemaSelect>;

export type ResumeOutput = z.infer<typeof ResumeOutputSchema>;

export const ResumeListOutputSchema = z.array(ResumeOutputSchema);
export type ResumeListOutput = z.infer<typeof ResumeListOutputSchema>;

export const SetDefaultInputSchema = z.object({
  id: z.string()
});
export type SetDefaultInput = z.infer<typeof SetDefaultInputSchema>;

export const DeleteInputSchema = z.object({
  ids: z.array(z.string())
});
export type DeleteInput = z.infer<typeof DeleteInputSchema>;
