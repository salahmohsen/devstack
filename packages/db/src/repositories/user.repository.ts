import { eq, type InferSelectModel } from "drizzle-orm";

import { getDb } from "#@/index";
import { user } from "#@/schema/auth.schema";

export type UserEntity = InferSelectModel<typeof user>;

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
  async findById(id: string): Promise<UserEntity | null> {
    const [row] = await getDb().select().from(user).where(eq(user.id, id)).limit(1);
    return row ?? null;
  },

  async findByEmail(email: string): Promise<UserEntity | null> {
    const [row] = await getDb().select().from(user).where(eq(user.email, email)).limit(1);
    return row ?? null;
  },

  async update(
    id: string,
    input: { name?: string; email?: string; emailVerified?: boolean }
  ): Promise<UserEntity | null> {
    const [row] = await getDb().update(user).set(input).where(eq(user.id, id)).returning();
    return row ?? null;
  }
};
