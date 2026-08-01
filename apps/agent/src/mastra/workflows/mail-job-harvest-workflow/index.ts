import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import {
  canonicalizeJobUrl,
  HarvestedJobSchema,
  inferApplicationSource,
  isValidHarvestedJob,
  MailJobHarvestWorkflowInputSchema,
  MailJobHarvestWorkflowOutputSchema,
  MailNotifierExtractSchema,
  type HarvestedJob,
  type RuntimeLlmConfig
} from "@tsu-stack/core";

import { generateModelOption } from "#@/mastra/byo-model";
import { fetchJobPageContent } from "#@/mastra/tools/fetch-job-page.tool";

const MAIL_EXTRACT_TIMEOUT_MS = 60_000;
const PAGE_EXTRACT_TIMEOUT_MS = 45_000;
const MAX_JOBS_TO_ENRICH = 8;

const afterMailExtractSchema = z.object({
  messageId: z.string(),
  userId: z.string(),
  isJobNotifier: z.boolean(),
  jobs: z.array(HarvestedJobSchema),
  notes: z.string().optional(),
  llm: z.unknown().optional()
});

function toHarvestedFromMailCard(
  card: {
    listingUrl: string;
    title?: string | null;
    companyName?: string | null;
    location?: string | null;
    applyMethod?: HarvestedJob["applyMethod"] | null;
    workMode?: HarvestedJob["workMode"] | null;
  },
  fromEmail: string
): HarvestedJob | null {
  const listingUrl = canonicalizeJobUrl(card.listingUrl) ?? card.listingUrl;
  if (!listingUrl.startsWith("http")) return null;
  const title = (card.title ?? "").trim() || "Unknown role";
  const companyName = (card.companyName ?? "").trim() || "Unknown company";
  const job: HarvestedJob = {
    title: title.slice(0, 300),
    companyName: companyName.slice(0, 300),
    location: card.location?.trim() ? card.location.trim() : null,
    salaryRange: null,
    description: null,
    listingUrl,
    applyUrl: null,
    applyMethod: card.applyMethod ?? "unknown",
    workMode: card.workMode ?? null,
    source: inferApplicationSource(listingUrl, fromEmail)
  };
  return job;
}

const extractFromMailAi = createStep({
  id: "ai-extract-jobs-from-mail",
  description: "LLM reads the email and extracts job listing cards + URLs",
  inputSchema: MailJobHarvestWorkflowInputSchema,
  outputSchema: afterMailExtractSchema,
  execute: async ({ inputData, mastra }) => {
    const base = {
      messageId: inputData.messageId,
      userId: inputData.userId,
      llm: inputData.llm
    };

    const agent = mastra?.getAgent("jobNotifierMailExtractor");
    const { model, skipNote } = generateModelOption(inputData.llm as RuntimeLlmConfig | undefined);
    if (!agent || !model) {
      return {
        ...base,
        isJobNotifier: false,
        jobs: [],
        notes: skipNote ?? "mail_extract_agent_unavailable"
      };
    }

    const body = (inputData.bodyText ?? "").slice(0, 14_000);
    const htmlSnippet = (inputData.bodyHtml ?? "").replace(/<[^>]+>/g, " ").slice(0, 4_000);
    const prompt = `Analyze this email for job listings.

From: ${inputData.fromName} <${inputData.fromEmail}>
Subject: ${inputData.subject}

--- BODY TEXT ---
${body}
--- END BODY ---

${htmlSnippet ? `--- HTML TEXT SNIPPET ---\n${htmlSnippet}\n--- END HTML ---` : ""}

Return isJobNotifier and jobs[] with listingUrl for every role card.`;

    try {
      const result = await Promise.race([
        agent.generate([{ role: "user", content: prompt }], {
          structuredOutput: { schema: MailNotifierExtractSchema },
          model
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`mail extract timeout ${MAIL_EXTRACT_TIMEOUT_MS}ms`)),
            MAIL_EXTRACT_TIMEOUT_MS
          )
        )
      ]);

      const parsed = MailNotifierExtractSchema.safeParse(result.object);
      if (!parsed.success) {
        return {
          ...base,
          isJobNotifier: false,
          jobs: [],
          notes: "mail_extract_schema_failed"
        };
      }

      const jobs: HarvestedJob[] = [];
      for (const card of parsed.data.jobs) {
        const job = toHarvestedFromMailCard(card, inputData.fromEmail);
        if (job) jobs.push(job);
      }

      return {
        ...base,
        isJobNotifier: parsed.data.isJobNotifier,
        jobs,
        notes: parsed.data.reason ?? `ai_mail_extract_${jobs.length}`
      };
    } catch (err) {
      return {
        ...base,
        isJobNotifier: false,
        jobs: [],
        notes: err instanceof Error ? err.message : "mail_extract_error"
      };
    }
  }
});

