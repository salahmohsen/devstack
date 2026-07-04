import {
  and,
  eq,
  isNotNull,
  type InferInsertModel,
  type InferSelectModel,
  type SQL
} from "drizzle-orm";

import { getDb } from "#@/index";
import { contact } from "#@/schema/contact.schema";
import { type ContactSchemaSelect } from "#@/types/contact.schema";

export type ContactEntity = InferSelectModel<typeof contact>;
export type UpdateContactData = Pick<InferInsertModel<typeof contact>, "icon" | "type" | "value">;

export const contactRepository = {
  async findByUserId(userId: string): Promise<ContactEntity[]> {
    return await getDb().query.contact.findMany({
      where: { userId }
    });
  },
  async findOptedInByUserId(userId: string, extraWhere?: SQL): Promise<ContactEntity[]> {
    return getDb()
      .select()
      .from(contact)
      .where(
        extraWhere
          ? and(eq(contact.userId, userId), isNotNull(contact.portfolioEntryId), extraWhere)
          : and(eq(contact.userId, userId), isNotNull(contact.portfolioEntryId))
      );
  },
  async getAdminContact(): Promise<ContactSchemaSelect[]> {
    return await getDb().query.contact.findMany();
  },

  async upsert(userId: string, input: UpdateContactData[]) {
    await getDb().delete(contact).where(eq(contact.userId, userId));

    if (input.length === 0) return [];

    return await getDb()
      .insert(contact)
      .values(
        input.map((item) => {
          return { userId, ...item };
        })
      )
      .returning();
  }
};
