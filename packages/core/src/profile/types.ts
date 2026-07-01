import { z } from "zod";

/**
 * Flat contact fields used by the profile form.
 *
 * Each field maps to a row in the `contact` table keyed by
 * `(userId, type)`. Empty strings are normalised server-side
 * and the row is deleted rather than written as empty.
 */

const optionalUrl = z
  .union([
    z.literal(""),
    z.url("Website must be a valid URL (e.g. https://example.com)").trim().max(500)
  ])
  .optional();

const optionalEmail = z
  .union([z.literal(""), z.string().trim().email("Please enter a valid email address").max(320)])
  .optional();

const optionalLocation = z.union([z.literal(""), z.string().trim().min(1).max(200)]).optional();

export const ContactInfoSchema = z.object({
  website: optionalUrl,
  email: optionalEmail,
  location: optionalLocation
});

export type ContactInfo = z.infer<typeof ContactInfoSchema>;

export const ProfileUpdateInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.email("Please enter a valid email address").trim().max(320),
  contact: ContactInfoSchema.optional()
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateInputSchema>;

export const contactOutputSchema = z.object({
  type: z.string(),
  value: z.string(),
  icon: z.string().nullable(),
  updatedAt: z.string()
});

export const ProfileOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.string(),
  contact: z.array(contactOutputSchema)
});

export type ProfileOutput = z.infer<typeof ProfileOutputSchema>;
export type ProfileOutputContact = z.infer<typeof contactOutputSchema>[];
