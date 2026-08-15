import { type RequestContext } from "@mastra/core/di";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import {
  AiJobAgentTakeBatchSchema,
  AiJobMatchBatchSchema,
  canGenerateAgentTake,
  canonicalizeJobUrl,
  formatJobMatchScorePrompt,
  HarvestedJobSchema,
  HarvestJobPreferenceSchema,
  inferApplicationSource,
  isValidHarvestedJob,
  MailJobHarvestAfterScoreSchema,
  MailJobHarvestWorkflowInputSchema,
  MailJobHarvestWorkflowOutputSchema,
  MailNotifierExtractSchema,
  mergeJobListingExtract,
  scoreJobAgainstPreference,
  shouldPassAllHarvestJobs,
  type HarvestedJob,
  type HarvestJobPreference,
  type RuntimeLlmConfig,
  type ScoredHarvestedJob
} from "@tsu-stack/core";

import { createByoRequestContext, generateModelOption } from "#@/mastra/byo-model";
import { fetchJobPageContent } from "#@/mastra/tools/fetch-job-page.tool";

/** BYO model agents still resolve via requestContext when model override is incomplete. */
function harvestRequestContext(llm: RuntimeLlmConfig | undefined, userId: string): RequestContext {
  return createByoRequestContext(llm, { userId });
}

const MAIL_EXTRACT_TIMEOUT_MS = 90_000;
const PAGE_EXTRACT_TIMEOUT_MS = 45_000;
const SCORE_TIMEOUT_MS = 60_000;
const TAKE_TIMEOUT_MS = 60_000;
const MAX_JOBS_TO_ENRICH = 8;
/** Cap take generation to match enrich budget. */
const MAX_JOBS_TO_TAKE = 8;

const afterMailExtractSchema = z.object({
  messageId: z.string(),
  userId: z.string(),
  isJobNotifier: z.boolean(),
  jobs: z.array(HarvestedJobSchema),
  notes: z.string().optional(),
  preference: HarvestJobPreferenceSchema.optional(),
  llm: z.unknown().optional()
});

const afterPageEnrichSchema = afterMailExtractSchema;

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

