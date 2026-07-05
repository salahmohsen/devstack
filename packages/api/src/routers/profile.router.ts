import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  contactOutputSchema,
  ProfileOutputSchema,
  ProfileUpdateInputSchema
} from "@tsu-stack/core/profile";
import { contactRepository, getDb, userRepository, type UserEntity } from "@tsu-stack/db";
import { portfolioEntryRepository } from "@tsu-stack/db/repositories";
import { contact } from "@tsu-stack/db/schema";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";

function toProfileOutput(
  userRow: UserEntity,
  contacts: Awaited<ReturnType<typeof contactRepository.findByUserId>>
) {
  return ProfileOutputSchema.parse({
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    emailVerified: userRow.emailVerified,
    image: userRow.image,
    createdAt: userRow.createdAt,
    contacts: (contacts ?? []).map((c) => {
      return {
        type: c.type,
        value: c.value,
        icon: c.icon,
        portfolioEntryId: c.portfolioEntryId ?? null,
        includedInPortfolio: !!c.portfolioEntryId,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt
      };
    })
  });
}

export const profileRouter = {
  get: protectedProcedure
    .route({
      description: "Get the current owner's profile and contact info",
      method: "GET"
    })
    .output(ProfileOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const userRow = await userRepository.findById(userId);
      if (!userRow) {
        throw new Error("Session references a user that no longer exists");
      }
      const contacts = await contactRepository.findByUserId(userId);
      return toProfileOutput(userRow, contacts);
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
          createdAt: c.createdAt
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
        ...(emailChanged ? { emailVerified: false } : {})
      });
      if (!updatedUser) {
        throw new Error("Profile update did not affect any row");
      }

      await contactRepository.upsert(userId, contactItems);

      for (const contactInput of contactItems) {
        if (contactInput.includedInPortfolio) {
          const existing = await portfolioEntryRepository.findByTypeAndEntityId(
            "contact",
            contactInput.type
          );
          if (!existing) {
            const created = await portfolioEntryRepository.create({
              type: "contact",
              entityId: contactInput.type
            });
            if (created) {
              await getDb()
                .update(contact)
                .set({ portfolioEntryId: created.id })
                .where(and(eq(contact.userId, userId), eq(contact.type, contactInput.type)));
            }
          }
        } else {
          const existing = await portfolioEntryRepository.findByTypeAndEntityId(
            "contact",
            contactInput.type
          );
          if (existing) {
            await portfolioEntryRepository.deleteByTypeAndEntityId("contact", contactInput.type);
          }
        }
      }

      const contacts = await contactRepository.findByUserId(userId);
      return toProfileOutput(updatedUser, contacts);
    })
};
