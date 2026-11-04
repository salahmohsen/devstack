import { and, desc, eq, gt, lt, notInArray, sql } from "drizzle-orm";

import { getDb } from "../index.ts";
import { jobDiscoveryRun as run } from "../schema/job-discovery-run.schema.ts";

export type JobDiscoveryRunEntity = typeof run.$inferSelect;
const scope = (userId: string, runId: string) => and(eq(run.userId, userId), eq(run.runId, runId));
const active = notInArray(run.stage, ["completed", "failed"]);

export const jobDiscoveryRunRepository = {
  async claim(userId: string, runId: string, scheduledAt: Date) {
    await this.expireStale(userId);
    return getDb().transaction(async (tx) => {
      // Serialize claimers for one account; a worker may finish between the
      // unique-index conflict and a follow-up SELECT outside this transaction.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
      const [existing] = await tx
        .select()
        .from(run)
        .where(and(eq(run.userId, userId), active))
        .limit(1);
      if (existing) return { run: existing, created: false };
      const [created] = await tx
        .insert(run)
        .values({ id: crypto.randomUUID(), userId, runId, scheduledAt })
        .onConflictDoNothing()
        .returning();
      if (created) return { run: created, created: true };
      const [finished] = await tx.select().from(run).where(scope(userId, runId)).limit(1);
      if (!finished) throw new Error("Could not claim discovery run");
      return { run: finished, created: false };
    });
  },

  async expireStale(userId: string) {
    // A scheduled run may wait up to 24h. Only expire after its due time and
    // 30 minutes without a worker heartbeat, including scoring updates.
    await getDb()
      .update(run)
      .set({
        stage: "failed",
        reason: "Search stopped responding. Try again.",
        retryAt: null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(run.userId, userId),
          active,
          lt(run.scheduledAt, new Date(Date.now() - 30 * 60_000)),
          lt(run.updatedAt, new Date(Date.now() - 30 * 60_000))
        )
      );
  },
  async find(userId: string, runId: string) {
    const [row] = await getDb().select().from(run).where(scope(userId, runId)).limit(1);
    return row ?? null;
  },
  async findActive(userId: string) {
    const [row] = await getDb()
      .select()
      .from(run)
      .where(and(eq(run.userId, userId), active))
      .limit(1);
    return row ?? null;
  },
  async latest(userId: string) {
    const [row] = await getDb()
      .select()
      .from(run)
      .where(eq(run.userId, userId))
      .orderBy(desc(run.createdAt))
      .limit(1);
    return row ?? null;
  },
  async lastSuccessful(userId: string) {
    const [row] = await getDb()
      .select()
      .from(run)
      .where(and(eq(run.userId, userId), eq(run.stage, "completed")))
      .orderBy(desc(run.updatedAt))
      .limit(1);
    return row?.updatedAt ?? null;
  },
  async nextScheduled(userId: string) {
    const [row] = await getDb()
      .select()
      .from(run)
      .where(and(eq(run.userId, userId), active, gt(run.scheduledAt, new Date())))
      .orderBy(run.scheduledAt)
      .limit(1);
    return row?.scheduledAt ?? null;
  },
  async requestBackfill(userId: string, runId: string) {
    const [row] = await getDb()
      .update(run)
      .set({
        landRevision: sql`${run.landRevision} + 1`,
        landFinished: false,
        stage: "queued",
        updatedAt: new Date()
      })
      .where(and(scope(userId, runId), active))
      .returning();
    return row ?? null;
  },
  async update(
    userId: string,
    runId: string,
    patch: Partial<
      Pick<
        JobDiscoveryRunEntity,
        | "stage"
        | "reason"
        | "fetched"
        | "queryHash"
        | "warnings"
        | "landFinished"
        | "retryAt"
        | "scheduledAt"
      >
    >,
    landRevision?: number
  ) {
    await getDb()
      .update(run)
      .set({
        ...patch,
        ...(patch.stage === "completed" || patch.stage === "failed" ? { retryAt: null } : {}),
        updatedAt: new Date()
      })
      .where(
        and(
          scope(userId, runId),
          active,
          landRevision === undefined ? undefined : eq(run.landRevision, landRevision)
        )
      );
  },
  async reserveCandidate(userId: string, runId: string, jobId: string) {
    const [row] = await getDb()
      .update(run)
      .set({
        candidates: sql`${run.candidates} || jsonb_build_object(${jobId}::text, 'pending'::text)`,
        updatedAt: new Date()
      })
      .where(and(scope(userId, runId), active, sql`not (${run.candidates} ? ${jobId})`))
      .returning({ id: run.id });
    return Boolean(row);
  },
  async addWarning(userId: string, runId: string, warning: string) {
    await getDb()
      .update(run)
      .set({
        warnings: sql`${run.warnings} || jsonb_build_array(${warning}::text)`,
        updatedAt: new Date()
      })
      .where(and(scope(userId, runId), active, sql`not (${run.warnings} ? ${warning})`));
  },
  async releaseCandidate(userId: string, runId: string, jobId: string) {
    await getDb()
      .update(run)
      .set({ candidates: sql`${run.candidates} - ${jobId}`, updatedAt: new Date() })
      .where(and(scope(userId, runId), sql`${run.candidates}->>${jobId} = 'pending'`));
  },
  async finishCandidate(userId: string, runId: string, jobId: string, outcome: string) {
    await getDb()
      .update(run)
      .set({
        candidates: sql`${run.candidates} || jsonb_build_object(${jobId}::text, ${outcome}::text)`,
        updatedAt: new Date()
      })
      .where(and(scope(userId, runId), sql`${run.candidates}->>${jobId} = 'pending'`));
    await this.settle(userId, runId);
  },
  async settle(userId: string, runId: string) {
    await getDb()
      .update(run)
      .set({
        retryAt: null,
        stage: sql`case when exists
        (select 1 from jsonb_each_text(${run.candidates}) as c where c.value = 'failed') then 'failed' else 'completed' end`,
        reason: sql`case when exists (select 1 from jsonb_each_text(${run.candidates}) as c where c.value = 'failed')
        then 'Some matches could not be screened. Jobs already added are saved; try again for the rest.' else ${run.reason} end`,
        updatedAt: new Date()
      })
      .where(
        and(
          scope(userId, runId),
          active,
          eq(run.landFinished, true),
          sql`not exists (select 1 from jsonb_each_text(${run.candidates}) as candidate where candidate.value = 'pending')`
        )
      );
  }
};