function urlKey(url: string): string {
  return (canonicalizeJobUrl(url) ?? url).toLowerCase();
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
      preference: inputData.preference,
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

    // Pass raw text + HTML (truncated). Agent + job-notifier-harvest skill extracts URLs — no regex harvest.
    const body = (inputData.bodyText ?? "").slice(0, 14_000);
    const html = (inputData.bodyHtml ?? "").slice(0, 12_000);
    const prompt = `Analyze this email for job listings.

Activate the **job-notifier-harvest** skill first, then extract.

From: ${inputData.fromName} <${inputData.fromEmail}>
Subject: ${inputData.subject}

--- BODY TEXT ---
${body}
--- END BODY ---

--- BODY HTML (listing URLs often only appear in <a href>) ---
${html}
--- END HTML ---

Return isJobNotifier and jobs[] with a real listingUrl for every role card. Never invent URLs.`;

    const requestContext = harvestRequestContext(
      inputData.llm as RuntimeLlmConfig | undefined,
      inputData.userId
    );

    try {
      const result = await Promise.race([
        agent.generate([{ role: "user", content: prompt }], {
          structuredOutput: { schema: MailNotifierExtractSchema },
          model,
          requestContext
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

      const jobsByUrl = new Map<string, HarvestedJob>();
      for (const card of parsed.data.jobs) {
        const job = toHarvestedFromMailCard(card, inputData.fromEmail);
        if (!job || !isValidHarvestedJob(job)) continue;
        const key = urlKey(job.listingUrl);
        if (!jobsByUrl.has(key)) jobsByUrl.set(key, job);
      }

      const jobs = [...jobsByUrl.values()];
      return {
        ...base,
        isJobNotifier: parsed.data.isJobNotifier || jobs.length > 0,
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
  description:
    "For each listing URL: fetch page, drop closed/expired postings, then LLM structured job fields",
  inputSchema: afterMailExtractSchema,
  outputSchema: afterPageEnrichSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData.isJobNotifier || inputData.jobs.length === 0) {
      return {
        messageId: inputData.messageId,
        userId: inputData.userId,
        isJobNotifier: inputData.isJobNotifier,
        jobs: [],
        notes: inputData.notes ?? "not_notifier_or_empty",
        preference: inputData.preference,
        llm: inputData.llm
      };
    }

    const agent = mastra?.getAgent("jobPageExtractor");
    const { model, skipNote } = generateModelOption(inputData.llm as RuntimeLlmConfig | undefined);
    const canAiEnrich = Boolean(agent && model);

    const enriched: HarvestedJob[] = [];
    const slice = inputData.jobs.slice(0, MAX_JOBS_TO_ENRICH);
    let pagesOk = 0;
    let pagesFailed = 0;
    let pagesClosed = 0;
    const requestContext = harvestRequestContext(
      inputData.llm as RuntimeLlmConfig | undefined,
      inputData.userId
    );

    for (const seed of slice) {
      try {
        const page = await fetchJobPageContent(seed.listingUrl);
        if (page.ok) pagesOk += 1;
        else pagesFailed += 1;

        // Drop closed / expired public postings (LinkedIn "No longer accepting applications").
        if (page.extract?.listingClosed) {
          pagesClosed += 1;
          continue;
        }

        // Always merge deterministic guest-page extract (LinkedIn etc.) so empty
        // description / "hiring for a Remote role" seeds recover even if AI fails.
        const seedWithExtract = page.extract ? mergeJobListingExtract(seed, page.extract) : seed;

        // No page AI — still use fetch + extract (closed filter above already applied).
        if (!canAiEnrich || !agent || !model) {
          if (isValidHarvestedJob(seedWithExtract)) enriched.push(seedWithExtract);
          else if (isValidHarvestedJob(seed)) enriched.push(seed);
          continue;
        }

        const pageBlock = page.ok
          ? `Page fetch OK (status ${page.status ?? "?"})
finalUrl: ${page.finalUrl ?? seed.listingUrl}
pageTitle: ${page.title ?? "(none)"}
--- PAGE TEXT ---
${page.text.slice(0, 10_000)}
--- END PAGE ---`
          : `Page fetch FAILED: ${page.error ?? "unknown"}
Use mail-card hints + any deterministic extract only; do not invent employers.`;

        const prompt = `Enrich this job listing from fetched page text + mail-card hints.

listingUrl: ${seed.listingUrl}
Mail-card / seed hints (may be incomplete / wrong marketing title):
- title: ${seedWithExtract.title}
- companyName: ${seedWithExtract.companyName}
- location: ${seedWithExtract.location ?? "null"}
- applyMethod hint: ${seedWithExtract.applyMethod}
${seedWithExtract.description?.trim() ? `- description already extracted (${seedWithExtract.description.length} chars) — refine, do not drop` : "- description: missing — fill from PAGE TEXT / DETERMINISTIC EXTRACT"}

${pageBlock}

Return structured job fields using EXACT keys:
title, companyName (not "company"), location, salaryRange, description, listingUrl, applyUrl, applyMethod, workMode, source, sourceLabel.
applyMethod must be one of: easy_apply | external | email | unknown (lowercase, not "Unknown").
workMode must be one of: remote | hybrid | onsite | null.
source (platform enum only) must be one of: linkedin | indeed | company_website | referral | recruiter | other — NEVER a brand name.
If the listing host is not LinkedIn/Indeed/company ATS, use source "other" and set sourceLabel to a short brand (e.g. "Jack & Jill"). Do not put brands in source.
Prefer DETERMINISTIC PAGE EXTRACT and page facts over mail hints when they conflict.
title must be the real role (e.g. "Junior Web Developer"), never "Company is hiring for a Remote role".
listingUrl must stay a real http(s) job URL (prefer the jobs/view id).
description: full posting body when available (not only the meta one-liner).
If page is a login wall / empty, keep title/companyName from seed when they are real role/company names — never leave Unknown if the page title has the role.
If the page says the job is closed / no longer accepting applications, still return fields but harvest will drop closed listings.`;

        const result = await Promise.race([
          agent.generate([{ role: "user", content: prompt }], {
            structuredOutput: { schema: HarvestedJobSchema },
            model,
            requestContext,
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
          const listingUrl = canonicalizeJobUrl(parsed.data.listingUrl) ?? seed.listingUrl;
          let job: HarvestedJob = {
            ...parsed.data,
            listingUrl,
            // Server re-infers platform on persist; keep seed/inferred enum only.
            source: parsed.data.source ?? seed.source ?? inferApplicationSource(listingUrl),
            sourceLabel: parsed.data.sourceLabel ?? null
          };
          // AI sometimes omits description even when extract has it — never drop.
          if (!job.description?.trim() && seedWithExtract.description?.trim()) {
            job = { ...job, description: seedWithExtract.description };
          }
          if (page.extract) job = mergeJobListingExtract(job, page.extract);
          if (isValidHarvestedJob(job)) enriched.push(job);
          else if (isValidHarvestedJob(seedWithExtract)) enriched.push(seedWithExtract);
          else if (isValidHarvestedJob(seed)) enriched.push(seed);
        } else if (isValidHarvestedJob(seedWithExtract)) {
          enriched.push(seedWithExtract);
        } else if (isValidHarvestedJob(seed)) {
          enriched.push(seed);
        }
      } catch {
        if (isValidHarvestedJob(seed)) enriched.push(seed);
      }
    }

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
        `fetch_fail_${pagesFailed}`,
        pagesClosed > 0 ? `skipped_closed_${pagesClosed}` : null,
        !canAiEnrich ? (skipNote ?? "page_agent_skipped_mail_only") : null
      ]
        .filter(Boolean)
        .join(";"),
      preference: inputData.preference,
      llm: inputData.llm
    };
  }
});

const scoreJobsAgainstPreferenceAi = createStep({
  id: "ai-score-jobs-against-preference",
  description: "LLM scores each job against seeker JobPreference (semantic, not keyword plumbing)",
  inputSchema: afterPageEnrichSchema,
  outputSchema: MailJobHarvestAfterScoreSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData.isJobNotifier || inputData.jobs.length === 0) {
      return {
        messageId: inputData.messageId,
        userId: inputData.userId,
        isJobNotifier: inputData.isJobNotifier,
        jobs: [],
        notes: inputData.notes ?? "not_notifier_or_empty",
        preference: inputData.preference,
        llm: inputData.llm
      };
    }

    const prefs: HarvestJobPreference = inputData.preference ?? {
      workModes: [],
      locations: [],
      roleKeywords: [],
      excludeKeywords: [],
      salaryMin: null,
      salaryCurrency: null,
      minMatchScore: 60
    };
    const minScore = prefs.minMatchScore ?? 60;
    const evidence = prefs.evidence ?? null;
    const passAll = shouldPassAllHarvestJobs(prefs, evidence);

    const heuristicScore = (job: HarvestedJob, extraReasons: string[] = []): ScoredHarvestedJob => {
      const r = scoreJobAgainstPreference(job, prefs, evidence);
      return {
        ...job,
        matchScore: r.score,
        matchPassed: passAll ? true : r.passed,
        matchReasons: [
          ...r.reasons,
          ...extraReasons,
          ...(passAll ? ["open_preference_profile"] : [])
        ],
        agentTake: null
      };
    };

    const agent = mastra?.getAgent("jobPreferenceMatchScorer");
    const { model, skipNote } = generateModelOption(inputData.llm as RuntimeLlmConfig | undefined);

    // No scorer / no model → rules + profile evidence (do not drop listings).
    if (!agent || !model) {
      return {
        messageId: inputData.messageId,
        userId: inputData.userId,
        isJobNotifier: true,
        jobs: inputData.jobs.map((job) => heuristicScore(job, ["heuristic_match"])),
        notes: [inputData.notes, skipNote ?? "match_scorer_unavailable_heuristic"]
          .filter(Boolean)
          .join(";"),
        preference: inputData.preference,
        llm: inputData.llm
      };
    }

    const jobsJson = inputData.jobs.map((j) => {
      return {
        listingUrl: j.listingUrl,
        title: j.title,
        companyName: j.companyName,
        location: j.location ?? null,
        workMode: j.workMode ?? null,
        applyMethod: j.applyMethod,
        salaryRange: j.salaryRange ?? null,
        description: (j.description ?? "").slice(0, 400) || null
      };
    });

    const prompt = formatJobMatchScorePrompt({
      prefs,
      evidence,
      jobs: jobsJson,
      minScore
    });

    const requestContext = harvestRequestContext(
      inputData.llm as RuntimeLlmConfig | undefined,
      inputData.userId
    );

    try {
      const result = await Promise.race([
        agent.generate([{ role: "user", content: prompt }], {
          structuredOutput: { schema: AiJobMatchBatchSchema },
          model,
          requestContext
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`match score timeout ${SCORE_TIMEOUT_MS}ms`)),
            SCORE_TIMEOUT_MS
          )
        )
      ]);

      const parsed = AiJobMatchBatchSchema.safeParse(result.object);
      if (!parsed.success) {
        return {
          messageId: inputData.messageId,
          userId: inputData.userId,
          isJobNotifier: true,
          jobs: inputData.jobs.map((job) => heuristicScore(job, ["heuristic_match"])),
          notes: [inputData.notes, "match_score_schema_failed_heuristic"].filter(Boolean).join(";"),
          preference: inputData.preference,
          llm: inputData.llm
        };
      }

      const byUrl = new Map(parsed.data.matches.map((m) => [urlKey(m.listingUrl), m] as const));

      const scored: ScoredHarvestedJob[] = [];
      let unmatchedScoreRows = 0;
      for (const job of inputData.jobs) {
        const hit = byUrl.get(urlKey(job.listingUrl));
        if (!hit) {
          unmatchedScoreRows += 1;
          scored.push(heuristicScore(job, ["score_row_missing"]));
          continue;
        }
        const score = Math.max(0, Math.min(100, Math.round(hit.score)));
        const passed = passAll ? true : hit.passed && score >= minScore;
        scored.push({
          ...job,
          matchScore: score,
          matchPassed: passed,
          matchReasons: [
            ...(hit.reasons?.length ? hit.reasons : ["ai_match"]),
            ...(passAll ? ["open_preference_profile"] : [])
          ],
          agentTake: null
        });
      }

      return {
        messageId: inputData.messageId,
        userId: inputData.userId,
        isJobNotifier: true,
        jobs: scored,
        notes: [
          inputData.notes,
          `ai_match_scored_${scored.length}`,
          passAll ? "open_preference_pass_all" : null,
          unmatchedScoreRows > 0 ? `score_url_miss_${unmatchedScoreRows}` : null
        ]
          .filter(Boolean)
          .join(";"),
        preference: inputData.preference,
        llm: inputData.llm
      };
    } catch (err) {
      return {
        messageId: inputData.messageId,
        userId: inputData.userId,
        isJobNotifier: true,
        jobs: inputData.jobs.map((job) => heuristicScore(job, ["heuristic_match"])),
        notes: [
          inputData.notes,
          err instanceof Error ? err.message : "match_score_error",
          "match_score_error_heuristic"
        ]
          .filter(Boolean)
          .join(";"),
        preference: inputData.preference,
        llm: inputData.llm
      };
    }
  }
});

