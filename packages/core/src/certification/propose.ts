import { z } from "zod";

export const CertificationChangeOpSchema = z.enum(["create", "update", "delete"]);
export type CertificationChangeOp = z.infer<typeof CertificationChangeOpSchema>;

/** Entity fields only — anything else is rejected so patches stay grounded. */
const CERTIFICATION_PATCH_KEYS = [
  "name",
  "issuer",
  "issuedAt",
  "expiresAt",
  "credentialUrl",
  "description"
] as const;

export const ProposeCertificationChangeInputSchema = z
  .object({
    kind: z.literal("certification"),
    op: CertificationChangeOpSchema.default("update"),
    id: z.string().min(1).optional(),
    patch: z.record(z.string(), z.unknown()).default({})
  })
  .superRefine((value, ctx) => {
    const foreignKey = Object.keys(value.patch).find(
      (key) => !CERTIFICATION_PATCH_KEYS.includes(key as (typeof CERTIFICATION_PATCH_KEYS)[number])
    );
    if (foreignKey) {
      ctx.addIssue({
        code: "custom",
        path: ["patch", foreignKey],
        message: "patch accepts certification fields only"
      });
    }
    if (value.op === "create" && value.id) {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message: "create must not pass id"
      });
    }
    if (value.op !== "create" && !(value.id && value.id.trim().length > 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message: "update/delete require id"
      });
    }
  });
export type ProposeCertificationChangeInput = z.infer<typeof ProposeCertificationChangeInputSchema>;

export const ProposeCertificationChangeOutputSchema = z.object({
  action: z.enum(["confirm", "cancel"]),
  kind: z.literal("certification"),
  id: z.string().min(1).optional()
});
export type ProposeCertificationChangeOutput = z.infer<
  typeof ProposeCertificationChangeOutputSchema
>;
