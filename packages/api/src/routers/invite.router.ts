import { randomBytes, randomUUID } from "node:crypto";

import {
  CreateInviteInputSchema,
  DeleteResponseSchema,
  InviteListOutputSchema,
  InviteOutputSchema,
  RevokeInviteInputSchema
} from "@tsu-stack/core";
import { inviteRepository } from "@tsu-stack/db";

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
