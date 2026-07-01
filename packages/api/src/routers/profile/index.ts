import { z } from "zod";

import { ContactInfoSchema, ProfileOutputSchema, type ContactInfo } from "@tsu-stack/core/profile";
import { contactRepository, userRepository, type UserEntity } from "@tsu-stack/db";

import { protectedProcedure } from "#@/lib/procedures/factory";

function normalizeContact(input: ContactInfo | undefined): Array<{
  type: "website" | "email" | "location";
  value: string;
  icon: string;
}> {
  if (!input) return [];
  const items: Array<{
    type: "website" | "email" | "location";
    value: string;
    icon: string;
  }> = [];
  if (input.website) items.push({ type: "website", value: input.website, icon: "globe" });
  if (input.email) items.push({ type: "email", value: input.email, icon: "mail" });
  if (input.location) items.push({ type: "location", value: input.location, icon: "map-pin" });
  return items;
}

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
    createdAt: userRow.createdAt.toISOString(),
    contact: contacts
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

  update: protectedProcedure
    .route({
      description:
        "Update the current owner's profile (name, email) and contact info (website, email, location)",
      method: "POST"
    })
    .input(
      z.object({
        name: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(320),
        contact: ContactInfoSchema.optional()
      })
    )
    .output(ProfileOutputSchema)
    .errors({
      EMAIL_TAKEN: { message: "That email is already in use.", status: 409 }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const contactItems = normalizeContact(input.contact);
      const trimmedName = input.name.trim();
      const trimmedEmail = input.email.trim();

      const current = await userRepository.findById(userId);
      if (!current) {
        throw new Error("Session references a user that no longer exists");
      }

      const emailChanged = current.email !== trimmedEmail;

      if (emailChanged) {
        const collision = await userRepository.findByEmail(trimmedEmail);
        if (collision && collision.id !== userId) {
          throw errors.EMAIL_TAKEN();
        }
      }

      const updatedUser = await userRepository.update(userId, {
        name: trimmedName,
        email: trimmedEmail,
        ...(emailChanged ? { emailVerified: false } : {})
      });
      if (!updatedUser) {
        throw new Error("Profile update did not affect any row");
      }

      await contactRepository.upsert(userId, contactItems);

      const contacts = await contactRepository.findByUserId(userId);
      return toProfileOutput(updatedUser, contacts);
    })
};
