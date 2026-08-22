import { count, desc, eq, ilike, max, or, sql } from "drizzle-orm";

import { getDb } from "../index.ts";
import { application } from "../schema/application.schema.ts";
import { account, session, user } from "../schema/auth.schema.ts";
import { experience } from "../schema/experience.schema.ts";
import { mailMessage } from "../schema/mail-message.schema.ts";
import { project } from "../schema/project.schema.ts";
import { stack } from "../schema/stack.schema.ts";
import { userCustomDomain } from "../schema/user-custom-domain.schema.ts";
import { usernameSlugAlias } from "../schema/username-slug-alias.schema.ts";
import { type UserSchemaInsert, type UserSchemaSelect } from "../types/auth.schema.ts";

/**
 * Read access to the `user` table for the API layer.
 *
 * The `user` table is owned by Better Auth for the auth lifecycle
 * (sign-in, sign-up, magic link, password reset, etc.). The API
 * uses this repository for the *profile* surface — the bits the
 * Better Auth API does not own (name + email changes triggered
 * from the dashboard, plus the rows the profile endpoint reads
 * back to the client). Avatar image is preferred via
 * `authClient.updateUser`. Username renames go through updateUsername.
 */
export const userRepository = {
  async findById(id: string): Promise<UserSchemaSelect | null> {
    const [row] = await getDb().select().from(user).where(eq(user.id, id)).limit(1);
    return row ?? null;
  },

  async findByEmail(email: string): Promise<UserSchemaSelect | null> {
    const [row] = await getDb().select().from(user).where(eq(user.email, email)).limit(1);
    return row ?? null;
  },

  async findByUsername(username: string): Promise<UserSchemaSelect | null> {
    const [row] = await getDb().select().from(user).where(eq(user.username, username)).limit(1);
    return row ?? null;
  },

  /** True if username is taken by a user row or a username_slug_alias.slug. */
  async isUsernameTaken(username: string): Promise<boolean> {
    const existing = await userRepository.findByUsername(username);
    if (existing) return true;

    const [alias] = await getDb()
      .select({ id: usernameSlugAlias.id })
      .from(usernameSlugAlias)
      .where(eq(usernameSlugAlias.slug, username))
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

  async updateUsername(id: string, username: string): Promise<UserSchemaSelect | null> {
    return userRepository.update(id, { username, displayUsername: username });
  },

  async countByRole(role: string): Promise<number> {
    const [row] = await getDb().select({ value: count() }).from(user).where(eq(user.role, role));
    return Number(row?.value ?? 0);
  },

  async countBanned(): Promise<number> {
    const [row] = await getDb().select({ value: count() }).from(user).where(eq(user.banned, true));
    return Number(row?.value ?? 0);
  },

  async listForAdmin(input: { q?: string; limit: number; offset: number }): Promise<{
    items: Array<UserSchemaSelect & { lastSeenAt: Date | null; sessionCount: number }>;
    total: number;
  }> {
    const db = getDb();
    const q = input.q?.trim();
    const search = q
      ? or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`), ilike(user.username, `%${q}%`))
      : undefined;

    const [totalRow] = await db.select({ value: count() }).from(user).where(search);

    const rows = await db
      .select({
        user,
        lastSeenAt: max(session.updatedAt),
        sessionCount: sql<number>`count(${session.id})::int`
      })
      .from(user)
      .leftJoin(session, eq(session.userId, user.id))
      .where(search)
      .groupBy(user.id)
      .orderBy(desc(user.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return {
      items: rows.map((row) => {
        return {
          ...row.user,
          lastSeenAt: row.lastSeenAt ?? null,
          sessionCount: Number(row.sessionCount ?? 0)
        };
      }),
      total: Number(totalRow?.value ?? 0)
    };
  },

  async listProviders(userId: string): Promise<Array<{ providerId: string }>> {
    const rows = await getDb()
      .select({ providerId: account.providerId })
      .from(account)
      .where(eq(account.userId, userId));
    return rows;
  },

  async tenantCounts(userId: string): Promise<{
    experiences: number;
    projects: number;
    stacks: number;
    applications: number;
    mailMessages: number;
  }> {
    const db = getDb();
    const [experiences, projects, stacks, applications, mailMessages] = await Promise.all([
      db.select({ value: count() }).from(experience).where(eq(experience.userId, userId)),
      db.select({ value: count() }).from(project).where(eq(project.userId, userId)),
      db.select({ value: count() }).from(stack).where(eq(stack.userId, userId)),
      db.select({ value: count() }).from(application).where(eq(application.userId, userId)),
      db.select({ value: count() }).from(mailMessage).where(eq(mailMessage.userId, userId))
    ]);
    return {
      experiences: Number(experiences[0]?.value ?? 0),
      projects: Number(projects[0]?.value ?? 0),
      stacks: Number(stacks[0]?.value ?? 0),
      applications: Number(applications[0]?.value ?? 0),
      mailMessages: Number(mailMessages[0]?.value ?? 0)
    };
  },

  async findCustomDomainHostname(userId: string): Promise<string | null> {
    const [row] = await getDb()
      .select({ hostname: userCustomDomain.hostname })
      .from(userCustomDomain)
      .where(eq(userCustomDomain.userId, userId))
      .limit(1);
    return row?.hostname ?? null;
  },

  async sessionStats(userId: string): Promise<{ lastSeenAt: Date | null; sessionCount: number }> {
    const [row] = await getDb()
      .select({
        lastSeenAt: max(session.updatedAt),
        sessionCount: sql<number>`count(${session.id})::int`
      })
      .from(session)
      .where(eq(session.userId, userId));
    return {
      lastSeenAt: row?.lastSeenAt ?? null,
      sessionCount: Number(row?.sessionCount ?? 0)
    };
  },

  async revokeSessions(userId: string): Promise<number> {
    const deleted = await getDb()
      .delete(session)
      .where(eq(session.userId, userId))
      .returning({ id: session.id });
    return deleted.length;
  }
};
