import { and, eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { profileSlugAlias } from "../schema/profile-slug-alias.schema.ts";

export type ProfileSlugAliasEntity = InferSelectModel<typeof profileSlugAlias>;

export type CreateProfileSlugAliasInput = {
  id: string;
  userId: string;
  slug: string;
};

export const profileSlugAliasRepository = {
  async findBySlug(slug: string): Promise<ProfileSlugAliasEntity | null> {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return null;

    const [row] = await getDb()
      .select()
      .from(profileSlugAlias)
      .where(eq(profileSlugAlias.slug, normalized))
      .limit(1);

    return row ?? null;
  },

  async listByUserId(userId: string): Promise<ProfileSlugAliasEntity[]> {
    return getDb().select().from(profileSlugAlias).where(eq(profileSlugAlias.userId, userId));
  },

  async create(input: CreateProfileSlugAliasInput): Promise<ProfileSlugAliasEntity> {
    const slug = input.slug.trim().toLowerCase();
    const [row] = await getDb()
      .insert(profileSlugAlias)
      .values({
        id: input.id,
        userId: input.userId,
        slug
      } satisfies InferInsertModel<typeof profileSlugAlias>)
      .returning();

    if (!row) {
      throw new Error("Failed to create profile slug alias");
    }
    return row;
  },

  async deleteByUserIdAndSlug(userId: string, slug: string): Promise<boolean> {
    const normalized = slug.trim().toLowerCase();
    const deleted = await getDb()
      .delete(profileSlugAlias)
      .where(and(eq(profileSlugAlias.userId, userId), eq(profileSlugAlias.slug, normalized)))
      .returning({ id: profileSlugAlias.id });

    return deleted.length > 0;
  }
};
