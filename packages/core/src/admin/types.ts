import { z } from "zod";

import {
  ADMIN_USER_LIST_LIMIT_DEFAULT,
  ADMIN_USER_LIST_LIMIT_MAX,
  DEFAULT_SIGNUP_MODE,
  MEMBER_ROLE,
  SUPER_ADMIN_ROLE
} from "#@/admin/constants";
import { InviteKindSchema } from "#@/invite/types";

export const UserRoleSchema = z.enum([SUPER_ADMIN_ROLE, MEMBER_ROLE]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const SignupModeSchema = z.enum(["invite_only", "open"]);
export type SignupMode = z.infer<typeof SignupModeSchema>;

export const SignupPolicyOutputSchema = z.object({
  signupMode: SignupModeSchema,
  /** True when a new account needs a valid invite (invite-only and at least one user exists). */
  inviteRequired: z.boolean()
});
export type SignupPolicyOutput = z.infer<typeof SignupPolicyOutputSchema>;

export const AdminInviteRefSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  code: z.string(),
  kind: InviteKindSchema
});
export type AdminInviteRef = z.infer<typeof AdminInviteRefSchema>;

export const AdminUserListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  username: z.string(),
  displayUsername: z.string().nullable(),
  phone: z.string().nullable(),
  summary: z.string().nullable(),
  onboardingCompletedAt: z.coerce.date().nullable(),
  role: UserRoleSchema,
  banned: z.boolean(),
  banReason: z.string().nullable(),
  banExpires: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastSeenAt: z.coerce.date().nullable(),
  sessionCount: z.number().int().min(0),
  invite: AdminInviteRefSchema.nullable()
});
export type AdminUserListItem = z.infer<typeof AdminUserListItemSchema>;

export const AdminUserListInputSchema = z.object({
  q: z.string().trim().max(200).optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(ADMIN_USER_LIST_LIMIT_MAX)
    .optional()
    .default(ADMIN_USER_LIST_LIMIT_DEFAULT),
  offset: z.number().int().min(0).optional().default(0)
});
export type AdminUserListInput = z.input<typeof AdminUserListInputSchema>;

export const AdminUserListOutputSchema = z.object({
  items: z.array(AdminUserListItemSchema),
  total: z.number().int().min(0)
});
export type AdminUserListOutput = z.infer<typeof AdminUserListOutputSchema>;

export const AdminUserIdInputSchema = z.object({
  id: z.string().min(1)
});
export type AdminUserIdInput = z.infer<typeof AdminUserIdInputSchema>;

export const AdminUserDetailSchema = AdminUserListItemSchema.extend({
  providers: z.array(z.object({ providerId: z.string().min(1) })),
  counts: z.object({
    experiences: z.number().int().min(0),
    projects: z.number().int().min(0),
    stacks: z.number().int().min(0),
    applications: z.number().int().min(0),
    mailMessages: z.number().int().min(0)
  }),
  customDomain: z.string().nullable()
});
export type AdminUserDetail = z.infer<typeof AdminUserDetailSchema>;

export const AdminSetRoleInputSchema = z.object({
  userId: z.string().min(1),
  role: UserRoleSchema
});
export type AdminSetRoleInput = z.infer<typeof AdminSetRoleInputSchema>;

export const AdminBanUserInputSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().max(500).optional()
});
export type AdminBanUserInput = z.infer<typeof AdminBanUserInputSchema>;

export const AdminUnbanUserInputSchema = z.object({
  userId: z.string().min(1)
});
export type AdminUnbanUserInput = z.infer<typeof AdminUnbanUserInputSchema>;

export const AdminRevokeSessionsInputSchema = z.object({
  userId: z.string().min(1)
});
export type AdminRevokeSessionsInput = z.infer<typeof AdminRevokeSessionsInputSchema>;

export const AdminAccessOutputSchema = z.object({
  signupMode: SignupModeSchema.default(DEFAULT_SIGNUP_MODE),
  userCount: z.number().int().min(0),
  bannedCount: z.number().int().min(0),
  openInviteCount: z.number().int().min(0)
});
export type AdminAccessOutput = z.infer<typeof AdminAccessOutputSchema>;

export const AdminSetSignupModeInputSchema = z.object({
  signupMode: SignupModeSchema
});
export type AdminSetSignupModeInput = z.infer<typeof AdminSetSignupModeInputSchema>;
