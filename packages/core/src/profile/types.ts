import { z } from "zod";

/**
 * Per-user public contact info (website, email, location).
 *
 * Lives in the `contact` table, one row per user. All three fields are
 * optional and accept an empty string from the form (which the handler
 * normalises to `null` before writing).
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

export type ContactInfo = {
  website?: string | null;
  email?: string | null;
  location?: string | null;
};

export const ProfileUpdateInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().email("Please enter a valid email address").max(320),
  contact: ContactInfoSchema.optional()
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateInputSchema>;

export const ProfileOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.string(),
  contact: z.object({
    website: z.string().nullable(),
    email: z.string().nullable(),
    location: z.string().nullable(),
    updatedAt: z.string()
  })
});

export type ProfileOutput = z.infer<typeof ProfileOutputSchema>;
