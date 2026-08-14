import { z } from "zod";

export const InviteOutputSchema = z.object({
  id: z.string(),
  code: z.string(),
  createdByUserId: z.string().nullable(),
  usedByUserId: z.string().nullable(),
  email: z.string().email().nullable(),
  expiresAt: z.coerce.date().nullable(),
  usedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date()
});

export type InviteOutput = z.infer<typeof InviteOutputSchema>;

export const InviteListOutputSchema = z.array(InviteOutputSchema);

export type InviteListOutput = z.infer<typeof InviteListOutputSchema>;

/** Optional expiry when creating an invite (null/omit = never expires). */
export const CreateInviteInputSchema = z.object({
  expiresAt: z.coerce.date().nullable().optional()
});

export type CreateInviteInput = z.infer<typeof CreateInviteInputSchema>;

export const RevokeInviteInputSchema = z.object({
  id: z.string().min(1)
});

export type RevokeInviteInput = z.infer<typeof RevokeInviteInputSchema>;

export const InviteEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(320);

export const SendInviteEmailsInputSchema = z.object({
  emails: z.array(InviteEmailSchema).min(1, "Add at least one email").max(20)
});

export type SendInviteEmailsInput = z.infer<typeof SendInviteEmailsInputSchema>;

export const SendInviteEmailsOutputSchema = z.object({
  sent: InviteListOutputSchema,
  failed: z.array(
    z.object({
      email: z.string(),
      message: z.string()
    })
  )
});

export type SendInviteEmailsOutput = z.infer<typeof SendInviteEmailsOutputSchema>;

export function inviteSignupPath(code: string): string {
  return `/sign-in/create-an-account?invite=${encodeURIComponent(code)}`;
}
