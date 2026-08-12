import { and, asc, desc, eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import {
  applicationActivity,
  type ApplicationActivityKind
} from "../schema/application-activity.schema.ts";

export type ApplicationActivityEntity = InferSelectModel<typeof applicationActivity>;

export type CreateApplicationActivityData = {
  userId: string;
  applicationId: string;
  kind: ApplicationActivityKind;
  body?: string | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
};

export const applicationActivityRepository = {
  async listByApplicationId(
    applicationId: string,
    userId: string,
    opts?: { limit?: number; order?: "asc" | "desc" }
  ) {
    const limit = opts?.limit ?? 100;
    const order = opts?.order === "desc" ? desc : asc;
    return getDb()
      .select()
      .from(applicationActivity)
      .where(
        and(
          eq(applicationActivity.applicationId, applicationId),
          eq(applicationActivity.userId, userId)
        )
      )
      .orderBy(order(applicationActivity.createdAt))
      .limit(limit);
  },

  async append(input: CreateApplicationActivityData): Promise<ApplicationActivityEntity> {
    const id = crypto.randomUUID();
    const [row] = await getDb()
      .insert(applicationActivity)
      .values({
        id,
        userId: input.userId,
        applicationId: input.applicationId,
        kind: input.kind,
        body: input.body ?? null,
        metadata: input.metadata ?? {},
        actorUserId: input.actorUserId ?? null
      } satisfies InferInsertModel<typeof applicationActivity>)
      .returning();
    if (!row) throw new Error("applicationActivityRepository.append: insert returned no row");
    return row;
  }
};
