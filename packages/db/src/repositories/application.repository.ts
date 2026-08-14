import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  sql,
  type InferInsertModel,
  type InferSelectModel
} from "drizzle-orm";

import { getDb } from "../index.ts";
import {
  applicationActivity,
  type ApplicationActivityKind
} from "../schema/application-activity.schema.ts";
import {
  application,
  type ApplicationOutcome,
  type ApplicationStage,
  type ApplicationTrackingStatus
} from "../schema/application.schema.ts";

export type ApplicationEntity = InferSelectModel<typeof application>;
export type CreateApplicationData = Omit<
  InferInsertModel<typeof application>,
  "id" | "createdAt" | "updatedAt" | "stageChangedAt" | "outcome" | "outcomeAt"
> & {
  stage?: ApplicationStage;
  stageChangedAt?: Date;
  outcome?: ApplicationOutcome | null;
  outcomeAt?: Date | null;
  trackingStatus?: ApplicationTrackingStatus;
};
export type UpdateApplicationData = Partial<
  Omit<
    CreateApplicationData,
    "userId" | "stage" | "stageChangedAt" | "outcome" | "outcomeAt" | "trackingStatus"
  >
>;

export const applicationRepository = {
  async findAllByUserId(userId: string) {
    return getDb()
      .select()
      .from(application)
      .where(eq(application.userId, userId))
      .orderBy(desc(application.updatedAt));
  },

  /** Open pipeline set: tracked + no terminal outcome. */
  async findOpenByUserId(userId: string) {
    return getDb()
      .select()
      .from(application)
      .where(
        and(
          eq(application.userId, userId),
          eq(application.trackingStatus, "tracked"),
          isNull(application.outcome)
        )
      )
      .orderBy(desc(application.updatedAt));
  },

  /**
   * CRM mail matcher candidates: **open tracked only** (design lock).
   * New jobs inbox is discovery surface — not CRM stage-match candidates.
   * Dismissed excluded. Same set as {@link findOpenByUserId}.
   */
  async findCrmMatchCandidatesByUserId(userId: string) {
    return this.findOpenByUserId(userId);
  },

  async findByUserIdAndTrackingStatus(userId: string, trackingStatus: ApplicationTrackingStatus) {
    return getDb()
      .select()
      .from(application)
      .where(and(eq(application.userId, userId), eq(application.trackingStatus, trackingStatus)))
      .orderBy(desc(application.updatedAt));
  },

  async countByUserIdAndTrackingStatus(
    userId: string,
    trackingStatus: ApplicationTrackingStatus
  ): Promise<number> {
    const [row] = await getDb()
      .select({ n: sql<number>`count(*)::int` })
      .from(application)
      .where(and(eq(application.userId, userId), eq(application.trackingStatus, trackingStatus)));
    return row?.n ?? 0;
  },

  async findByIdForUser(id: string, userId: string) {
    const rows = await getDb()
      .select()
      .from(application)
      .where(and(eq(application.id, id), eq(application.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Dedup harvest: existing open/closed app with same listing URL for tenant. */
  async findByUserIdAndUrl(userId: string, url: string) {
    const rows = await getDb()
      .select()
      .from(application)
      .where(and(eq(application.userId, userId), eq(application.url, url)))
      .limit(1);
    return rows[0] ?? null;
  },

  async create(input: CreateApplicationData) {
    const id = crypto.randomUUID();
    const now = new Date();
    const [created] = await getDb()
      .insert(application)
      .values({
        id,
        userId: input.userId,
        companyName: input.companyName,
        title: input.title,
        url: input.url ?? null,
        applyUrl: input.applyUrl ?? null,
        applyMethod: input.applyMethod ?? "unknown",
        matchScore: input.matchScore ?? null,
        source: input.source ?? null,
        sourceLabel: input.sourceLabel ?? null,
        sourceTags: input.sourceTags ?? [],
        location: input.location ?? null,
        salaryRange: input.salaryRange ?? null,
        employmentType: input.employmentType ?? "unknown",
        description: input.description ?? null,
        notes: input.notes ?? null,
        agentTake: input.agentTake ?? null,
        sourceMessageId: input.sourceMessageId ?? null,
        trackingStatus: input.trackingStatus ?? "tracked",
        stage: input.stage ?? "saved",
        stageChangedAt: input.stageChangedAt ?? now,
        outcome: null,
        outcomeAt: null,
        hiringUrgency: input.hiringUrgency ?? "unknown",
        resumeId: input.resumeId ?? null
      })
      .returning();
    return created;
  },

  /**
   * Race-safe harvest insert: unique on (userId, url) where url is not null.
   * Inserts when absent; on conflict returns the existing row without error.
   */
  async createIfAbsentByUrl(
    input: CreateApplicationData & { url: string }
  ): Promise<{ row: ApplicationEntity; created: boolean }> {
    const id = crypto.randomUUID();
    const now = new Date();
    const [inserted] = await getDb()
      .insert(application)
      .values({
        id,
        userId: input.userId,
        companyName: input.companyName,
        title: input.title,
        url: input.url,
        applyUrl: input.applyUrl ?? null,
        applyMethod: input.applyMethod ?? "unknown",
        matchScore: input.matchScore ?? null,
        source: input.source ?? null,
        sourceLabel: input.sourceLabel ?? null,
        sourceTags: input.sourceTags ?? [],
        location: input.location ?? null,
        salaryRange: input.salaryRange ?? null,
        employmentType: input.employmentType ?? "unknown",
        description: input.description ?? null,
        notes: input.notes ?? null,
        agentTake: input.agentTake ?? null,
        sourceMessageId: input.sourceMessageId ?? null,
        trackingStatus: input.trackingStatus ?? "tracked",
        stage: input.stage ?? "saved",
        stageChangedAt: input.stageChangedAt ?? now,
        outcome: null,
        outcomeAt: null,
        hiringUrgency: input.hiringUrgency ?? "unknown",
        resumeId: input.resumeId ?? null
      })
      .onConflictDoNothing({
        target: [application.userId, application.url],
        where: sql`${application.url} is not null`
      })
      .returning();

    if (inserted) {
      return { row: inserted, created: true };
    }

    const existing = await applicationRepository.findByUserIdAndUrl(input.userId, input.url);
    if (!existing) {
      throw new Error(
        `createIfAbsentByUrl: conflict without existing row for userId=${input.userId} url=${input.url}`
      );
    }
    return { row: existing, created: false };
  },

  async update(id: string, userId: string, patch: UpdateApplicationData) {
    const owned = await applicationRepository.findByIdForUser(id, userId);
    if (!owned) return null;

    const [updated] = await getDb()
      .update(application)
      .set({
        ...(patch.companyName !== undefined ? { companyName: patch.companyName } : {}),
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.url !== undefined ? { url: patch.url } : {}),
        ...(patch.applyUrl !== undefined ? { applyUrl: patch.applyUrl } : {}),
        ...(patch.applyMethod !== undefined ? { applyMethod: patch.applyMethod } : {}),
        ...(patch.matchScore !== undefined ? { matchScore: patch.matchScore } : {}),
        ...(patch.source !== undefined ? { source: patch.source } : {}),
        ...(patch.sourceLabel !== undefined ? { sourceLabel: patch.sourceLabel } : {}),
        ...(patch.sourceTags !== undefined ? { sourceTags: patch.sourceTags } : {}),
        ...(patch.location !== undefined ? { location: patch.location } : {}),
        ...(patch.salaryRange !== undefined ? { salaryRange: patch.salaryRange } : {}),
        ...(patch.employmentType !== undefined ? { employmentType: patch.employmentType } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.agentTake !== undefined ? { agentTake: patch.agentTake } : {}),
        ...(patch.sourceMessageId !== undefined ? { sourceMessageId: patch.sourceMessageId } : {}),
        ...(patch.hiringUrgency !== undefined ? { hiringUrgency: patch.hiringUrgency } : {}),
        ...(patch.resumeId !== undefined ? { resumeId: patch.resumeId } : {}),
        ...(patch.recruiterEmail !== undefined ? { recruiterEmail: patch.recruiterEmail } : {}),
        ...(patch.coverLetterBody !== undefined ? { coverLetterBody: patch.coverLetterBody } : {}),
        ...(patch.coverLetterR2Key !== undefined
          ? { coverLetterR2Key: patch.coverLetterR2Key }
          : {}),
        ...(patch.coverLetterFilename !== undefined
          ? { coverLetterFilename: patch.coverLetterFilename }
          : {}),
        ...(patch.outreachSubject !== undefined ? { outreachSubject: patch.outreachSubject } : {}),
        ...(patch.outreachBody !== undefined ? { outreachBody: patch.outreachBody } : {}),
        ...(patch.outreachSentAt !== undefined ? { outreachSentAt: patch.outreachSentAt } : {}),
        ...(patch.outreachProviderMessageId !== undefined
          ? { outreachProviderMessageId: patch.outreachProviderMessageId }
          : {}),
        ...(patch.applyPackageDraft !== undefined
          ? { applyPackageDraft: patch.applyPackageDraft }
          : {}),
        ...(patch.applyPackageDraftedAt !== undefined
          ? { applyPackageDraftedAt: patch.applyPackageDraftedAt }
          : {})
      })
      .where(and(eq(application.id, id), eq(application.userId, userId)))
      .returning();
    return updated ?? null;
  },

  /**
   * Tracking status transition (inbox / tracked / dismissed).
   * Does not change stage.
   */
  async setTrackingStatus(
    id: string,
    userId: string,
    trackingStatus: ApplicationTrackingStatus
  ): Promise<ApplicationEntity | null> {
    const owned = await applicationRepository.findByIdForUser(id, userId);
    if (!owned) return null;

    const [updated] = await getDb()
      .update(application)
      .set({ trackingStatus })
      .where(and(eq(application.id, id), eq(application.userId, userId)))
      .returning();
    return updated ?? null;
  },

  /**
   * Atomically transition tracking status and append matching activity rows.
   * Used by batch dismiss / restore so status + timeline never diverge.
   */
  async transitionTrackingStatusWithActivity(input: {
    ids: string[];
    userId: string;
    fromStatus: ApplicationTrackingStatus;
    toStatus: ApplicationTrackingStatus;
    activityKind: ApplicationActivityKind;
    actorUserId: string;
  }): Promise<ApplicationEntity[]> {
    const { ids, userId, fromStatus, toStatus, activityKind, actorUserId } = input;
    if (ids.length === 0) return [];
    const unique = [...new Set(ids)];

    return getDb().transaction(async (tx) => {
      const owned = await tx
        .select()
        .from(application)
        .where(and(eq(application.userId, userId), inArray(application.id, unique)));

      const toUpdate = owned
        .filter((row) => row.trackingStatus === fromStatus)
        .map((row) => row.id);
      if (toUpdate.length === 0) return [];

      const updated = await tx
        .update(application)
        .set({ trackingStatus: toStatus })
        .where(
          and(
            eq(application.userId, userId),
            eq(application.trackingStatus, fromStatus),
            inArray(application.id, toUpdate)
          )
        )
        .returning();

      if (updated.length > 0) {
        await tx.insert(applicationActivity).values(
          updated.map((row) => {
            return {
              id: crypto.randomUUID(),
              userId,
              applicationId: row.id,
              kind: activityKind,
              body: null,
              metadata: {},
              actorUserId
            };
          })
        );
      }

      return updated;
    });
  },

  /**
   * Stage change for open **tracked** applications only.
   * Returns `{ ok: false, reason: "not_found" | "closed" | "not_tracked" }` when blocked.
   */
  async updateStage(
    id: string,
    userId: string,
    stage: ApplicationStage
  ): Promise<
    | { ok: true; row: ApplicationEntity }
    | { ok: false; reason: "not_found" | "closed" | "not_tracked" }
  > {
    const owned = await applicationRepository.findByIdForUser(id, userId);
    if (!owned) return { ok: false, reason: "not_found" };
    if (owned.trackingStatus !== "tracked") return { ok: false, reason: "not_tracked" };
    if (owned.outcome !== null) return { ok: false, reason: "closed" };

    const [updated] = await getDb()
      .update(application)
      .set({
        stage,
        stageChangedAt: new Date()
      })
      .where(
        and(
          eq(application.id, id),
          eq(application.userId, userId),
          eq(application.trackingStatus, "tracked"),
          isNull(application.outcome)
        )
      )
      .returning();

    if (!updated) return { ok: false, reason: "not_found" };
    return { ok: true, row: updated };
  },

  /**
   * Sets terminal outcome; freezes stage. Allows overwrite when already closed.
   */
  async setOutcome(
    id: string,
    userId: string,
    outcome: ApplicationOutcome
  ): Promise<ApplicationEntity | null> {
    const owned = await applicationRepository.findByIdForUser(id, userId);
    if (!owned) return null;

    const [updated] = await getDb()
      .update(application)
      .set({
        outcome,
        outcomeAt: new Date()
      })
      .where(and(eq(application.id, id), eq(application.userId, userId)))
      .returning();
    return updated ?? null;
  },

  /**
   * Restore stage/outcome timestamps from a CRM apply audit snapshot (undo).
   * Bypasses open-only stage guards so a mistaken auto-stage can roll back.
   */
  async restorePipelineState(
    id: string,
    userId: string,
    state: {
      stage: ApplicationStage;
      stageChangedAt: Date;
      outcome: ApplicationOutcome | null;
      outcomeAt: Date | null;
    }
  ): Promise<ApplicationEntity | null> {
    const owned = await applicationRepository.findByIdForUser(id, userId);
    if (!owned) return null;

    const [updated] = await getDb()
      .update(application)
      .set({
        stage: state.stage,
        stageChangedAt: state.stageChangedAt,
        outcome: state.outcome,
        outcomeAt: state.outcomeAt
      })
      .where(and(eq(application.id, id), eq(application.userId, userId)))
      .returning();
    return updated ?? null;
  },

  async deleteMany(ids: string[], userId: string) {
    if (ids.length === 0) return [];
    return getDb()
      .delete(application)
      .where(and(eq(application.userId, userId), inArray(application.id, ids)))
      .returning({ id: application.id });
  },

  /** Hard-delete every application for a tenant (activity cascades). */
  async deleteAllByUserId(userId: string) {
    return getDb()
      .delete(application)
      .where(eq(application.userId, userId))
      .returning({ id: application.id });
  },

  /**
   * Hard-delete dismissed applications last updated before `cutoff` (auto-purge).
   * Returns cover keys for best-effort object cleanup. Activity cascades via FK.
   *
   * Delete re-checks `tracking_status = dismissed` so a concurrent restore/promote
   * cannot lose a row that left dismissed between select and delete (TOCTOU).
   */
  async deleteDismissedOlderThan(
    cutoff: Date,
    limit = 500
  ): Promise<{ id: string; userId: string; coverLetterR2Key: string | null }[]> {
    const candidates = await getDb()
      .select({
        id: application.id,
        userId: application.userId,
        coverLetterR2Key: application.coverLetterR2Key
      })
      .from(application)
      .where(and(eq(application.trackingStatus, "dismissed"), lt(application.updatedAt, cutoff)))
      .orderBy(asc(application.updatedAt))
      .limit(limit);

    if (candidates.length === 0) return [];

    const ids = candidates.map((c) => c.id);
    // Status guard on delete: skip any id that was restored/promoted mid-flight.
    const deleted = await getDb()
      .delete(application)
      .where(and(inArray(application.id, ids), eq(application.trackingStatus, "dismissed")))
      .returning({
        id: application.id,
        userId: application.userId,
        coverLetterR2Key: application.coverLetterR2Key
      });
    return deleted;
  }
};
