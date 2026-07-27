import { z } from "zod";

import {
  contactOutputSchema,
  parseProfileName,
  ProfileOutputSchema,
  ProfileUpdateInputSchema,
  PublicProfileNameInputSchema,
  RenameProfileInputSchema
} from "@tsu-stack/core";
import { contactRepository, profileSlugAliasRepository, userRepository } from "@tsu-stack/db";
import { type UserSchemaSelect } from "@tsu-stack/db/types";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";
import { resolveUserIdByProfileName } from "#@/lib/public-portfolio/resolve-context";

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
      description: "Get public contacts for a profile by profileName",
      method: "GET"
    })
    .input(PublicProfileNameInputSchema)
    .output(z.array(contactOutputSchema))
    .errors({
      NOT_FOUND: {
        message: "Profile not found",
        status: 404
      }
    })
    .handler(async ({ input, errors }) => {
      const userId = await resolveUserIdByProfileName(input.profileName);
      if (!userId) {
        throw errors.NOT_FOUND();
      }
      const contacts = await contactRepository.findOptedInByUserId(userId);
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
    }),
  rename: protectedProcedure
    .route({
      description:
        "Rename the current user's public profileName; previous slug is kept as an alias",
      method: "POST"
    })
    .input(RenameProfileInputSchema)
    .output(ProfileOutputSchema)
    .errors({
      PROFILE_NAME_TAKEN: {
        message: "That profile name is already taken.",
        status: 409
      },
      PROFILE_NAME_INVALID: {
        message: "Invalid profile name. Use 3–30 lowercase letters, numbers, and single hyphens.",
        status: 400
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;

      const parsed = parseProfileName(input.profileName);
      if (!parsed.success) {
        throw errors.PROFILE_NAME_INVALID();
      }
      const newName = parsed.data;

      const current = await userRepository.findById(userId);
      if (!current) {
        throw new Error("Session references a user that no longer exists");
      }

      const oldName = current.profileName;

      if (oldName === newName) {
        const contacts = await contactRepository.findByUserId(userId);
        return toProfileOutput(current, contacts);
      }

      const nameOwner = await userRepository.findByProfileName(newName);
      if (nameOwner && nameOwner.id !== userId) {
        throw errors.PROFILE_NAME_TAKEN();
      }

      const aliasOwner = await profileSlugAliasRepository.findBySlug(newName);
      if (aliasOwner && aliasOwner.userId !== userId) {
        throw errors.PROFILE_NAME_TAKEN();
      }

      // 1. Preserve the old public path as an alias (skip if already an alias row).
      if (oldName) {
        const existingOldAlias = await profileSlugAliasRepository.findBySlug(oldName);
        if (!existingOldAlias) {
          await profileSlugAliasRepository.create({
            id: crypto.randomUUID(),
            userId,
            slug: oldName
          });
        }
      }

      // 2. Point user at the new profileName.
      const updatedUser = await userRepository.updateProfileName(userId, newName);
      if (!updatedUser) {
        throw new Error("Profile rename did not affect any row");
      }

      // 3. If the new name was one of our own aliases, drop that alias.
      if (aliasOwner && aliasOwner.userId === userId) {
        await profileSlugAliasRepository.deleteByUserIdAndSlug(userId, newName);
      }

      const contacts = await contactRepository.findByUserId(userId);
      return toProfileOutput(updatedUser, contacts);
    })
};
