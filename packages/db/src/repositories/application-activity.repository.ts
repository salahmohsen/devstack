import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  sql,
  type InferInsertModel,
  type InferSelectModel
} from "drizzle-orm";

import { getDb } from "../index.ts";
import {
  applicationActivity,
  type ApplicationActivityKind
} from "../schema/application-activity.schema.ts";
import { application } from "../schema/application.schema.ts";

const TODAY_MOVE_KINDS = [
  "stage_changed",
  "outcome_set",
  "promoted"
] as const satisfies readonly ApplicationActivityKind[];

export type ApplicationMoveSince = {
  id: string;
  applicationId: string;
  kind: ApplicationActivityKind;
  body: string | null;
  createdAt: Date;
  title: string;
  companyName: string;
};

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

  /** Tracked pipeline moves in the Today window. Newest first. */
  async listMovesSince(input: {
    userId: string;
    since: Date;
    limit?: number;
  }): Promise<ApplicationMoveSince[]> {
    const limit = input.limit ?? 20;
    const rows = await getDb()
      .select({
        id: applicationActivity.id,
        applicationId: applicationActivity.applicationId,
        kind: applicationActivity.kind,
        body: applicationActivity.body,
        createdAt: applicationActivity.createdAt,
        title: application.title,
        companyName: application.companyName
      })
      .from(applicationActivity)
      .innerJoin(application, eq(applicationActivity.applicationId, application.id))
      .where(
        and(
          eq(applicationActivity.userId, input.userId),
          gte(applicationActivity.createdAt, input.since),
          inArray(applicationActivity.kind, [...TODAY_MOVE_KINDS])
        )
      )
      .orderBy(desc(applicationActivity.createdAt))
      .limit(limit);
    return rows;
  },

  async countMovesSince(input: { userId: string; since: Date }): Promise<number> {
    const [row] = await getDb()
      .select({ n: sql<number>`count(*)::int` })
      .from(applicationActivity)
      .where(
        and(
          eq(applicationActivity.userId, input.userId),
          gte(applicationActivity.createdAt, input.since),
          inArray(applicationActivity.kind, [...TODAY_MOVE_KINDS])
        )
      );
    return row?.n ?? 0;
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
  },

  async findByIdForUser(id: string, userId: string): Promise<ApplicationActivityEntity | null> {
    const [row] = await getDb()
      .select()
      .from(applicationActivity)
      .where(and(eq(applicationActivity.id, id), eq(applicationActivity.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async deleteByIdForUser(id: string, userId: string): Promise<boolean> {
    const [row] = await getDb()
      .delete(applicationActivity)
      .where(and(eq(applicationActivity.id, id), eq(applicationActivity.userId, userId)))
      .returning({ id: applicationActivity.id });
    return Boolean(row);
  }
};
