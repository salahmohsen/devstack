import { and, eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { usernameSlugAlias } from "../schema/username-slug-alias.schema.ts";

export type UsernameSlugAliasEntity = InferSelectModel<typeof usernameSlugAlias>;

export type CreateUsernameSlugAliasInput = {
  id: string;
  userId: string;
  slug: string;
};

export const usernameSlugAliasRepository = {
  async findBySlug(slug: string): Promise<UsernameSlugAliasEntity | null> {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return null;

    const [row] = await getDb()
      .select()
      .from(usernameSlugAlias)
      .where(eq(usernameSlugAlias.slug, normalized))
      .limit(1);

    return row ?? null;
  },

  async listByUserId(userId: string): Promise<UsernameSlugAliasEntity[]> {
    return getDb().select().from(usernameSlugAlias).where(eq(usernameSlugAlias.userId, userId));
  },

  async create(input: CreateUsernameSlugAliasInput): Promise<UsernameSlugAliasEntity> {
    const slug = input.slug.trim().toLowerCase();
    const [row] = await getDb()
      .insert(usernameSlugAlias)
      .values({
        id: input.id,
        userId: input.userId,
        slug
      } satisfies InferInsertModel<typeof usernameSlugAlias>)
      .returning();

    if (!row) {
      throw new Error("Failed to create username slug alias");
    }
    return row;
  },

  async deleteByUserIdAndSlug(userId: string, slug: string): Promise<boolean> {
    const normalized = slug.trim().toLowerCase();
    const deleted = await getDb()
      .delete(usernameSlugAlias)
      .where(and(eq(usernameSlugAlias.userId, userId), eq(usernameSlugAlias.slug, normalized)))
      .returning({ id: usernameSlugAlias.id });

    return deleted.length > 0;
  }
};

/** @deprecated Use usernameSlugAliasRepository */
export const profileSlugAliasRepository = usernameSlugAliasRepository;
/** @deprecated */
export type ProfileSlugAliasEntity = UsernameSlugAliasEntity;
/** @deprecated */
export type CreateProfileSlugAliasInput = CreateUsernameSlugAliasInput;
