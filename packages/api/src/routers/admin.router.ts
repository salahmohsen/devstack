import { randomBytes, randomUUID } from "node:crypto";

import {
  AdminAccessOutputSchema,
  AdminBanUserInputSchema,
  AdminRevokeSessionsInputSchema,
  AdminSetRoleInputSchema,
  AdminSetSignupModeInputSchema,
  AdminUnbanUserInputSchema,
  AdminUserDetailSchema,
  AdminUserIdInputSchema,
  AdminUserListInputSchema,
  AdminUserListItemSchema,
  AdminUserListOutputSchema,
  CreateNamedInviteLinkInputSchema,
  DeleteResponseSchema,
  InviteKindSchema,
  InviteListOutputSchema,
  InviteOutputSchema,
  InviteSignupsInputSchema,
  InviteSignupsOutputSchema,
  MEMBER_ROLE,
  RevokeInviteInputSchema,
  SUPER_ADMIN_ROLE,
  SendInviteEmailsInputSchema,
  SendInviteEmailsOutputSchema,
  inviteKindFromEmail,
  inviteSignupPath,
  isSuperAdminRole,
  parseUserRole,
  type AdminUserListItem,
  type InviteOutput
} from "@tsu-stack/core";
import { inviteRepository, platformSettingRepository, userRepository } from "@tsu-stack/db";
import { EMAIL_LOGO_SRC, InviteUserEmail, sendEmail, toEmailSafeImageUrl } from "@tsu-stack/email";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { superAdminProcedure } from "#@/lib/procedures/factory";

function generateInviteCode(): string {
  return randomBytes(16).toString("hex");
}

function toInviteOutput(row: Awaited<ReturnType<typeof inviteRepository.create>>): InviteOutput {
  return InviteOutputSchema.parse({
    ...row,
    kind: inviteKindFromEmail(row.email)
  });
}

function toInviteRef(
  attribution: { id: string; name: string | null; code: string; email: string | null } | undefined
): AdminUserListItem["invite"] {
  if (!attribution) return null;
  return {
    id: attribution.id,
    name: attribution.name,
    code: attribution.code,
    kind: InviteKindSchema.parse(inviteKindFromEmail(attribution.email))
  };
}

function toListItem(
  row: Awaited<ReturnType<typeof userRepository.listForAdmin>>["items"][number],
  attribution: { id: string; name: string | null; code: string; email: string | null } | undefined
): AdminUserListItem {
  return AdminUserListItemSchema.parse({
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    image: row.image ?? null,
    username: row.username,
    displayUsername: row.displayUsername ?? null,
    phone: row.phone ?? null,
    summary: row.summary ?? null,
    onboardingCompletedAt: row.onboardingCompletedAt ?? null,
    role: parseUserRole(row.role),
    banned: Boolean(row.banned),
    banReason: row.banReason ?? null,
    banExpires: row.banExpires ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastSeenAt: row.lastSeenAt,
    sessionCount: row.sessionCount,
    invite: toInviteRef(attribution)
  });
}

