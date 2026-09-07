import { z } from "zod";

import {
  type CertificationSchemaInsert,
  type CertificationSchemaSelect
} from "@tsu-stack/db/types";

/** ISO year-month or year; blank coerces to null. */
const optionalDate = z
  .union([z.string(), z.literal("")])
  .nullable()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed === undefined || trimmed === "" ? null : trimmed;
  });

/** http(s) URL up to 500 chars; empty coerces to null. */
const optionalCredentialUrl = z
  .union([z.string().url().max(500), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));

export const CertificationOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string(),
  issuedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  credentialUrl: z.string().nullable(),
  description: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string()
}) satisfies z.ZodType<
  Omit<CertificationSchemaSelect, "userId" | "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  }
>;

export const CreateCertificationInputSchema = z.object({
  name: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  issuedAt: optionalDate,
  expiresAt: optionalDate,
  credentialUrl: optionalCredentialUrl,
  description: z.string().max(2000).nullable().optional()
}) satisfies z.ZodType<
  Omit<CertificationSchemaInsert, "id" | "userId" | "createdAt" | "updatedAt" | "sortOrder">
>;

export const UpdateCertificationInputSchema = CreateCertificationInputSchema.partial().extend({
  name: z.string().min(1).max(200).optional(),
  issuer: z.string().min(1).max(200).optional()
});

export const CertificationListOutputSchema = z.array(CertificationOutputSchema);

export type CertificationOutput = z.infer<typeof CertificationOutputSchema>;
export type CreateCertificationInput = z.infer<typeof CreateCertificationInputSchema>;
export type UpdateCertificationInput = z.infer<typeof UpdateCertificationInputSchema>;
