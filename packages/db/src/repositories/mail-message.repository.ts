import {
  and,
  arrayContains,
  desc,
  eq,
  gte,
  sql,
  type InferInsertModel,
  type InferSelectModel
} from "drizzle-orm";

import { getDb } from "../index.ts";
import { application } from "../schema/application.schema.ts";
import {
  mailAttachment,
  mailMessage,
  type MailProviderDb,
  type MailPurposeDb
} from "../schema/mail-message.schema.ts";

export type MailMessageEntity = InferSelectModel<typeof mailMessage>;
export type MailAttachmentEntity = InferSelectModel<typeof mailAttachment>;

export type CreateMailMessageData = Omit<
  InferInsertModel<typeof mailMessage>,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type CreateMailAttachmentData = Omit<
  InferInsertModel<typeof mailAttachment>,
  "id" | "createdAt"
> & {
  id?: string;
};

/** Classify one-liner cap — Today facts, not a letter. */
export const MAIL_SUMMARY_MAX_CHARS = 280;

export type MailListFilter = {
  userId: string;
  /**
   * Hub category: needs_action|applications|recruiters|interviews|offers|noise|
   * job_notifier|application_status|unsorted|all — or smart-rule id `rule:{slug}`.
   * Also accepts raw system labels (`application`, `recruiter`, …).
   */
  category?: string;
  /** Default false — hide system_notification purpose. */
  includeSystem?: boolean;
  limit?: number;
};

/** All system labels stored on mail_message.labels (keep in sync with MailSystemLabel). */
const SYSTEM_LABELS = [
  "application",
  "recruiter",
  "interview",
  "offer",
  "job_notifier",
  "noise",
  "application_status"
] as const;

/**
 * Needs action hub filter (P0) — labels that require user attention.
 * Not a stored category label; pure `noise` / pure `job_notifier` are excluded
 * by requiring overlap with this set (they have no action labels alone).
 * Future: OR a denormalized needsAction flag.
 * Keep in sync with MAIL_NEEDS_ACTION_LABELS in @tsu-stack/core.
 */
const NEEDS_ACTION_LABELS = ["recruiter", "interview", "offer", "application_status"] as const;

/**
 * Hub category id → primary system label for simple arrayContains filters.
 * Includes raw system labels so callers like Scan job alerts (`job_notifier`)
 * filter correctly — unknown categories must not fall through to "all mail".
 */
const CATEGORY_TO_LABEL: Record<string, (typeof SYSTEM_LABELS)[number]> = {
  applications: "application",
  application: "application",
  /** Hub card id + raw system label (job-alert digests). */
  job_notifier: "job_notifier",
  recruiters: "recruiter",
  recruiter: "recruiter",
  interviews: "interview",
  interview: "interview",
  offers: "offer",
  offer: "offer",
  noise: "noise",
  application_status: "application_status"
};

/** Safe: constants only (quoted literals), not user input. */
function textArrayLiteral(values: readonly string[]) {
  return sql.raw(`ARRAY[${values.map((v) => `'${v}'`).join(",")}]::text[]`);
}

function purposeClause(includeSystem: boolean) {
  if (includeSystem) return undefined;
  return eq(mailMessage.purpose, "career");
}

function categoryClause(category: string | undefined) {
  if (!category || category === "all") return undefined;

  if (category === "unsorted") {
    // No system labels and no smart-rule labels (rule:…).
    return and(
      sql`NOT (COALESCE(${mailMessage.labels}, ARRAY[]::text[]) && ${textArrayLiteral(SYSTEM_LABELS)})`,
      sql`NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(${mailMessage.labels}, ARRAY[]::text[])) AS lbl
        WHERE lbl LIKE 'rule:%'
      )`
    );
  }

  if (category === "needs_action") {
    // Needs action (P0): labels ∩ NEEDS_ACTION_LABELS ≠ ∅.
    // Pure `noise` and pure `job_notifier` (without those action labels) never match.
    // Future: OR a denormalized needsAction flag.
    return sql`COALESCE(${mailMessage.labels}, ARRAY[]::text[]) && ${textArrayLiteral(NEEDS_ACTION_LABELS)}`;
  }

  if (category.startsWith("rule:")) {
    return arrayContains(mailMessage.labels, [category]);
  }

  const systemLabel =
    CATEGORY_TO_LABEL[category] ??
    ((SYSTEM_LABELS as readonly string[]).includes(category)
      ? (category as (typeof SYSTEM_LABELS)[number])
      : undefined);
  if (systemLabel) {
    return arrayContains(mailMessage.labels, [systemLabel]);
  }

  // Unknown category: do not match everything (that made Scan enqueue noise).
  return sql`false`;
}

