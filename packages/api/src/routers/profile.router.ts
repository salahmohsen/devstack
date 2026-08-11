import { z } from "zod";

import {
  CheckUsernameInputSchema,
  CheckUsernameOutputSchema,
  contactOutputSchema,
  parseUsername,
  ProfileOutputSchema,
  ProfileUpdateInputSchema,
  PublicUsernameInputSchema,
  RenameUsernameInputSchema,
  RESERVED_USERNAME_PATH_SET
} from "@tsu-stack/core";
import { contactRepository, usernameSlugAliasRepository, userRepository } from "@tsu-stack/db";
import { type UserSchemaSelect } from "@tsu-stack/db/types";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";
import { resolvePublicPortfolioContext } from "#@/lib/public-portfolio/resolve-context";
import { toContactOutput } from "#@/routers/portfolio.mappers";

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
      description: "Get public contacts for a profile by username",
      method: "GET"
    })
    .input(PublicUsernameInputSchema)
    .output(z.array(contactOutputSchema))
    .errors({
      NOT_FOUND: {
        message: "Profile not found",
        status: 404
      }
    })
    .handler(async ({ input, context, errors }) => {
      const resolved = await resolvePublicPortfolioContext({
        host: context.host,
        pathUsername: input.username
      });
      if (!resolved) {
        throw errors.NOT_FOUND();
      }
      const contacts = await contactRepository.findOptedInByUserId(resolved.userId);
      return (contacts ?? []).map(toContactOutput);
    }),
  update: protectedProcedure
    .route({
      description: "Update the current owner's profile (name, email) and contact info",
      method: "POST"
    })
    .input(ProfileUpdateInputSchema)
    .output(ProfileOutputSchema)
    .errors({
      EMAIL_TAKEN: { message: "That email is already in use.", status: 409 }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;

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

      // Avatar image is owned by Better Auth (authClient.updateUser) — not this procedure.
      const updatedUser = await userRepository.update(userId, {
        name: input.name,
        email: input.email,
        summary: input.summary,
        ...(emailChanged ? { emailVerified: false } : {})
      });
      if (!updatedUser) {
        throw new Error("Profile update did not affect any row");
      }

      const contacts =
        input.contacts !== undefined
          ? await contactRepository.upsert(userId, input.contacts)
          : await contactRepository.findByUserId(userId);

      return toProfileOutput(updatedUser, contacts);
    }),
  checkUsername: protectedProcedure
    .route({
      description: "Check whether a public username is available for the current user",
      method: "GET"
    })
    .input(CheckUsernameInputSchema)
    .output(CheckUsernameOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const username = input.username;

      const parsed = parseUsername(username);
      if (!parsed.success) {
        const reserved = RESERVED_USERNAME_PATH_SET.has(username);
        return {
          username,
          available: false,
          status: reserved ? ("reserved" as const) : ("invalid" as const),
          message: reserved
            ? "This name is reserved"
            : (parsed.error.issues[0]?.message ??
              "Invalid username. Use 3–30 lowercase letters, numbers, and single hyphens.")
        };
      }

      const normalized = parsed.data;

      const current = await userRepository.findById(userId);
      if (current?.username === normalized) {
        return {
          username: normalized,
          available: true,
          status: "current" as const
        };
      }

      const nameOwner = await userRepository.findByUsername(normalized);
      if (nameOwner && nameOwner.id !== userId) {
        return {
          username: normalized,
          available: false,
          status: "taken" as const,
          message: "That username is already taken."
        };
      }

      const aliasOwner = await usernameSlugAliasRepository.findBySlug(normalized);
      if (aliasOwner && aliasOwner.userId !== userId) {
        return {
          username: normalized,
          available: false,
          status: "taken" as const,
          message: "That username is already taken."
        };
      }

      return {
        username: normalized,
        available: true,
        status: "available" as const
      };
    }),
  rename: protectedProcedure
    .route({
      description: "Rename the current user's public username; previous slug is kept as an alias",
      method: "POST"
    })
    .input(RenameUsernameInputSchema)
    .output(ProfileOutputSchema)
    .errors({
      USERNAME_TAKEN: {
        message: "That username is already taken.",
        status: 409
      },
      USERNAME_INVALID: {
        message: "Invalid username. Use 3–30 lowercase letters, numbers, and single hyphens.",
        status: 400
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;

      // RenameUsernameInputSchema already applies UsernameSchema.
      const newName = input.username;

      const current = await userRepository.findById(userId);
      if (!current) {
        throw new Error("Session references a user that no longer exists");
      }

      const oldName = current.username;

      if (oldName === newName) {
        const contacts = await contactRepository.findByUserId(userId);
        return toProfileOutput(current, contacts);
      }

      const nameOwner = await userRepository.findByUsername(newName);
      if (nameOwner && nameOwner.id !== userId) {
        throw errors.USERNAME_TAKEN();
      }

      const aliasOwner = await usernameSlugAliasRepository.findBySlug(newName);
      if (aliasOwner && aliasOwner.userId !== userId) {
        throw errors.USERNAME_TAKEN();
      }

      // 1. Preserve the old public path as an alias (skip if already an alias row).
      if (oldName) {
        const existingOldAlias = await usernameSlugAliasRepository.findBySlug(oldName);
        if (!existingOldAlias) {
          await usernameSlugAliasRepository.create({
            id: crypto.randomUUID(),
            userId,
            slug: oldName
          });
        }
      }

      // 2. Point user at the new username.
      const updatedUser = await userRepository.updateUsername(userId, newName);
      if (!updatedUser) {
        throw new Error("Profile rename did not affect any row");
      }

      // 3. If the new name was one of our own aliases, drop that alias.
      if (aliasOwner && aliasOwner.userId === userId) {
        await usernameSlugAliasRepository.deleteByUserIdAndSlug(userId, newName);
      }

      const contacts = await contactRepository.findByUserId(userId);
      return toProfileOutput(updatedUser, contacts);
    })
};
