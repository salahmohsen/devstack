import { z } from "zod";

import {
  type ContactSchemaInsert,
  type ContactSchemaSelect,
  type UserSchemaInsert,
  type UserSchemaSelect
} from "@tsu-stack/db/types";

export const contactTypeSchema = z.enum([
  "website",
  "email",
  "phone",
  "location",
  "linkedin",
  "github",
  "x",
  "youtube"
]);

export const contactOutputSchema = z.object({
  type: contactTypeSchema,
  value: z.string(),
  icon: z.string(),
  portfolioEntryId: z.string().nullable(),
  includedInPortfolio: z.boolean(),
  updatedAt: z.date(),
  createdAt: z.date(),
  id: z.string()
}) satisfies z.ZodType<Omit<ContactSchemaSelect, "userId">>;

export type ContactOutputSchema = z.infer<typeof contactOutputSchema>;

export const contactInputSchema = z.object({
  type: contactTypeSchema,
  value: z.string(),
  icon: z.string(),
  includedInPortfolio: z.boolean().optional(),
  id: z.string().optional()
}) satisfies z.ZodType<
  Omit<ContactSchemaInsert, "userId" | "createdAt" | "updatedAt" | "portfolioEntryId" | "id">
>;

export const ProfileUpdateInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.email("Please enter a valid email address").trim().max(320),
  summary: z.string().optional(),
  image: z.string().optional(),
  contacts: z.array(contactInputSchema).optional()
}) satisfies z.ZodType<
  Partial<Omit<UserSchemaInsert, "emailVerified" | "image" | "createdAt" | "updatedAt">>
>;

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateInputSchema>;

export const ProfileOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.coerce.date(),
  contacts: z.array(contactOutputSchema),
  summary: z.string(),
  phone: z.string()
}) satisfies z.ZodType<
  Omit<UserSchemaSelect, "updatedAt"> & { contacts: z.infer<typeof contactOutputSchema>[] }
>;

export type ContactOutput = z.infer<typeof contactOutputSchema>;
export type ContactInput = z.infer<typeof contactInputSchema>;
export type ProfileOutput = z.infer<typeof ProfileOutputSchema>;
export type ProfileOutputContact = z.infer<typeof contactOutputSchema>[];
