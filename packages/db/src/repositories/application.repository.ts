import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
  type InferInsertModel,
  type InferSelectModel,
  type SQL
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

export type ApplicationListSortKey = "matchScore" | "updatedAt" | "company" | "stage";

/** Opaque cursor: active sort column(s) + id. `matchScore` encodes null scores. */
export type ApplicationListCursor =
  | { sortBy: "matchScore"; matchScore: number | null; updatedAt: string; id: string }
  | { sortBy: "updatedAt"; updatedAt: string; id: string }
  | { sortBy: "company"; companyName: string; id: string }
  | { sortBy: "stage"; stage: string; id: string };

export type ApplicationListPageOptions = {
  cursor?: string | null;
  limit: number;
  where?: SQL;
  sortBy?: ApplicationListSortKey;
  sortDir?: "asc" | "desc";
};

export type ApplicationListBoardOptions = {
  limit: number;
  where?: SQL;
  sortBy?: ApplicationListSortKey;
  sortDir?: "asc" | "desc";
};

type ApplicationListKeyRow = {
  id: string;
  matchScore: number | null;
  companyName: string;
  stage: string;
  updatedAt: Date;
};

function encodeApplicationListCursor(cursor: ApplicationListCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decodeApplicationListCursor(cursor: string): ApplicationListCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    if (!isRecord(parsed) || typeof parsed.id !== "string") return null;

    const sortBy = parsed.sortBy;
    if (
      sortBy === "matchScore" &&
      (typeof parsed.matchScore === "number" || parsed.matchScore === null) &&
      typeof parsed.updatedAt === "string"
    ) {
      return {
        sortBy: "matchScore",
        matchScore: parsed.matchScore,
        updatedAt: parsed.updatedAt,
        id: parsed.id
      };
    }
    if (sortBy === "updatedAt" && typeof parsed.updatedAt === "string") {
      return { sortBy: "updatedAt", updatedAt: parsed.updatedAt, id: parsed.id };
    }
    if (sortBy === "company" && typeof parsed.companyName === "string") {
      return { sortBy: "company", companyName: parsed.companyName, id: parsed.id };
    }
    if (sortBy === "stage" && typeof parsed.stage === "string") {
      return { sortBy: "stage", stage: parsed.stage, id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}

function andAll(parts: Array<SQL | undefined>): SQL | undefined {
  const present = parts.filter((part): part is SQL => part !== undefined);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];
  return and(...present);
}

function encodeApplicationRowCursor(
  row: ApplicationListKeyRow,
  sortBy: ApplicationListSortKey
): ApplicationListCursor {
  if (sortBy === "matchScore") {
    return {
      sortBy: "matchScore",
      matchScore: row.matchScore,
      updatedAt: row.updatedAt.toISOString(),
      id: row.id
    };
  }
  if (sortBy === "company") {
    return { sortBy: "company", companyName: row.companyName, id: row.id };
  }
  if (sortBy === "stage") {
    return { sortBy: "stage", stage: row.stage, id: row.id };
  }
  return { sortBy: "updatedAt", updatedAt: row.updatedAt.toISOString(), id: row.id };
}

/**
 * Keyset after a `matchScore` row. DESC/ASC both use NULLS LAST so unscored
 * jobs stay at the end; the cursor must encode `matchScore: null`.
 */
function matchScoreCursorWhere(
  cursor: Extract<ApplicationListCursor, { sortBy: "matchScore" }>,
  sortDir: "asc" | "desc"
): SQL | undefined {
  const after = sortDir === "desc" ? lt : gt;
  const at = new Date(cursor.updatedAt);
  if (Number.isNaN(at.getTime())) return undefined;

  if (cursor.matchScore != null) {
    return or(
      and(isNotNull(application.matchScore), after(application.matchScore, cursor.matchScore)),
      and(eq(application.matchScore, cursor.matchScore), after(application.updatedAt, at)),
      and(
        eq(application.matchScore, cursor.matchScore),
        eq(application.updatedAt, at),
        after(application.id, cursor.id)
      ),
      isNull(application.matchScore)
    );
  }

  return and(
    isNull(application.matchScore),
    or(
      after(application.updatedAt, at),
      and(eq(application.updatedAt, at), after(application.id, cursor.id))
    )
  );
}

function applicationOrderBy(sortBy: ApplicationListSortKey, sortDir: "asc" | "desc"): SQL[] {
  const dir = sortDir === "desc" ? desc : asc;
  const matchScoreOrder =
    sortDir === "desc"
      ? sql`${application.matchScore} DESC NULLS LAST`
      : sql`${application.matchScore} ASC NULLS LAST`;
  if (sortBy === "matchScore") {
    return [matchScoreOrder, dir(application.updatedAt), dir(application.id)];
  }
  if (sortBy === "company") {
    return [dir(application.companyName), dir(application.id)];
  }
  if (sortBy === "stage") {
    return [dir(application.stage), dir(application.id)];
  }
  return [dir(application.updatedAt), dir(application.id)];
}

function applicationCursorWhere(
  cursor: ApplicationListCursor,
  sortBy: ApplicationListSortKey,
  sortDir: "asc" | "desc"
): SQL | undefined {
  if (cursor.sortBy !== sortBy) return undefined;
  const after = sortDir === "desc" ? lt : gt;
  if (cursor.sortBy === "matchScore") {
    return matchScoreCursorWhere(cursor, sortDir);
  }
  if (cursor.sortBy === "company") {
    return or(
      after(application.companyName, cursor.companyName),
      and(eq(application.companyName, cursor.companyName), after(application.id, cursor.id))
    );
  }
  if (cursor.sortBy === "stage") {
    const stage = cursor.stage as ApplicationStage;
    return or(
      after(application.stage, stage),
      and(eq(application.stage, stage), after(application.id, cursor.id))
    );
  }
  const at = new Date(cursor.updatedAt);
  if (Number.isNaN(at.getTime())) return undefined;
  return or(
    after(application.updatedAt, at),
    and(eq(application.updatedAt, at), after(application.id, cursor.id))
  );
}

async function insertIfAbsentByUrl(
  db: Pick<ReturnType<typeof getDb>, "insert" | "select">,
  input: CreateApplicationData & { url: string }
): Promise<{ row: ApplicationEntity; created: boolean }> {
  const id = crypto.randomUUID();
  const now = new Date();
  const [inserted] = await db
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
      workMode: input.workMode ?? null,
      hiringRegion: input.hiringRegion ?? null,
      requiredSkills: input.requiredSkills ?? [],
      preferredSkills: input.preferredSkills ?? [],
      domains: input.domains ?? [],
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
      resumeId: input.resumeId ?? null,
      jobId: input.jobId ?? null,
      inboxExpiresAt: input.inboxExpiresAt ?? null,
      discoveryRunId: input.discoveryRunId ?? null
    })
    .onConflictDoNothing({
      target: [application.userId, application.url],
      where: sql`${application.url} is not null`
    })
    .returning();

  if (inserted) {
    return { row: inserted, created: true };
  }

  const existing = await findByUserIdAndUrlOn(db, input.userId, input.url);
  if (!existing) {
    throw new Error(
      `createIfAbsentByUrl: conflict without existing row for userId=${input.userId} url=${input.url}`
    );
  }
  return { row: existing, created: false };
}

