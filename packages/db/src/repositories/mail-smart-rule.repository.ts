import { and, asc, eq, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { mailSmartRule } from "../schema/mail-smart-rule.schema.ts";

export type MailSmartRuleEntity = InferSelectModel<typeof mailSmartRule>;

export type CreateMailSmartRuleData = {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description?: string;
  icon?: string;
  keywords?: string[];
  enabled?: boolean;
  sortOrder?: number;
};

export type UpdateMailSmartRuleData = {
  title?: string;
  description?: string;
  icon?: string;
  keywords?: string[];
  enabled?: boolean;
  sortOrder?: number;
};

export const mailSmartRuleRepository = {
  async findByUserId(
    userId: string,
    opts?: { enabledOnly?: boolean }
  ): Promise<MailSmartRuleEntity[]> {
    const conditions = [eq(mailSmartRule.userId, userId)];
    if (opts?.enabledOnly) conditions.push(eq(mailSmartRule.enabled, true));

    return getDb()
      .select()
      .from(mailSmartRule)
      .where(and(...conditions))
      .orderBy(asc(mailSmartRule.sortOrder), asc(mailSmartRule.title));
  },

  async findByIdForUser(id: string, userId: string): Promise<MailSmartRuleEntity | null> {
    const [row] = await getDb()
      .select()
      .from(mailSmartRule)
      .where(and(eq(mailSmartRule.id, id), eq(mailSmartRule.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async findBySlugForUser(slug: string, userId: string): Promise<MailSmartRuleEntity | null> {
    const [row] = await getDb()
      .select()
      .from(mailSmartRule)
      .where(and(eq(mailSmartRule.slug, slug), eq(mailSmartRule.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async create(input: CreateMailSmartRuleData): Promise<MailSmartRuleEntity> {
    const [row] = await getDb()
      .insert(mailSmartRule)
      .values({
        id: input.id,
        userId: input.userId,
        slug: input.slug,
        title: input.title,
        description: input.description ?? "",
        icon: input.icon ?? "sparkles",
        keywords: input.keywords ?? [],
        enabled: input.enabled ?? true,
        sortOrder: input.sortOrder ?? 0
      })
      .returning();
    return row!;
  },

  async update(
    id: string,
    userId: string,
    patch: UpdateMailSmartRuleData
  ): Promise<MailSmartRuleEntity | null> {
    const [row] = await getDb()
      .update(mailSmartRule)
      .set({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
        ...(patch.keywords !== undefined ? { keywords: patch.keywords } : {}),
        ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
        ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {})
      })
      .where(and(eq(mailSmartRule.id, id), eq(mailSmartRule.userId, userId)))
      .returning();
    return row ?? null;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const rows = await getDb()
      .delete(mailSmartRule)
      .where(and(eq(mailSmartRule.id, id), eq(mailSmartRule.userId, userId)))
      .returning({ id: mailSmartRule.id });
    return rows.length > 0;
  }
};
