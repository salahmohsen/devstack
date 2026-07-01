import { eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "#@/index";
import { contact } from "#@/schema/contact.schema";

export type ContactEntity = InferSelectModel<typeof contact>;
export type UpdateContactData = Pick<
  InferInsertModel<typeof contact>,
  "website" | "email" | "location"
>;

export const contactRepository = {
  async findByUserId(userId: string): Promise<ContactEntity | null> {
    return (await getDb().query.contact.findFirst({ where: { userId } })) ?? null;
  },

  async upsert(userId: string, input: UpdateContactData) {
    const existing = await contactRepository.findByUserId(userId);

    if (existing) {
      const [updated] = await getDb()
        .update(contact)
        .set({
          website: input.website ?? null,
          email: input.email ?? null,
          location: input.location ?? null
        })
        .where(eq(contact.userId, userId))
        .returning();

      return updated ?? null;
    }

    const [created] = await getDb()
      .insert(contact)
      .values({
        userId,
        website: input.website ?? null,
        email: input.email ?? null,
        location: input.location ?? null
      })
      .returning();

    return created ?? null;
  }
};
