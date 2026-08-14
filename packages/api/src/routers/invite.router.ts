import { randomBytes, randomUUID } from "node:crypto";

import {
  CreateInviteInputSchema,
  DeleteResponseSchema,
  InviteListOutputSchema,
  InviteOutputSchema,
  RevokeInviteInputSchema,
  SendInviteEmailsInputSchema,
  SendInviteEmailsOutputSchema,
  inviteSignupPath
} from "@tsu-stack/core";
import { inviteRepository, userRepository } from "@tsu-stack/db";
import { InviteUserEmail, sendEmail } from "@tsu-stack/email";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { protectedProcedure } from "#@/lib/procedures/factory";

function toInviteOutput(row: Awaited<ReturnType<typeof inviteRepository.create>>) {
  return InviteOutputSchema.parse(row);
}

/** 16 random bytes → 32 hex chars (above the 16+ hex minimum). */
function generateInviteCode(): string {
  return randomBytes(16).toString("hex");
}

export const inviteRouter = {
  list: protectedProcedure
    .route({
      description: "List invites created by the current user",
      method: "GET"
    })
    .output(InviteListOutputSchema)
    .handler(async ({ context }) => {
      const rows = await inviteRepository.listByCreator(context.session.user.id);
      return rows.map(toInviteOutput);
    }),

  create: protectedProcedure
    .route({
      description: "Create a new single-use invite code",
      method: "POST"
    })
    .input(CreateInviteInputSchema.optional())
    .output(InviteOutputSchema)
    .handler(async ({ input, context }) => {
      const row = await inviteRepository.create({
        id: randomUUID(),
        code: generateInviteCode(),
        createdByUserId: context.session.user.id,
        expiresAt: input?.expiresAt ?? null
      });
      return toInviteOutput(row);
    }),

  send: protectedProcedure
    .route({
      description: "Create one invite per email and send the invite template",
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
      const unique = [...new Set(input.emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
      const userId = context.session.user.id;
      const inviter = await userRepository.findById(userId);
      const webOrigin = ENV_SERVER.VITE_WEB_URL.replace(/\/$/, "");
      const logoUrl = `${webOrigin}/logo192.png`;
      const inviterName = inviter?.name?.trim() ?? inviter?.username ?? "A teammate";
      const inviterEmail = inviter?.email ?? "";
      const invitedByImageUrl = inviter?.image?.trim() ?? logoUrl;

      const sent: ReturnType<typeof toInviteOutput>[] = [];
      const failed: { email: string; message: string }[] = [];

      for (const email of unique) {
        const row = await inviteRepository.create({
          id: randomUUID(),
          code: generateInviteCode(),
          createdByUserId: userId,
          email
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
              productImageUrl: logoUrl,
              inviteUrl,
              logoUrl
            })
          });
          sent.push(toInviteOutput(row));
        } catch (error) {
          await inviteRepository.revoke(row.id, userId);
          failed.push({
            email,
            message: error instanceof Error ? error.message : "Failed to send invite email"
          });
        }
      }

      return { sent, failed };
    }),

  revoke: protectedProcedure
    .route({
      description: "Revoke an unused invite created by the current user",
      method: "DELETE"
    })
    .input(RevokeInviteInputSchema)
    .output(DeleteResponseSchema)
    .errors({
      INVITE_NOT_FOUND: {
        message: "Invite not found, already used, or not owned by you",
        status: 404
      }
    })
    .handler(async ({ input, context, errors }) => {
      const revoked = await inviteRepository.revoke(input.id, context.session.user.id);
      if (!revoked) {
        throw errors.INVITE_NOT_FOUND();
      }
      return { success: true };
    })
};