export const adminRouter = {
  users: {
    list: superAdminProcedure
      .route({
        description: "List all users for the platform console",
        method: "GET"
      })
      .input(AdminUserListInputSchema)
      .output(AdminUserListOutputSchema)
      .handler(async ({ input }) => {
        const { items, total } = await userRepository.listForAdmin({
          q: input.q,
          limit: input.limit,
          offset: input.offset
        });
        const attributions = await inviteRepository.findAttributionByUserIds(
          items.map((u) => u.id)
        );
        return {
          total,
          items: items.map((row) => toListItem(row, attributions.get(row.id)))
        };
      }),

    get: superAdminProcedure
      .route({
        description: "Get one user with invite attribution, providers, and tenant counts",
        method: "GET"
      })
      .input(AdminUserIdInputSchema)
      .output(AdminUserDetailSchema)
      .handler(async ({ input, errors }) => {
        const row = await userRepository.findById(input.id);
        if (!row) throw errors.USER_NOT_FOUND();

        const [stats, providers, counts, customDomain, attributions] = await Promise.all([
          userRepository.sessionStats(input.id),
          userRepository.listProviders(input.id),
          userRepository.tenantCounts(input.id),
          userRepository.findCustomDomainHostname(input.id),
          inviteRepository.findAttributionByUserIds([input.id])
        ]);

        const base = toListItem(
          {
            ...row,
            lastSeenAt: stats.lastSeenAt,
            sessionCount: stats.sessionCount
          },
          attributions.get(input.id)
        );

        return AdminUserDetailSchema.parse({
          ...base,
          providers,
          counts,
          customDomain
        });
      }),

    setRole: superAdminProcedure
      .route({
        description: "Promote or demote a user",
        method: "POST"
      })
      .input(AdminSetRoleInputSchema)
      .output(AdminUserListItemSchema)
      .handler(async ({ input, context, errors }) => {
        const target = await userRepository.findById(input.userId);
        if (!target) throw errors.USER_NOT_FOUND();

        if (isSuperAdminRole(target.role) && input.role === MEMBER_ROLE) {
          const admins = await userRepository.countByRole(SUPER_ADMIN_ROLE);
          if (admins <= 1) throw errors.LAST_ADMIN();
        }

        const updated = await userRepository.update(input.userId, { role: input.role });
        if (!updated) throw errors.USER_NOT_FOUND();

        context.logger.set({
          event: "admin_set_role",
          actorUserId: context.session.user.id,
          targetUserId: input.userId,
          role: input.role
        });

        const attributions = await inviteRepository.findAttributionByUserIds([updated.id]);
        return toListItem(
          { ...updated, lastSeenAt: null, sessionCount: 0 },
          attributions.get(updated.id)
        );
      }),

    ban: superAdminProcedure
      .route({
        description: "Ban a user and revoke their sessions",
        method: "POST"
      })
      .input(AdminBanUserInputSchema)
      .output(AdminUserListItemSchema)
      .handler(async ({ input, context, errors }) => {
        if (input.userId === context.session.user.id) throw errors.CANNOT_BAN_SELF();

        const target = await userRepository.findById(input.userId);
        if (!target) throw errors.USER_NOT_FOUND();
        if (isSuperAdminRole(target.role)) {
          const admins = await userRepository.countByRole(SUPER_ADMIN_ROLE);
          if (admins <= 1) throw errors.LAST_ADMIN();
        }

        const updated = await userRepository.update(input.userId, {
          banned: true,
          banReason: input.reason?.trim() ?? "Banned by super admin"
        });
        if (!updated) throw errors.USER_NOT_FOUND();
        await userRepository.revokeSessions(input.userId);

        context.logger.set({
          event: "admin_ban_user",
          actorUserId: context.session.user.id,
          targetUserId: input.userId
        });

        const attributions = await inviteRepository.findAttributionByUserIds([updated.id]);
        return toListItem(
          { ...updated, lastSeenAt: null, sessionCount: 0 },
          attributions.get(updated.id)
        );
      }),

    unban: superAdminProcedure
      .route({
        description: "Clear a user ban",
        method: "POST"
      })
      .input(AdminUnbanUserInputSchema)
      .output(AdminUserListItemSchema)
      .handler(async ({ input, context, errors }) => {
        const updated = await userRepository.update(input.userId, {
          banned: false,
          banReason: null,
          banExpires: null
        });
        if (!updated) throw errors.USER_NOT_FOUND();

        context.logger.set({
          event: "admin_unban_user",
          actorUserId: context.session.user.id,
          targetUserId: input.userId
        });

        const attributions = await inviteRepository.findAttributionByUserIds([updated.id]);
        return toListItem(
          { ...updated, lastSeenAt: null, sessionCount: 0 },
          attributions.get(updated.id)
        );
      }),

    revokeSessions: superAdminProcedure
      .route({
        description: "Revoke all sessions for a user",
        method: "POST"
      })
      .input(AdminRevokeSessionsInputSchema)
      .output(DeleteResponseSchema)
      .handler(async ({ input, errors }) => {
        const target = await userRepository.findById(input.userId);
        if (!target) throw errors.USER_NOT_FOUND();
        await userRepository.revokeSessions(input.userId);
        return { success: true };
      })
  },

  invites: {
    list: superAdminProcedure
      .route({
        description: "List every invite",
        method: "GET"
      })
      .output(InviteListOutputSchema)
      .handler(async () => {
        const rows = await inviteRepository.listAll();
        return rows.map(toInviteOutput);
      }),

    createLink: superAdminProcedure
      .route({
        description: "Create a named invite link",
        method: "POST"
      })
      .input(CreateNamedInviteLinkInputSchema)
      .output(InviteOutputSchema)
      .handler(async ({ input, context }) => {
        const row = await inviteRepository.create({
          id: randomUUID(),
          code: generateInviteCode(),
          createdByUserId: context.session.user.id,
          name: input.name,
          maxUses: input.maxUses === undefined ? null : input.maxUses,
          expiresAt: input.expiresAt ?? null
        });
        return toInviteOutput(row);
      }),

    sendEmails: superAdminProcedure
      .route({
        description: "Email single-use invites",
        method: "POST"
      })
      .input(SendInviteEmailsInputSchema)
      .output(SendInviteEmailsOutputSchema)
      .errors({
        EMAIL_UNAVAILABLE: {
          message: "Email delivery is not configured. Set RESEND_API_KEY to send invites.",
          status: 503
        }
      })
      .handler(async ({ input, context, errors }) => {
        if (!ENV_SERVER.RESEND_API_KEY) {
          throw errors.EMAIL_UNAVAILABLE();
        }
        const unique = [
          ...new Set(input.emails.map((e) => e.trim().toLowerCase()).filter(Boolean))
        ];
        const userId = context.session.user.id;
        const inviter = await userRepository.findById(userId);
        const webOrigin = ENV_SERVER.VITE_WEB_URL.replace(/\/$/, "");
        const inviterName = inviter?.name?.trim() ?? inviter?.username ?? "A teammate";
        const inviterEmail = inviter?.email ?? "";
        const invitedByImageUrl = toEmailSafeImageUrl(inviter?.image) ?? EMAIL_LOGO_SRC;

        const sent: InviteOutput[] = [];
        const failed: { email: string; message: string }[] = [];

        for (const email of unique) {
          const row = await inviteRepository.create({
            id: randomUUID(),
            code: generateInviteCode(),
            createdByUserId: userId,
            name: input.name?.trim() ?? email,
            email,
            maxUses: 1,
            expiresAt: input.expiresAt ?? null
          });
          const inviteUrl = `${webOrigin}${inviteSignupPath(row.code)}`;
          try {
            await sendEmail({
              to: email,
              subject: `Join ${inviterName} on DevHub`,
              template: InviteUserEmail({
                invitedEmail: email,
                invitedByName: inviterName,
                invitedByEmail: inviterEmail,
                invitedByImageUrl,
                productName: "DevHub",
                productImageUrl: EMAIL_LOGO_SRC,
                inviteUrl,
                logoUrl: EMAIL_LOGO_SRC
              })
            });
            sent.push(toInviteOutput(row));
          } catch (error) {
            await inviteRepository.revoke(row.id);
            failed.push({
              email,
              message: error instanceof Error ? error.message : "Failed to send invite email"
            });
          }
        }

        return { sent, failed };
      }),

    revoke: superAdminProcedure
      .route({
        description: "Revoke remaining uses of an invite",
        method: "DELETE"
      })
      .input(RevokeInviteInputSchema)
      .output(DeleteResponseSchema)
      .handler(async ({ input, errors }) => {
        const revoked = await inviteRepository.revoke(input.id);
        if (!revoked) throw errors.INVITE_NOT_FOUND();
        return { success: true };
      }),

    signups: superAdminProcedure
      .route({
        description: "Users who signed up with this invite",
        method: "GET"
      })
      .input(InviteSignupsInputSchema)
      .output(InviteSignupsOutputSchema)
      .handler(async ({ input, errors }) => {
        const invite = await inviteRepository.findById(input.inviteId);
        if (!invite) throw errors.INVITE_NOT_FOUND();
        const items = await inviteRepository.listSignups(input.inviteId);
        return { items };
      })
  },

  access: {
    get: superAdminProcedure
      .route({
        description: "Platform signup mode and counts",
        method: "GET"
      })
      .output(AdminAccessOutputSchema)
      .handler(async () => {
        const [setting, userCount, bannedCount, openInviteCount] = await Promise.all([
          platformSettingRepository.get(),
          userRepository.countUsers(),
          userRepository.countBanned(),
          inviteRepository.countOpen()
        ]);
        return AdminAccessOutputSchema.parse({
          signupMode: setting.signupMode,
          userCount,
          bannedCount,
          openInviteCount
        });
      }),

    setSignupMode: superAdminProcedure
      .route({
        description: "Set open registration or invite-only",
        method: "POST"
      })
      .input(AdminSetSignupModeInputSchema)
      .output(AdminAccessOutputSchema)
      .handler(async ({ input, context }) => {
        await platformSettingRepository.setSignupMode(input.signupMode, context.session.user.id);
        context.logger.set({
          event: "admin_set_signup_mode",
          actorUserId: context.session.user.id,
          signupMode: input.signupMode
        });
        const [setting, userCount, bannedCount, openInviteCount] = await Promise.all([
          platformSettingRepository.get(),
          userRepository.countUsers(),
          userRepository.countBanned(),
          inviteRepository.countOpen()
        ]);
        return AdminAccessOutputSchema.parse({
          signupMode: setting.signupMode,
          userCount,
          bannedCount,
          openInviteCount
        });
      })
  }
};
