import { z } from "zod";

export const EvidenceKindSchema = z.enum(["project", "experience", "stack"]);
export type EvidenceKind = z.infer<typeof EvidenceKindSchema>;

export const ProposeEvidenceChangeInputSchema = z.object({
  kind: EvidenceKindSchema,
  id: z.string().min(1).optional(),
  patch: z.record(z.string(), z.unknown()),
  currentMarkdown: z.string(),
  proposedMarkdown: z.string().min(1)
});
export type ProposeEvidenceChangeInput = z.infer<typeof ProposeEvidenceChangeInputSchema>;

export const ProposeEvidenceChangeOutputSchema = z.object({
  action: z.enum(["confirm", "cancel"]),
  kind: EvidenceKindSchema,
  id: z.string().min(1).optional()
});
export type ProposeEvidenceChangeOutput = z.infer<typeof ProposeEvidenceChangeOutputSchema>;