async function findByUserIdAndUrlOn(
  db: Pick<ReturnType<typeof getDb>, "select">,
  userId: string,
  url: string
): Promise<ApplicationEntity | null> {
  const rows = await db
    .select()
    .from(application)
    .where(and(eq(application.userId, userId), eq(application.url, url)))
    .limit(1);
  return rows[0] ?? null;
}

export const applicationRepository = {
  async findAllByUserId(userId: string) {
    return getDb()
      .select()
      .from(application)
      .where(eq(application.userId, userId))
      .orderBy(desc(application.updatedAt));
  },

  async findByIdsForUser(userId: string, ids: string[]): Promise<ApplicationEntity[]> {
    if (ids.length === 0) return [];
    return getDb()
      .select()
      .from(application)
      .where(and(eq(application.userId, userId), inArray(application.id, ids)));
  },

  /** Jobs that currently point at these resume PDFs (apply-package accept). */
  async listLinkedByResumeIds(
    userId: string,
    resumeIds: string[]
  ): Promise<
    Array<{
      id: string;
      resumeId: string | null;
      companyName: string;
      title: string;
      companyLogoUrl: string | null;
    }>
  > {
    if (resumeIds.length === 0) return [];
    return getDb()
      .select({
        id: application.id,
        resumeId: application.resumeId,
        companyName: application.companyName,
        title: application.title,
        companyLogoUrl: application.companyLogoUrl
      })
      .from(application)
      .where(and(eq(application.userId, userId), inArray(application.resumeId, resumeIds)));
  },

  /** Tracked, outcome-null rows for silence ticks (all tenants). */
  async listOpenTracked(limit: number): Promise<ApplicationEntity[]> {
    if (limit <= 0) return [];
    return getDb()
      .select()
      .from(application)
      .where(and(eq(application.trackingStatus, "tracked"), isNull(application.outcome)))
      .orderBy(asc(application.updatedAt), asc(application.id))
      .limit(limit);
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

  /**
   * Cursor page for dashboard New jobs / Tracked list.
   * `where` is precompiled (partition + chips + q). Default sort is
   * `matchScore DESC NULLS LAST` (New jobs) or `updatedAt DESC` (Tracked).
   */
  async findPageByUserId(userId: string, options: ApplicationListPageOptions) {
    const limit = options.limit;
    const sortBy = options.sortBy ?? "updatedAt";
    const sortDir = options.sortDir ?? "desc";
    const decoded =
      options.cursor != null && options.cursor !== ""
        ? decodeApplicationListCursor(options.cursor)
        : null;
    const cursor = decoded?.sortBy === sortBy ? decoded : null;
    const cursorWhere = cursor ? applicationCursorWhere(cursor, sortBy, sortDir) : undefined;

    const filterWhere = andAll([eq(application.userId, userId), options.where]);
    const pageWhere = andAll([filterWhere, cursorWhere]) ?? eq(application.userId, userId);
    const orderBy = applicationOrderBy(sortBy, sortDir);

    const [rows, countRow] = await Promise.all([
      getDb()
        .select()
        .from(application)
        .where(pageWhere)
        .orderBy(...orderBy)
        .limit(limit + 1),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(application)
        .where(filterWhere)
        .then((r) => r[0]?.count ?? 0)
    ]);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last != null
        ? encodeApplicationListCursor(encodeApplicationRowCursor(last, sortBy))
        : null;

    return { items, nextCursor, totalCount: countRow };
  },

  /**
   * Open-only tracked board (compile already ANDs `outcome IS NULL`).
   * No cursor; cap `limit` (200). `totalCount` is the un-capped match count.
   */
  async findBoardByUserId(userId: string, options: ApplicationListBoardOptions) {
    const limit = options.limit;
    const sortBy = options.sortBy ?? "updatedAt";
    const sortDir = options.sortDir ?? "desc";
    const filterWhere = andAll([eq(application.userId, userId), options.where]);
    const pageWhere = filterWhere ?? eq(application.userId, userId);
    const orderBy = applicationOrderBy(sortBy, sortDir);

    const [items, countRow] = await Promise.all([
      getDb()
        .select()
        .from(application)
        .where(pageWhere)
        .orderBy(...orderBy)
        .limit(limit),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(application)
        .where(filterWhere)
        .then((r) => r[0]?.count ?? 0)
    ]);

    return { items, totalCount: countRow };
  },

  /** Inbox rows that landed in the Today window and already have a take. */
  async findInboxWithTakeSince(input: { userId: string; since: Date; limit?: number }) {
    const limit = input.limit ?? 20;
    return getDb()
      .select()
      .from(application)
      .where(
        and(
          eq(application.userId, input.userId),
          eq(application.trackingStatus, "inbox"),
          gte(application.createdAt, input.since),
          isNotNull(application.agentTake),
          ne(application.agentTake, "")
        )
      )
      .orderBy(desc(application.createdAt))
      .limit(limit);
  },

  async countInboxWithTakeSince(input: { userId: string; since: Date }): Promise<number> {
    const [row] = await getDb()
      .select({ n: sql<number>`count(*)::int` })
      .from(application)
      .where(
        and(
          eq(application.userId, input.userId),
          eq(application.trackingStatus, "inbox"),
          gte(application.createdAt, input.since),
          isNotNull(application.agentTake),
          ne(application.agentTake, "")
        )
      );
    return row?.n ?? 0;
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
        workMode: input.workMode ?? null,
        hiringRegion: input.hiringRegion ?? null,
        requiredSkills: input.requiredSkills ?? [],
        preferredSkills: input.preferredSkills ?? [],
        domains: input.domains ?? [],
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
        resumeId: input.resumeId ?? null,
        jobId: input.jobId ?? null,
        inboxExpiresAt: input.inboxExpiresAt ?? null,
        discoveryRunId: input.discoveryRunId ?? null
      })
      .returning();
    return created;
  },

  /**
   * Race-safe harvest insert: unique on (userId, url) where url is not null.
   * Inserts when absent; on conflict returns the existing row without error.
   */
  async createIfAbsentByUrl(
    input: CreateApplicationData & { url: string },
    activity?: Pick<
      InferInsertModel<typeof applicationActivity>,
      "kind" | "actorUserId" | "metadata"
    >
  ): Promise<{ row: ApplicationEntity; created: boolean }> {
    if (activity) {
      return getDb().transaction(async (tx) => {
        const result = await insertIfAbsentByUrl(tx, input);
        if (result.created) {
          await tx.insert(applicationActivity).values({
            ...activity,
            id: crypto.randomUUID(),
            userId: input.userId,
            applicationId: result.row.id,
            body: null
          });
        }
        return result;
      });
    }
    return insertIfAbsentByUrl(getDb(), input);
  },

  /**
   * Inbox insert under N / 50. Transaction + advisory lock on (userId, runId),
   * then re-check counts immediately before insert. Dismissed rows must not
   * use this path (they do not count toward 50).
   */
  async createInboxIfUnderCaps(
    input: CreateApplicationData & {
      url: string;
      discoveryRunId: string;
      poolSize: number;
      maxOpenInbox: number;
    }
  ): Promise<{ row: ApplicationEntity | null; created: boolean }> {
    return getDb().transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${input.userId}), hashtext(${input.discoveryRunId}))`
      );

      const [openRow] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(application)
        .where(and(eq(application.userId, input.userId), eq(application.trackingStatus, "inbox")));
      const [runRow] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(application)
        .where(
          and(
            eq(application.userId, input.userId),
            eq(application.discoveryRunId, input.discoveryRunId),
            eq(application.trackingStatus, "inbox")
          )
        );

      const openInbox = openRow?.n ?? 0;
      const inboxThisRun = runRow?.n ?? 0;
      if (openInbox >= input.maxOpenInbox || inboxThisRun >= input.poolSize) {
        return { row: null, created: false };
      }

      return insertIfAbsentByUrl(tx, input);
    });
  },

  async countInboxThisRun(userId: string, discoveryRunId: string): Promise<number> {
    const [row] = await getDb()
      .select({ n: sql<number>`count(*)::int` })
      .from(application)
      .where(
        and(
          eq(application.userId, userId),
          eq(application.discoveryRunId, discoveryRunId),
          eq(application.trackingStatus, "inbox")
        )
      );
    return row?.n ?? 0;
  },

  /** URLs / user_job ids already referenced by this user's applications. */
  async listUserSeenRefs(userId: string): Promise<{ urls: string[]; jobIds: string[] }> {
    const rows = await getDb()
      .select({
        url: application.url,
        jobId: application.jobId
      })
      .from(application)
      .where(eq(application.userId, userId));

    const urls: string[] = [];
    const jobIds: string[] = [];
    const seenUrls = new Set<string>();
    const seenJobIds = new Set<string>();
    for (const row of rows) {
      if (row.url && !seenUrls.has(row.url)) {
        seenUrls.add(row.url);
        urls.push(row.url);
      }
      if (row.jobId && !seenJobIds.has(row.jobId)) {
        seenJobIds.add(row.jobId);
        jobIds.push(row.jobId);
      }
    }
    return { urls, jobIds };
  },

  /** Bump `updatedAt` so probed rows fall out of the next oldest-first batch. */
  async touchUpdatedAt(ids: string[], now = new Date()): Promise<void> {
    if (ids.length === 0) return;
    await getDb().update(application).set({ updatedAt: now }).where(inArray(application.id, ids));
  },

  async listInboxExpired(now: Date, limit: number): Promise<ApplicationEntity[]> {
    if (limit <= 0) return [];
    return getDb()
      .select()
      .from(application)
      .where(
        and(
          eq(application.trackingStatus, "inbox"),
          isNotNull(application.inboxExpiresAt),
          lte(application.inboxExpiresAt, now)
        )
      )
      .orderBy(asc(application.inboxExpiresAt))
      .limit(limit);
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
        ...(patch.workMode !== undefined ? { workMode: patch.workMode } : {}),
        ...(patch.hiringRegion !== undefined ? { hiringRegion: patch.hiringRegion } : {}),
        ...(patch.requiredSkills !== undefined ? { requiredSkills: patch.requiredSkills } : {}),
        ...(patch.preferredSkills !== undefined ? { preferredSkills: patch.preferredSkills } : {}),
        ...(patch.domains !== undefined ? { domains: patch.domains } : {}),
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
    trackingStatus: ApplicationTrackingStatus,
    fromStatus?: ApplicationTrackingStatus
  ): Promise<ApplicationEntity | null> {
    const owned = await applicationRepository.findByIdForUser(id, userId);
    if (!owned) return null;

    const [updated] = await getDb()
      .update(application)
      .set({ trackingStatus })
      .where(
        and(
          eq(application.id, id),
          eq(application.userId, userId),
          ...(fromStatus ? [eq(application.trackingStatus, fromStatus)] : [])
        )
      )
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
