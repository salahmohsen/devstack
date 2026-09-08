import { z } from "zod";

export const EducationChangeOpSchema = z.enum(["create", "update", "delete"]);
export type EducationChangeOp = z.infer<typeof EducationChangeOpSchema>;

/** Entity fields only — anything else is rejected so patches stay grounded. */
const EDUCATION_PATCH_KEYS = [
  "school",
  "degree",
  "field",
  "location",
  "fromDate",
  "toDate",
  "isPresent",
  "description",
  "gpa"
] as const;

export const ProposeEducationChangeInputSchema = z
  .object({
    kind: z.literal("education"),
    op: EducationChangeOpSchema.default("update"),
    id: z.string().min(1).optional(),
    patch: z.record(z.string(), z.unknown()).default({})
  })
  .superRefine((value, ctx) => {
    const foreignKey = Object.keys(value.patch).find(
      (key) => !EDUCATION_PATCH_KEYS.includes(key as (typeof EDUCATION_PATCH_KEYS)[number])
    );
    if (foreignKey) {
      ctx.addIssue({
        code: "custom",
        path: ["patch", foreignKey],
        message: "patch accepts education fields only"
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
export type ProposeEducationChangeInput = z.infer<typeof ProposeEducationChangeInputSchema>;

export const ProposeEducationChangeOutputSchema = z.object({
  action: z.enum(["confirm", "cancel"]),
  kind: z.literal("education"),
  id: z.string().min(1).optional()
});
export type ProposeEducationChangeOutput = z.infer<typeof ProposeEducationChangeOutputSchema>;
