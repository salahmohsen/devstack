import { createTool } from "@mastra/core/tools";
import { sql } from "drizzle-orm";
import { z } from "zod";

import {
  mailHasSystemLabel,
  MailSystemLabelSchema,
  type MailClassifyOutput,
  type MailSystemLabel
} from "@tsu-stack/core";
import { createDb, mailMessageRepository, runWithDb } from "@tsu-stack/db";

import { resolveRuntimeAiCredentials } from "#@/mastra/lib/resolve-runtime-ai.ts";
import { runtimeLlmFromRequestContext } from "#@/mastra/runtime-llm.ts";
import { mailClassifyWorkflow } from "#@/mastra/workflows/mail-classify-workflow/index.ts";

/**
 * Career Inbox message detail by id.
 */
export const getMailTool = createTool({
  id: "get-mail",
  description:
    "Get one Career Inbox message by id (full body). Use listMail first for real ids. Never call with empty id.",
  inputSchema: z.object({
    messageId: z.string().min(1).describe("Mail message id from listMail")
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    message: z
      .object({
        id: z.string(),
        subject: z.string(),
        fromName: z.string(),
        fromEmail: z.string(),
        labels: z.array(z.string()),
        bodyText: z.string(),
        preview: z.string(),
        applicationId: z.string().nullable(),
        receivedAt: z.string().nullable()
      })
      .optional(),
    code: z.string().optional(),
    messageText: z.string().optional()
  }),
  execute: async ({ messageId }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { ok: false, code: "UNAUTHORIZED", messageText: "No tenant" };
    }
    const db = createDb();
    const row = await runWithDb(db, () =>
      mailMessageRepository.findByIdForUser(messageId, userId, { includeSystem: false })
    );
    if (!row) {
      return { ok: false, code: "NOT_FOUND", messageText: "Mail message not found" };
    }
    return {
      ok: true,
      message: {
        id: row.id,
        subject: row.subject ?? "",
        fromName: row.fromName ?? "",
        fromEmail: row.fromEmail ?? "",
        labels: row.labels ?? [],
        bodyText: row.bodyText ?? "",
        preview: row.preview ?? "",
        applicationId: row.applicationId ?? null,
        receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null
      }
    };
  }
});

function systemLabelsFrom(labels: readonly string[]): MailSystemLabel[] {
  return labels
    .map((label) => MailSystemLabelSchema.safeParse(label))
    .filter((row): row is { success: true; data: MailSystemLabel } => row.success)
    .map((row) => row.data);
}

/**
 * Same-turn classify. Writes labels only. Does **not** apply CRM effects.
 * Lives in this already-bundled file so Mastra incremental bundle can resolve
 * `#@/mastra/…` imports (a new tool file emits those specifiers raw).
 */
export const classifyMailTool = createTool({
  id: "classify-mail",
  description:
    "Classify one Career Inbox message and return system labels. Visible step — wait for the result this turn. Labels only: do not write CRM from this tool. If the message already has a system label, return those labels without re-running. Use on the latest company mention when it is unsorted.",
  inputSchema: z.object({
    messageId: z.string().min(1).describe("Mail id from listMail / searchMail")
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    messageId: z.string(),
    labels: z.array(z.string()),
    systemLabels: z.array(z.string()),
    alreadyClassified: z.boolean(),
    notes: z.string().optional(),
    code: z.string().optional()
  }),
  execute: async ({ messageId }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return {
        ok: false,
        messageId,
        labels: [],
        systemLabels: [],
        alreadyClassified: false,
        code: "UNAUTHORIZED"
      };
    }

    const db = createDb();
    const row = await runWithDb(db, () =>
      mailMessageRepository.findByIdForUser(messageId, userId, { includeSystem: false })
    );
    if (!row) {
      return {
        ok: false,
        messageId,
        labels: [],
        systemLabels: [],
        alreadyClassified: false,
        code: "NOT_FOUND"
      };
    }

    const existing = row.labels ?? [];
    if (mailHasSystemLabel(existing)) {
      return {
        ok: true,
        messageId,
        labels: existing,
        systemLabels: systemLabelsFrom(existing),
        alreadyClassified: true,
        notes: "already_classified"
      };
    }

    const fromContext = runtimeLlmFromRequestContext((key) => context.requestContext?.get?.(key));
    const llm = fromContext?.apiKey
      ? fromContext
      : await resolveRuntimeAiCredentials(userId, "classify");

    // Raw SQL: `mailSmartRuleRepository` is missing from the db ESM cache
    // Mastra prebundles. Inbox classify (`run-mail-classify`) still uses the repo.
    const smartRules = await runWithDb(db, async () => {
      const result = await db.execute(sql`
        select slug, title, description, keywords, enabled
        from mail_smart_rule
        where user_id = ${userId} and enabled = true
        order by sort_order, title
      `);
      const rows = Array.isArray(result) ? result : ((result as { rows?: unknown }).rows ?? []);
      if (!Array.isArray(rows)) return [];
      return rows.flatMap((raw) => {
        if (!raw || typeof raw !== "object") return [];
        const rule = raw as Record<string, unknown>;
        const slug = typeof rule.slug === "string" ? rule.slug.trim() : "";
        if (!slug) return [];
        return [
          {
            slug,
            title: typeof rule.title === "string" ? rule.title : "",
            description: typeof rule.description === "string" ? rule.description : "",
            keywords: Array.isArray(rule.keywords)
              ? rule.keywords.filter((item): item is string => typeof item === "string")
              : [],
            enabled: rule.enabled !== false
          }
        ];
      });
    });

    const run = await mailClassifyWorkflow.createRun();
    const result = await run.start({
      inputData: {
        messageId: row.id,
        userId,
        fromName: row.fromName ?? "",
        fromEmail: row.fromEmail ?? "unknown@invalid",
        subject: row.subject ?? "",
        preview: row.preview ?? "",
        bodyText: row.bodyText ?? "",
        labels: existing,
        fewShotCorrections: [],
        smartRules,
        llm
      },
      requestContext: context.requestContext
    });

    if (result.status !== "success") {
      return {
        ok: false,
        messageId,
        labels: existing,
        systemLabels: [],
        alreadyClassified: false,
        code: "CLASSIFY_FAILED",
        notes: result.status === "failed" ? String(result.error ?? "failed") : result.status
      };
    }

    const output = result.result as MailClassifyOutput;
    const labels = output.labels ?? existing;
    await runWithDb(db, () => mailMessageRepository.applyClassification(row.id, userId, labels));

    return {
      ok: true,
      messageId,
      labels,
      systemLabels: output.systemLabels ?? systemLabelsFrom(labels),
      alreadyClassified: false,
      notes: output.notes
    };
  }
});