const enrichJobsFromPages = createStep({
  id: "ai-enrich-jobs-from-pages",
  description: "For each listing URL: fetch-job-page tool content, then LLM structured job fields",
  inputSchema: afterMailExtractSchema,
  outputSchema: MailJobHarvestWorkflowOutputSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData.isJobNotifier || inputData.jobs.length === 0) {
      return {
        messageId: inputData.messageId,
        userId: inputData.userId,
        isJobNotifier: inputData.isJobNotifier,
        jobs: [],
        notes: inputData.notes ?? "not_notifier_or_empty"
      };
    }

    const agent = mastra?.getAgent("jobPageExtractor");
    const { model, skipNote } = generateModelOption(inputData.llm as RuntimeLlmConfig | undefined);
    if (!agent || !model) {
      // Keep mail-only extract if page agent unavailable
      const kept = inputData.jobs.filter((j) => isValidHarvestedJob(j));
      return {
        messageId: inputData.messageId,
        userId: inputData.userId,
        isJobNotifier: true,
        jobs: kept,
        notes: [inputData.notes, skipNote ?? "page_agent_skipped_mail_only"]
          .filter(Boolean)
          .join(";")
      };
    }

    const enriched: HarvestedJob[] = [];
    const slice = inputData.jobs.slice(0, MAX_JOBS_TO_ENRICH);
    let pagesOk = 0;
    let pagesFailed = 0;

    for (const seed of slice) {
      try {
        // Deterministic tool fetch first (do not rely on the model remembering to call tools)
        const page = await fetchJobPageContent(seed.listingUrl);
        if (page.ok) pagesOk += 1;
        else pagesFailed += 1;

        const pageBlock = page.ok
          ? `Page fetch OK (status ${page.status ?? "?"})
finalUrl: ${page.finalUrl ?? seed.listingUrl}
pageTitle: ${page.title ?? "(none)"}
--- PAGE TEXT ---
${page.text.slice(0, 10_000)}
--- END PAGE ---`
          : `Page fetch FAILED: ${page.error ?? "unknown"}
Use mail-card hints only; do not invent employers.`;

        const prompt = `Enrich this job listing from fetched page text + mail-card hints.

listingUrl: ${seed.listingUrl}
Mail-card hints (may be incomplete / Unknown):
- title: ${seed.title}
- company: ${seed.companyName}
- location: ${seed.location ?? "null"}
- applyMethod hint: ${seed.applyMethod}

${pageBlock}

Return structured job fields. Prefer page facts over mail hints when they conflict.
listingUrl must stay a real http(s) job URL (prefer the jobs/view id).
If page is a login wall / empty, keep title/company from mail hints when they are real role/company names — never leave Unknown if the page title has the role.`;

        const result = await Promise.race([
          agent.generate([{ role: "user", content: prompt }], {
            structuredOutput: { schema: HarvestedJobSchema },
            model,
            // Allow tool fallback if the model still wants fetch-job-page
            maxSteps: 3
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`page extract timeout ${PAGE_EXTRACT_TIMEOUT_MS}ms`)),
              PAGE_EXTRACT_TIMEOUT_MS
            )
          )
        ]);

        const parsed = HarvestedJobSchema.safeParse(result.object);
        if (parsed.success) {
          const job = {
            ...parsed.data,
            listingUrl: canonicalizeJobUrl(parsed.data.listingUrl) ?? seed.listingUrl,
            source: parsed.data.source ?? seed.source ?? inferApplicationSource(seed.listingUrl)
          };
          if (isValidHarvestedJob(job)) enriched.push(job);
          else if (isValidHarvestedJob(seed)) enriched.push(seed);
        } else if (isValidHarvestedJob(seed)) {
          enriched.push(seed);
        }
      } catch {
        if (isValidHarvestedJob(seed)) enriched.push(seed);
      }
    }

    // Dedupe by listing URL
    const byUrl = new Map<string, HarvestedJob>();
    for (const j of enriched) {
      const key = canonicalizeJobUrl(j.listingUrl) ?? j.listingUrl;
      if (!byUrl.has(key)) byUrl.set(key, { ...j, listingUrl: key });
    }

    return {
      messageId: inputData.messageId,
      userId: inputData.userId,
      isJobNotifier: true,
      jobs: [...byUrl.values()],
      notes: [
        inputData.notes,
        `page_enriched_${byUrl.size}`,
        `fetch_ok_${pagesOk}`,
        `fetch_fail_${pagesFailed}`
      ]
        .filter(Boolean)
        .join(";")
    };
  }
});

export const mailJobHarvestWorkflow = createWorkflow({
  id: "mail-job-harvest-workflow",
  inputSchema: MailJobHarvestWorkflowInputSchema,
  outputSchema: MailJobHarvestWorkflowOutputSchema
})
  .then(extractFromMailAi)
  .then(enrichJobsFromPages);

mailJobHarvestWorkflow.commit();
