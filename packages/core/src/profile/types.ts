import { z } from "zod";

import {
  type ContactSchemaInsert,
  type ContactSchemaSelect,
  type UserSchemaInsert,
  type UserSchemaSelect
} from "@tsu-stack/db/types";

import {
  RESERVED_USERNAME_PATH_SET,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_REGEX
} from "#@/profile/constants";

export const contactTypeSchema = z.enum([
  "website",
  "email",
  "phone",
  "location",
  "linkedin",
  "github",
  "x",
  "youtube",
  "instagram",
  "discord",
  "bluesky",
  "mastodon",
  "telegram"
]);

export const contactOutputSchema = z.object({
  type: contactTypeSchema,
  value: z.string(),
  sortOrder: z.number().int(),
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
  sortOrder: z.number().int().optional(),
  includedInPortfolio: z.boolean().optional(),
  id: z.string().optional()
}) satisfies z.ZodType<
  Omit<
    ContactSchemaInsert,
    "userId" | "createdAt" | "updatedAt" | "portfolioEntryId" | "id" | "sortOrder"
  > & {
    sortOrder?: number;
    id?: string;
    includedInPortfolio?: boolean;
  }
>;

/**
 * Profile form fields owned by the app (contacts, summary, display name/email).
 * Avatar: use Better Auth `authClient.updateUser({ image })` only — not this schema.
 */
export const ProfileUpdateInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.email("Please enter a valid email address").trim().max(320),
  /** Public portfolio blurb (Better Auth user.summary). Rich HTML from the profile editor. */
  summary: z.string().max(8000).nullish(),
  contacts: z.array(contactInputSchema).optional()
}) satisfies z.ZodType<
  Partial<Omit<UserSchemaInsert, "emailVerified" | "image" | "createdAt" | "updatedAt">>
>;

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateInputSchema>;

/** Public portfolio path key / Better Auth username (path-safe). */
export const UsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN)
  .max(USERNAME_MAX)
  .regex(USERNAME_REGEX, "Use lowercase letters, numbers, and single hyphens")
  .refine((s) => !RESERVED_USERNAME_PATH_SET.has(s), "This name is reserved");

export type Username = z.infer<typeof UsernameSchema>;

export const ProfileOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.coerce.date(),
  contacts: z.array(contactOutputSchema),
  summary: z.string().nullable(),
  phone: z.string().nullable(),
  /** Public path handle (Better Auth username). */
  username: UsernameSchema
}) satisfies z.ZodType<
  Omit<
    UserSchemaSelect,
    | "updatedAt"
    | "onboardingCompletedAt"
    | "displayUsername"
    | "role"
    | "banned"
    | "banReason"
    | "banExpires"
  > & {
    contacts: z.infer<typeof contactOutputSchema>[];
  }
>;

export type ContactOutput = z.infer<typeof contactOutputSchema>;
export type ContactInput = z.infer<typeof contactInputSchema>;
export type ProfileOutput = z.infer<typeof ProfileOutputSchema>;
export type ProfileOutputContact = z.infer<typeof contactOutputSchema>[];

/** Input for renaming a user's public username (path key). */
export const RenameUsernameInputSchema = z.object({
  username: UsernameSchema
});

export type RenameUsernameInput = z.infer<typeof RenameUsernameInputSchema>;

/**
 * Live availability check input. Accepts any non-empty string so the API can
 * return structured `invalid` / `reserved` instead of a 400 for partial typing.
 */
export const CheckUsernameInputSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(USERNAME_MAX + 10)
});

export type CheckUsernameInput = z.infer<typeof CheckUsernameInputSchema>;

export const UsernameAvailabilityStatusSchema = z.enum([
  "available",
  "current",
  "taken",
  "reserved",
  "invalid"
]);

export type UsernameAvailabilityStatus = z.infer<typeof UsernameAvailabilityStatusSchema>;

export const CheckUsernameOutputSchema = z.object({
  username: z.string(),
  available: z.boolean(),
  status: UsernameAvailabilityStatusSchema,
  message: z.string().optional()
});

export type CheckUsernameOutput = z.infer<typeof CheckUsernameOutputSchema>;

/**
 * Public procedures that scope data to a path segment and/or verified Host.
 * When `username` is omitted, the request Host (verified custom domain) must resolve.
 */
export const PublicUsernameInputSchema = z.object({
  username: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Public username path key (user.username or a slug alias). Optional when Host is a verified custom domain."
    )
});

export type PublicUsernameInput = z.infer<typeof PublicUsernameInputSchema>;
