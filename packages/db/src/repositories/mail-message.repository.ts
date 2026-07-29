import {
  and,
  arrayContains,
  desc,
  eq,
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

export type MailListFilter = {
  userId: string;
  /**
   * Hub category: applications|recruiters|interviews|offers|unsorted|all
   * or smart-rule id `rule:{slug}`.
   */
  category?: string;
  /** Default false — hide system_notification purpose. */
  includeSystem?: boolean;
  limit?: number;
};

const SYSTEM_LABELS = ["application", "recruiter", "interview", "offer"] as const;

const CATEGORY_TO_LABEL: Record<string, (typeof SYSTEM_LABELS)[number]> = {
  applications: "application",
  recruiters: "recruiter",
  interviews: "interview",
  offers: "offer"
};

function purposeClause(includeSystem: boolean) {
  if (includeSystem) return undefined;
  return eq(mailMessage.purpose, "career");
}

function categoryClause(category: string | undefined) {
  if (!category || category === "all") return undefined;

  if (category === "unsorted") {
    // No system career labels and no smart-rule labels (rule:…).
    return and(
      sql`NOT (COALESCE(${mailMessage.labels}, ARRAY[]::text[]) && ARRAY['application','recruiter','interview','offer']::text[])`,
      sql`NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(${mailMessage.labels}, ARRAY[]::text[])) AS lbl
        WHERE lbl LIKE 'rule:%'
      )`
    );
  }

  if (category.startsWith("rule:")) {
    return arrayContains(mailMessage.labels, [category]);
  }

  const systemLabel = CATEGORY_TO_LABEL[category];
  if (systemLabel) {
    return arrayContains(mailMessage.labels, [systemLabel]);
  }

  return undefined;
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
  async applyClassification(
    id: string,
    userId: string,
    labels: string[],
    meta?: {
      mastraClassifyRunId?: string | null;
      mastraClassifyTraceId?: string | null;
    }
  ): Promise<MailMessageEntity | null> {
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
          : {})
      })
      .where(and(eq(mailMessage.id, id), eq(mailMessage.userId, userId)))
      .returning();
    return updated ?? null;
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
