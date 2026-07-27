import { count, eq } from "drizzle-orm";

import { getDb } from "../index.ts";
import { user } from "../schema/auth.schema.ts";
import { profileSlugAlias } from "../schema/profile-slug-alias.schema.ts";
import { type UserSchemaInsert, type UserSchemaSelect } from "../types/auth.schema.ts";

/**
 * Read access to the `user` table for the API layer.
 *
 * The `user` table is owned by Better Auth for the auth lifecycle
 * (sign-in, sign-up, magic link, password reset, etc.). The API
 * uses this repository for the *profile* surface — the bits the
 * Better Auth API does not own (name + email changes triggered
 * from the dashboard, plus the rows the profile endpoint reads
 * back to the client). Writes go through `update` here, not via
 * `authClient.updateUser` / `authClient.changeEmail`.
 */
export const userRepository = {
  async findById(id: string): Promise<UserSchemaSelect | null> {
    const [row] = await getDb().select().from(user).where(eq(user.id, id)).limit(1);
    return row ?? null;
  },

  async findFirst(): Promise<UserSchemaSelect | null> {
    const [row] = await getDb().select().from(user).limit(1);
    return row ?? null;
  },

  async findByEmail(email: string): Promise<UserSchemaSelect | null> {
    const [row] = await getDb().select().from(user).where(eq(user.email, email)).limit(1);
    return row ?? null;
  },

  async findByProfileName(profileName: string): Promise<UserSchemaSelect | null> {
    const [row] = await getDb()
      .select()
      .from(user)
      .where(eq(user.profileName, profileName))
      .limit(1);
    return row ?? null;
  },

  /** True if profileName is taken by a user row or a profile_slug_alias.slug. */
  async isProfileNameTaken(profileName: string): Promise<boolean> {
    const existing = await userRepository.findByProfileName(profileName);
    if (existing) return true;

    const [alias] = await getDb()
      .select({ id: profileSlugAlias.id })
      .from(profileSlugAlias)
      .where(eq(profileSlugAlias.slug, profileName))
      .limit(1);
    return Boolean(alias);
  },

  async countUsers(): Promise<number> {
    const [row] = await getDb().select({ value: count() }).from(user);
    return Number(row?.value ?? 0);
  },

  /**
   * Fail-closed cleanup after invite markUsed races. Cascades to session/account/passkey.
   */
  async deleteById(id: string): Promise<boolean> {
    const deleted = await getDb().delete(user).where(eq(user.id, id)).returning({ id: user.id });
    return deleted.length > 0;
  },

  async update(
    id: string,
    input: Partial<UserSchemaInsert> & { emailVerified?: boolean }
  ): Promise<UserSchemaSelect | null> {
    const [updated] = await getDb().update(user).set(input).where(eq(user.id, id)).returning();

    if (!updated) return null;
    return userRepository.findById(id);
  },

  async setOnboardingCompletedAt(id: string, at: Date | null): Promise<UserSchemaSelect | null> {
    const [updated] = await getDb()
      .update(user)
      .set({ onboardingCompletedAt: at })
      .where(eq(user.id, id))
      .returning();
    return updated ?? null;
  },

  async updateProfileName(id: string, profileName: string): Promise<UserSchemaSelect | null> {
    return userRepository.update(id, { profileName });
  }
};
