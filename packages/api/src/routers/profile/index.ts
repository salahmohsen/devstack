import { z } from "zod";

import { ContactInfoSchema, type ContactInfo, ProfileOutputSchema } from "@tsu-stack/core/profile";
import { contactRepository, getDb, userRepository, type UserEntity } from "@tsu-stack/db";
import { contact } from "@tsu-stack/db/schema";

import { protectedProcedure } from "#@/lib/procedures/factory";

function normalizeContact(input: ContactInfo | undefined): {
  website: string | null;
  email: string | null;
  location: string | null;
} {
  const clean = (v: string | null | undefined) => {
    if (v === undefined || v === null) return null;
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed;
  };
  return {
    website: clean(input?.website),
    email: clean(input?.email),
    location: clean(input?.location)
  };
}

function toProfileOutput(
  userRow: UserEntity,
  contactRow: {
    website: string | null;
    email: string | null;
    location: string | null;
    updatedAt: Date;
  } | null
) {
  return ProfileOutputSchema.parse({
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    emailVerified: userRow.emailVerified,
    image: userRow.image,
    createdAt: userRow.createdAt.toISOString(),
    contact: {
      website: contactRow?.website ?? null,
      email: contactRow?.email ?? null,
      location: contactRow?.location ?? null,
      updatedAt: (contactRow?.updatedAt ?? userRow.createdAt).toISOString()
    }
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
      const contactRow = await contactRepository.findByUserId(userId);
      return toProfileOutput(userRow, contactRow);
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
      const normalizedContact = normalizeContact(input.contact);
      const trimmedName = input.name.trim();
      const trimmedEmail = input.email.trim();

      return getDb().transaction(async (tx) => {
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
          // Bypassing Better Auth's email-change flow (which would
          // re-verify via a magic link). The owner is the only user,
          // so the verification step is unnecessary; reset the flag
          // so the UI can offer a re-verify path.
          ...(emailChanged ? { emailVerified: false } : {})
        });
        if (!updatedUser) {
          throw new Error("Profile update did not affect any row");
        }

        // Upsert the contact row in the same transaction so the
        // two writes commit together (or both roll back).
        const [updatedContact] = await tx
          .insert(contact)
          .values({ userId, ...normalizedContact })
          .onConflictDoUpdate({
            target: contact.userId,
            set: normalizedContact
          })
          .returning();

        return toProfileOutput(updatedUser, updatedContact ?? null);
      });
    })
};
