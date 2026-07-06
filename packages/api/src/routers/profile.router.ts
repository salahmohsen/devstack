import { z } from "zod";

import {
  contactOutputSchema,
  ProfileOutputSchema,
  ProfileUpdateInputSchema
} from "@tsu-stack/core";
import { contactRepository, userRepository } from "@tsu-stack/db";
import { type UserSchemaSelect } from "@tsu-stack/db/types";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";

function toProfileOutput(
  userRow: UserSchemaSelect,
  contacts: Awaited<ReturnType<typeof contactRepository.findByUserId>>,
  disableContacts?: boolean
) {
  return ProfileOutputSchema.parse({
    ...userRow,
    ...(disableContacts
      ? { contacts: [] }
      : {
          contacts: (contacts ?? []).map((c) => {
            return {
              ...c,
              includedInPortfolio: !!c.portfolioEntryId
            };
          })
        })
  });
}

export const profileRouter = {
  get: protectedProcedure
    .route({
      description: "Get the current owner's profile and contact info",
      method: "GET"
    })
    .input(z.object({ disableContacts: z.boolean().default(false).optional() }).optional())
    .output(ProfileOutputSchema)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const userRow = await userRepository.findById(userId);
      if (!userRow) {
        throw new Error("Session references a user that no longer exists");
      }
      const contacts = await contactRepository.findByUserId(userId);
      return toProfileOutput(userRow, contacts, input?.disableContacts);
    }),
  getContacts: publicProcedure
    .route({
      description: "Get admin contacts",
      method: "GET"
    })
    .output(z.array(contactOutputSchema))
    .handler(async () => {
      const contacts = await contactRepository.getAdminContact();
      return (contacts ?? []).map((c) => {
        return {
          type: c.type,
          value: c.value,
          icon: c.icon,
          portfolioEntryId: c.portfolioEntryId ?? null,
          includedInPortfolio: !!c.portfolioEntryId,
          updatedAt: c.updatedAt,
          createdAt: c.createdAt,
          id: c.id
        };
      });
    }),
  update: protectedProcedure
    .route({
      description:
        "Update the current owner's profile (name, email) and contact info (website, email, location)",
      method: "POST"
    })
    .input(ProfileUpdateInputSchema)
    .output(ProfileOutputSchema)
    .errors({
      EMAIL_TAKEN: { message: "That email is already in use.", status: 409 }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const contactItems = input.contacts ?? [];

      const current = await userRepository.findById(userId);
      if (!current) {
        throw new Error("Session references a user that no longer exists");
      }

      const emailChanged = current.email !== input.email;

      if (emailChanged) {
        const collision = await userRepository.findByEmail(input.email);
        if (collision && collision.id !== userId) {
          throw errors.EMAIL_TAKEN();
        }
      }

      const updatedUser = await userRepository.update(userId, {
        name: input.name,
        email: input.email,
        summary: input.summary,
        image: input.image,
        ...(emailChanged ? { emailVerified: false } : {})
      });
      if (!updatedUser) {
        throw new Error("Profile update did not affect any row");
      }

      const contacts = await contactRepository.upsert(userId, contactItems);

      return toProfileOutput(updatedUser, contacts);
    })
};
