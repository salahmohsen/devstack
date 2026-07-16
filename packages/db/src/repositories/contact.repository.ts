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
import { portfolioEntry } from "#@/schema/portfolio-entry.schema";
import { type ContactSchemaSelect } from "#@/types/contact.schema";

export type ContactEntity = InferSelectModel<typeof contact>;

export type UpsertContactItem = {
  id?: string;
  type: InferInsertModel<typeof contact>["type"];
  value: string;
  icon: string;
  includedInPortfolio?: boolean;
};

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

  /**
   * Sync contacts for a user from a form payload.
   *
   * - Items with an `id` are patched in place (preserves `portfolioEntryId`).
   * - Items without an `id` are inserted (the server assigns a uuid).
   * - If multiple items share the same `type`, only the last one is honoured —
   *   the contact table has a unique `(userId, type)` constraint and the
   *   form's "Add contact" button can produce duplicates.
   * - For each item where `includedInPortfolio` is defined, the matching
   *   `portfolioEntry` (keyed by `entityId = id`) is created or removed
   *   inside the same transaction so the toggle stays stable.
   * - Existing rows whose `(userId, type)` is not represented in `input` are
   *   left untouched so the admin can keep seeded contact rows even when the
   *   form only edits a subset.
   */
  async upsert(userId: string, input: UpsertContactItem[]): Promise<ContactEntity[]> {
    if (input.length === 0) {
      await getDb().delete(contact).where(eq(contact.userId, userId));
      return [];
    }

    const byType = new Map<UpsertContactItem["type"], UpsertContactItem>();
    for (const item of input) {
      byType.set(item.type, item);
    }
    const deduped = [...byType.values()];

    await getDb().transaction(async (tx) => {
      for (const item of deduped) {
        if (item.id) {
          await tx
            .update(contact)
            .set({ value: item.value, icon: item.icon })
            .where(and(eq(contact.userId, userId), eq(contact.id, item.id)));
        } else {
          await tx.insert(contact).values({
            id: crypto.randomUUID(),
            userId,
            type: item.type,
            value: item.value,
            icon: item.icon
          });
        }
      }

      for (const item of deduped) {
        if (item.includedInPortfolio === undefined) continue;

        const row = await tx.query.contact.findFirst({
          where: { userId, type: item.type }
        });
        if (!row) continue;

        const existing = await tx.query.portfolioEntry.findFirst({
          where: { type: "contact", entityId: row.id }
        });

        if (item.includedInPortfolio) {
          if (!existing) {
            const pid = crypto.randomUUID();
            await tx.insert(portfolioEntry).values({
              id: pid,
              type: "contact",
              entityId: row.id
            });
            await tx.update(contact).set({ portfolioEntryId: pid }).where(eq(contact.id, row.id));
          } else if (row.portfolioEntryId !== existing.id) {
            await tx
              .update(contact)
              .set({ portfolioEntryId: existing.id })
              .where(eq(contact.id, row.id));
          }
        } else if (existing) {
          await tx
            .delete(portfolioEntry)
            .where(and(eq(portfolioEntry.type, "contact"), eq(portfolioEntry.entityId, row.id)));
          if (row.portfolioEntryId !== null) {
            await tx.update(contact).set({ portfolioEntryId: null }).where(eq(contact.id, row.id));
          }
        }
      }
    });

    return contactRepository.findByUserId(userId);
  }
};