/**
 * Soft-fail narrative take for matchPassed jobs only.
 * Never drops scored jobs — create path still runs if take fails.
 */
const generateAgentTakesAi = createStep({
  id: "ai-generate-agent-takes",
  description: "LLM writes 1–3 sentence agent takes for match-passed harvest jobs (soft-fail)",
  inputSchema: MailJobHarvestAfterScoreSchema,
  outputSchema: MailJobHarvestWorkflowOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const base = {
      messageId: inputData.messageId,
      userId: inputData.userId,
      isJobNotifier: inputData.isJobNotifier,
      jobs: inputData.jobs,
      notes: inputData.notes
    };

    if (!inputData.isJobNotifier || inputData.jobs.length === 0) {
      return base;
    }

    const passed = inputData.jobs
      .filter((j) => j.matchPassed && canGenerateAgentTake(j))
      .slice(0, MAX_JOBS_TO_TAKE);
    if (passed.length === 0) {
      const skippedThin = inputData.jobs.filter(
        (j) => j.matchPassed && !canGenerateAgentTake(j)
      ).length;
      return {
        ...base,
        notes: [
          inputData.notes,
          skippedThin > 0
            ? `agent_take_skip_thin_listing_${skippedThin}`
            : "agent_take_skip_no_passed"
        ]
          .filter(Boolean)
          .join(";")
      };
    }

    const agent = mastra?.getAgent("jobAgentTake");
    const { model, skipNote } = generateModelOption(inputData.llm as RuntimeLlmConfig | undefined);
    if (!agent || !model) {
      return {
        ...base,
        notes: [inputData.notes, skipNote ?? "agent_take_unavailable"].filter(Boolean).join(";")
      };
    }

    const prefs: HarvestJobPreference = inputData.preference ?? {
      workModes: [],
      locations: [],
      roleKeywords: [],
      excludeKeywords: [],
      salaryMin: null,
      salaryCurrency: null,
      minMatchScore: 60
    };

    const jobsJson = passed.map((j) => {
      return {
        listingUrl: j.listingUrl,
        title: j.title,
        companyName: j.companyName,
        location: j.location ?? null,
        salaryRange: j.salaryRange ?? null,
        matchScore: j.matchScore,
        matchReasons: j.matchReasons ?? [],
        description: (j.description ?? "").slice(0, 800) || null
      };
    });

    const prompt = `Write a short agent take for EACH match-passed job.

Seeker preferences (JSON):
${JSON.stringify(
  {
    workModes: prefs.workModes,
    locations: prefs.locations,
    roleKeywords: prefs.roleKeywords,
    excludeKeywords: prefs.excludeKeywords,
    salaryMin: prefs.salaryMin,
    salaryCurrency: prefs.salaryCurrency
  },
  null,
  2
)}

Jobs (JSON array):
${JSON.stringify(jobsJson, null, 2)}

Return takes[] with listingUrl + agentTake (1–3 sentences each, product tone).
Ground takes in job fields and match reasons. Do not invent employers or tech not in the input.
Use the exact listingUrl from each job.`;

    const requestContext = harvestRequestContext(
      inputData.llm as RuntimeLlmConfig | undefined,
      inputData.userId
    );

    try {
      const result = await Promise.race([
        agent.generate([{ role: "user", content: prompt }], {
          structuredOutput: { schema: AiJobAgentTakeBatchSchema },
          model,
          requestContext
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`agent take timeout ${TAKE_TIMEOUT_MS}ms`)),
            TAKE_TIMEOUT_MS
          )
        )
      ]);

      const parsed = AiJobAgentTakeBatchSchema.safeParse(result.object);
      if (!parsed.success) {
        return {
          ...base,
          notes: [inputData.notes, "agent_take_schema_failed"].filter(Boolean).join(";")
        };
      }

      const takeByUrl = new Map(
        parsed.data.takes.map((t) => {
          const take = t.agentTake.replace(/\s+/g, " ").trim().slice(0, 1200);
          return [urlKey(t.listingUrl), take] as const;
        })
      );

      let filled = 0;
      const jobs: ScoredHarvestedJob[] = inputData.jobs.map((job) => {
        if (!job.matchPassed) return { ...job, agentTake: job.agentTake ?? null };
        const take = takeByUrl.get(urlKey(job.listingUrl));
        if (!take) return { ...job, agentTake: null };
        filled += 1;
        return { ...job, agentTake: take };
      });

      return {
        messageId: inputData.messageId,
        userId: inputData.userId,
        isJobNotifier: true,
        jobs,
        notes: [inputData.notes, `agent_take_filled_${filled}_of_${passed.length}`]
          .filter(Boolean)
          .join(";")
      };
    } catch (err) {
      // Soft-fail: still return scored jobs without takes
      return {
        ...base,
        notes: [
          inputData.notes,
          err instanceof Error ? `agent_take_error:${err.message}` : "agent_take_error"
        ]
          .filter(Boolean)
          .join(";")
      };
    }
  }
});

export const mailJobHarvestWorkflow = createWorkflow({
  id: "mail-job-harvest-workflow",
  inputSchema: MailJobHarvestWorkflowInputSchema,
  outputSchema: MailJobHarvestWorkflowOutputSchema
})
  .then(extractFromMailAi)
  .then(enrichJobsFromPages)
  .then(scoreJobsAgainstPreferenceAi)
  .then(generateAgentTakesAi);

mailJobHarvestWorkflow.commit();
