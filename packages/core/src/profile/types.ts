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
  updatedAt: z.date(),
  createdAt: z.date()
}) satisfies z.ZodType<Omit<ContactSchemaSelect, "userId">>;

export type ContactOutputSchema = z.infer<typeof contactOutputSchema>;

export const contactInputSchema = z.object({
  type: contactTypeSchema,
  value: z.string(),
  icon: z.string()
}) satisfies z.ZodType<Omit<ContactSchemaInsert, "userId" | "createdAt" | "updatedAt">>;

export const ProfileUpdateInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.email("Please enter a valid email address").trim().max(320),
  contacts: z.array(contactInputSchema).optional()
}) satisfies z.ZodType<
  Partial<Omit<UserSchemaInsert, "id" | "emailVerified" | "image" | "createdAt" | "updatedAt">>
>;

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateInputSchema>;

export const ProfileOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.coerce.date(),
  contacts: z.array(contactOutputSchema)
}) satisfies z.ZodType<
  Omit<UserSchemaSelect, "updatedAt"> & { contacts: z.infer<typeof contactOutputSchema>[] }
>;

export type ContactOutput = z.infer<typeof contactOutputSchema>;
export type ContactInput = z.infer<typeof contactInputSchema>;
export type ProfileOutput = z.infer<typeof ProfileOutputSchema>;
export type ProfileOutputContact = z.infer<typeof contactOutputSchema>[];
