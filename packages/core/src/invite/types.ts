import { z } from "zod";

export const InviteOutputSchema = z.object({
  id: z.string(),
  code: z.string(),
  createdByUserId: z.string().nullable(),
  usedByUserId: z.string().nullable(),
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
