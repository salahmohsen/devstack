import { z } from "zod";

export const EvidenceKindSchema = z.enum(["project", "experience", "stack"]);
export type EvidenceKind = z.infer<typeof EvidenceKindSchema>;

export const EvidenceChangeOpSchema = z.enum(["create", "update", "delete"]);
export type EvidenceChangeOp = z.infer<typeof EvidenceChangeOpSchema>;

export function analysisKeyInPatch(patch: Record<string, unknown>): string | undefined {
  return Object.keys(patch).find((key) => /analysis/i.test(key));
}

export const ProposeEvidenceChangeInputSchema = z
  .object({
    kind: EvidenceKindSchema,
    op: EvidenceChangeOpSchema.default("update"),
    id: z.string().min(1).optional(),
    patch: z.record(z.string(), z.unknown()).default({}),
    currentMarkdown: z.string(),
    proposedMarkdown: z.string().min(1)
  })
  .superRefine((value, ctx) => {
    const badKey = analysisKeyInPatch(value.patch);
    if (badKey) {
      ctx.addIssue({
        code: "custom",
        path: ["patch", badKey],
        message: "analysis is form-only; omit it from hub patches"
      });
    }
    if (value.op === "delete" && !(value.id && value.id.trim().length > 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message: "delete requires id"
      });
    }
  });
export type ProposeEvidenceChangeInput = z.infer<typeof ProposeEvidenceChangeInputSchema>;

export const ProposeEvidenceChangeOutputSchema = z.object({
  action: z.enum(["confirm", "cancel"]),
  kind: EvidenceKindSchema,
  id: z.string().min(1).optional()
});
export type ProposeEvidenceChangeOutput = z.infer<typeof ProposeEvidenceChangeOutputSchema>;
