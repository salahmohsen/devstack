import { z } from "zod";

export const InviteKindSchema = z.enum(["link", "email"]);
export type InviteKind = z.infer<typeof InviteKindSchema>;

export const InviteStatusSchema = z.enum(["open", "exhausted", "revoked", "expired"]);
export type InviteStatus = z.infer<typeof InviteStatusSchema>;

export const InviteNameSchema = z.string().trim().min(1, "Name this invite").max(80);

export const InviteOutputSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string().nullable(),
  kind: InviteKindSchema,
  createdByUserId: z.string().nullable(),
  usedByUserId: z.string().nullable(),
  email: z.string().email().nullable(),
  maxUses: z.number().int().min(1).nullable(),
  useCount: z.number().int().min(0),
  expiresAt: z.coerce.date().nullable(),
  usedAt: z.coerce.date().nullable(),
  revokedAt: z.coerce.date().nullable(),
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

export const CreateNamedInviteLinkInputSchema = z.object({
  name: InviteNameSchema,
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional()
});
export type CreateNamedInviteLinkInput = z.infer<typeof CreateNamedInviteLinkInputSchema>;

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
  emails: z.array(InviteEmailSchema).min(1, "Add at least one email").max(20),
  name: InviteNameSchema.optional(),
  expiresAt: z.coerce.date().nullable().optional()
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

export const InviteSignupsInputSchema = z.object({
  inviteId: z.string().min(1)
});
export type InviteSignupsInput = z.infer<typeof InviteSignupsInputSchema>;

export const InviteSignupUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  username: z.string(),
  image: z.string().nullable(),
  usedAt: z.coerce.date()
});
export type InviteSignupUser = z.infer<typeof InviteSignupUserSchema>;

export const InviteSignupsOutputSchema = z.object({
  items: z.array(InviteSignupUserSchema)
});
export type InviteSignupsOutput = z.infer<typeof InviteSignupsOutputSchema>;

export function inviteSignupPath(code: string): string {
  return `/sign-up?invite=${encodeURIComponent(code)}`;
}

export function inviteKindFromEmail(email: string | null | undefined): InviteKind {
  return email ? "email" : "link";
}

export function inviteStatus(invite: {
  revokedAt: Date | string | null;
  expiresAt: Date | string | null;
  maxUses: number | null;
  useCount: number;
}): InviteStatus {
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt) {
    const expires =
      invite.expiresAt instanceof Date ? invite.expiresAt : new Date(invite.expiresAt);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() < Date.now()) return "expired";
  }
  if (invite.maxUses != null && invite.useCount >= invite.maxUses) return "exhausted";
  return "open";
}
