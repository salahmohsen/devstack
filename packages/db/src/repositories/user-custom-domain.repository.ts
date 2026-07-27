import { and, eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { userCustomDomain } from "../schema/user-custom-domain.schema.ts";

export type UserCustomDomainEntity = InferSelectModel<typeof userCustomDomain>;

export type UpsertUserCustomDomainInput = {
  id: string;
  userId: string;
  hostname: string;
  verificationToken: string;
};

export const userCustomDomainRepository = {
  async findByUserId(userId: string): Promise<UserCustomDomainEntity | null> {
    const [row] = await getDb()
      .select()
      .from(userCustomDomain)
      .where(eq(userCustomDomain.userId, userId))
      .limit(1);

    return row ?? null;
  },

  async findByHostname(hostname: string): Promise<UserCustomDomainEntity | null> {
    const normalized = hostname.trim().toLowerCase();
    if (!normalized) return null;

    const [row] = await getDb()
      .select()
      .from(userCustomDomain)
      .where(eq(userCustomDomain.hostname, normalized))
      .limit(1);

    return row ?? null;
  },

  /** Only verified domains participate in Host → portfolio routing. */
  async findVerifiedByHostname(hostname: string): Promise<UserCustomDomainEntity | null> {
    const normalized = hostname.trim().toLowerCase();
    if (!normalized) return null;

    const [row] = await getDb()
      .select()
      .from(userCustomDomain)
      .where(
        and(eq(userCustomDomain.hostname, normalized), eq(userCustomDomain.status, "verified"))
      )
      .limit(1);

    return row ?? null;
  },

  /**
   * v1: one row per user. Replaces hostname/token and resets to pending.
   * Caller must ensure hostname is not taken by another user.
   */
  async upsertForUser(input: UpsertUserCustomDomainInput): Promise<UserCustomDomainEntity> {
    const hostname = input.hostname.trim().toLowerCase();
    const existing = await userCustomDomainRepository.findByUserId(input.userId);

    if (existing) {
      const [row] = await getDb()
        .update(userCustomDomain)
        .set({
          hostname,
          verificationToken: input.verificationToken,
          status: "pending",
          verifiedAt: null
        })
        .where(eq(userCustomDomain.userId, input.userId))
        .returning();

      if (!row) {
        throw new Error("Failed to update custom domain");
      }
      return row;
    }

    const [row] = await getDb()
      .insert(userCustomDomain)
      .values({
        id: input.id,
        userId: input.userId,
        hostname,
        verificationToken: input.verificationToken,
        status: "pending",
        verifiedAt: null
      } satisfies InferInsertModel<typeof userCustomDomain>)
      .returning();

    if (!row) {
      throw new Error("Failed to create custom domain");
    }
    return row;
  },

  async markVerified(userId: string): Promise<UserCustomDomainEntity | null> {
    const [row] = await getDb()
      .update(userCustomDomain)
      .set({
        status: "verified",
        verifiedAt: new Date()
      })
      .where(eq(userCustomDomain.userId, userId))
      .returning();

    return row ?? null;
  },

  async markFailed(userId: string): Promise<UserCustomDomainEntity | null> {
    const [row] = await getDb()
      .update(userCustomDomain)
      .set({
        status: "failed",
        verifiedAt: null
      })
      .where(eq(userCustomDomain.userId, userId))
      .returning();

    return row ?? null;
  },

  async remove(userId: string): Promise<boolean> {
    const deleted = await getDb()
      .delete(userCustomDomain)
      .where(eq(userCustomDomain.userId, userId))
      .returning({ id: userCustomDomain.id });

    return deleted.length > 0;
  }
};