export type MailMessageWithApplication = MailMessageEntity & {
  applicationCompanyName: string | null;
  applicationTitle: string | null;
};

export const mailMessageRepository = {
  async findByUserId(filter: MailListFilter): Promise<MailMessageWithApplication[]> {
    const includeSystem = filter.includeSystem ?? false;
    const limit = filter.limit ?? 50;
    const conditions = [
      eq(mailMessage.userId, filter.userId),
      purposeClause(includeSystem),
      categoryClause(filter.category)
    ].filter(Boolean);

    const rows = await getDb()
      .select({
        message: mailMessage,
        applicationCompanyName: application.companyName,
        applicationTitle: application.title
      })
      .from(mailMessage)
      .leftJoin(application, eq(mailMessage.applicationId, application.id))
      .where(and(...conditions))
      .orderBy(desc(mailMessage.receivedAt))
      .limit(limit);

    return rows.map((row) => {
      return {
        ...row.message,
        applicationCompanyName: row.applicationCompanyName,
        applicationTitle: row.applicationTitle
      };
    });
  },

  /** Career mail received at or after `since`, newest first. */
  async findReceivedSince(input: {
    userId: string;
    since: Date;
    limit?: number;
  }): Promise<MailMessageEntity[]> {
    const limit = input.limit ?? 50;
    return getDb()
      .select()
      .from(mailMessage)
      .where(
        and(
          eq(mailMessage.userId, input.userId),
          eq(mailMessage.purpose, "career"),
          gte(mailMessage.receivedAt, input.since)
        )
      )
      .orderBy(desc(mailMessage.receivedAt))
      .limit(limit);
  },

  async countReceivedSince(input: { userId: string; since: Date }): Promise<number> {
    const [row] = await getDb()
      .select({ n: sql<number>`count(*)::int` })
      .from(mailMessage)
      .where(
        and(
          eq(mailMessage.userId, input.userId),
          eq(mailMessage.purpose, "career"),
          gte(mailMessage.receivedAt, input.since)
        )
      );
    return row?.n ?? 0;
  },

  async findByIdForUser(
    id: string,
    userId: string,
    options?: { includeSystem?: boolean }
  ): Promise<MailMessageWithApplication | null> {
    const includeSystem = options?.includeSystem ?? false;
    const conditions = [
      eq(mailMessage.id, id),
      eq(mailMessage.userId, userId),
      purposeClause(includeSystem)
    ].filter(Boolean);

    const rows = await getDb()
      .select({
        message: mailMessage,
        applicationCompanyName: application.companyName,
        applicationTitle: application.title
      })
      .from(mailMessage)
      .leftJoin(application, eq(mailMessage.applicationId, application.id))
      .where(and(...conditions))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return {
      ...row.message,
      applicationCompanyName: row.applicationCompanyName,
      applicationTitle: row.applicationTitle
    };
  },

  async findByProviderMessage(
    userId: string,
    provider: MailProviderDb,
    providerMessageId: string
  ): Promise<MailMessageEntity | null> {
    const rows = await getDb()
      .select()
      .from(mailMessage)
      .where(
        and(
          eq(mailMessage.userId, userId),
          eq(mailMessage.provider, provider),
          eq(mailMessage.providerMessageId, providerMessageId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async create(input: CreateMailMessageData): Promise<MailMessageEntity> {
    const id = input.id ?? crypto.randomUUID();
    const [created] = await getDb()
      .insert(mailMessage)
      .values({
        id,
        userId: input.userId,
        provider: input.provider ?? "manual",
        providerMessageId: input.providerMessageId ?? null,
        fromName: input.fromName ?? "",
        fromEmail: input.fromEmail,
        toEmail: input.toEmail ?? null,
        subject: input.subject ?? "",
        preview: input.preview ?? "",
        bodyText: input.bodyText ?? "",
        bodyHtml: input.bodyHtml ?? null,
        receivedAt: input.receivedAt ?? new Date(),
        unread: input.unread ?? true,
        purpose: (input.purpose as MailPurposeDb | undefined) ?? "career",
        labels: input.labels ?? [],
        applicationId: input.applicationId ?? null,
        classifiedAt: input.classifiedAt ?? null
      })
      .returning();
    return created;
  },

  async createAttachment(input: CreateMailAttachmentData): Promise<MailAttachmentEntity> {
    const id = input.id ?? crypto.randomUUID();
    const [created] = await getDb()
      .insert(mailAttachment)
      .values({
        id,
        messageId: input.messageId,
        userId: input.userId,
        filename: input.filename,
        contentType: input.contentType ?? null,
        sizeBytes: input.sizeBytes ?? null,
        storageKey: input.storageKey ?? null
      })
      .returning();
    return created;
  },

  async markRead(id: string, userId: string, unread = false): Promise<MailMessageEntity | null> {
    const [updated] = await getDb()
      .update(mailMessage)
      .set({ unread })
      .where(and(eq(mailMessage.id, id), eq(mailMessage.userId, userId)))
      .returning();
    return updated ?? null;
  },

  /**
   * Apply classification: replace system career labels, keep smart-rule labels
   * passed in `labels`, stamp `classifiedAt`.
   */
  /**
   * Wipe AI classification for a tenant: system + smart labels, classifiedAt,
   * linked application, and Mastra run ids. Used to re-run Career Inbox tagging.
   */
  async clearClassificationByUserId(userId: string): Promise<number> {
    const updated = await getDb()
      .update(mailMessage)
      .set({
        labels: [],
        classifiedAt: null,
        applicationId: null,
        mastraClassifyRunId: null,
        mastraClassifyTraceId: null
      })
      .where(eq(mailMessage.userId, userId))
      .returning({ id: mailMessage.id });
    return updated.length;
  },

  async applyClassification(
    id: string,
    userId: string,
    labels: string[],
    meta?: {
      mastraClassifyRunId?: string | null;
      mastraClassifyTraceId?: string | null;
      summary?: string | null;
    }
  ): Promise<MailMessageEntity | null> {
    const incoming = meta?.summary?.trim() ?? "";
    const clipped =
      incoming.length > MAIL_SUMMARY_MAX_CHARS
        ? incoming.slice(0, MAIL_SUMMARY_MAX_CHARS)
        : incoming;

    const [updated] = await getDb()
      .update(mailMessage)
      .set({
        labels,
        classifiedAt: new Date(),
        ...(meta?.mastraClassifyRunId !== undefined
          ? { mastraClassifyRunId: meta.mastraClassifyRunId }
          : {}),
        ...(meta?.mastraClassifyTraceId !== undefined
          ? { mastraClassifyTraceId: meta.mastraClassifyTraceId }
          : {}),
        ...(clipped.length > 0
          ? {
              summary: sql<string>`
                case
                  when coalesce(btrim(${mailMessage.summary}), '') = '' then ${clipped}
                  else ${mailMessage.summary}
                end
              `
            }
          : {})
      })
      .where(and(eq(mailMessage.id, id), eq(mailMessage.userId, userId)))
      .returning();
    return updated ?? null;
  },

  async listByApplicationId(
    applicationId: string,
    userId: string,
    limit = 50
  ): Promise<MailMessageEntity[]> {
    return getDb()
      .select()
      .from(mailMessage)
      .where(and(eq(mailMessage.userId, userId), eq(mailMessage.applicationId, applicationId)))
      .orderBy(desc(mailMessage.receivedAt), desc(mailMessage.id))
      .limit(limit);
  },

  /** Link (or clear) a Career Inbox message to an Applications CRM row. */
  async setApplicationId(
    id: string,
    userId: string,
    applicationId: string | null
  ): Promise<MailMessageEntity | null> {
    const [updated] = await getDb()
      .update(mailMessage)
      .set({ applicationId })
      .where(and(eq(mailMessage.id, id), eq(mailMessage.userId, userId)))
      .returning();
    return updated ?? null;
  }
};
