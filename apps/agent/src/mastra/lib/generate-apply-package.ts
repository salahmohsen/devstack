import { z } from "zod";

import {
  ApplyPackageDraftSchema,
  fetchPublicHtmlAsText,
  isThinJobDescription,
  type ApplyPackageDraft,
  type ApplyPackagePortfolioSnapshot,
  type ApplyPackageWorkflowInput
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  contactRepository,
  createDb,
  experienceRepository,
  projectRepository,
  runWithDb,
  stackRepository,
  userRepository
} from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

import { resolveRuntimeAiCredentials } from "#@/mastra/lib/resolve-runtime-ai";
import { createByoRequestContext } from "#@/mastra/runtime-llm";
import { applyPackageWorkflow } from "#@/mastra/workflows/apply-package-workflow";

/** Cap listing text injected into apply-package workflow (match API generate). */
const LISTING_MAX_CHARS = 12_000;

export type GenerateApplyPackageErrorCode =
  | "NOT_FOUND"
  | "NO_EVIDENCE"
  | "AI_NOT_CONFIGURED"
  | "AGENT_FAILED";

export type GenerateApplyPackageResult =
  | { ok: true; applicationId: string }
  | { ok: false; code: GenerateApplyPackageErrorCode; message?: string };

const emailSchema = z.string().email();

function sanitizeDraftIds(
  draft: ApplyPackageDraft,
  portfolio: ApplyPackagePortfolioSnapshot
): ApplyPackageDraft {
  const expIds = new Set(portfolio.experiences.map((e) => e.id));
  const projectIds = new Set(portfolio.projects.map((p) => p.id));
  const stackIds = new Set(portfolio.stacks.map((s) => s.id));

  return {
    ...draft,
    experiences: draft.experiences.filter((e) => expIds.has(e.experienceId)),
    projects: draft.projects.filter((p) => projectIds.has(p.projectId)),
    stacks: draft.stacks.filter((s) => stackIds.has(s.stackId))
  };
}

function pickHttpListingUrl(
  url: string | null | undefined,
  applyUrl: string | null | undefined
): string | null {
  for (const candidate of [url, applyUrl]) {
    const raw = candidate?.trim();
    if (!raw) continue;
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return raw;
    } catch {
      // ignore invalid
    }
  }
  return null;
}

async function loadPortfolioSnapshot(
  userId: string
): Promise<ApplyPackagePortfolioSnapshot | null> {
  const db = createDb();
  const [userRow, experiencesRaw, projectsRaw, stacksRaw, contactsRaw] = await runWithDb(db, () =>
    Promise.all([
      userRepository.findById(userId),
      experienceRepository.findOptedInByUserId(userId),
      projectRepository.findOptedInByUserId(userId),
      stackRepository.findOptedInByUserId(userId),
      contactRepository.findOptedInByUserId(userId)
    ])
  );

  if (!userRow) return null;

  const experiences = experiencesRaw.filter((e): e is NonNullable<typeof e> => e != null);
  const projects = projectsRaw.filter((p): p is NonNullable<typeof p> => p != null);
  const stacks = stacksRaw.filter((s): s is NonNullable<typeof s> => s != null);

  return {
    profile: {
      name: userRow.name?.trim() || "Candidate",
      email: userRow.email,
      summary: userRow.summary?.trim() ? userRow.summary : null
    },
    contacts: contactsRaw.map((c) => {
      return { type: c.type, value: c.value };
    }),
    experiences: experiences.map((e) => {
      return {
        id: e.id,
        title: e.title,
        organization: e.organization,
        description: e.description,
        fromDate: e.fromDate ?? null,
        toDate: e.toDate ?? null,
        isPresent: e.isPresent ?? false
      };
    }),
    projects: projects.map((p) => {
      return {
        id: p.id,
        title: p.title,
        summary: p.summary,
        description: p.description,
        analysis: p.analysis ?? null,
        year: p.year
      };
    }),
    stacks: stacks.map((s) => {
      return { id: s.id, name: s.name };
    })
  };
}

/**
 * In-process parity with packages/api `generateApplyPackage`.
 * Preflight → optional thin-JD page fetch → applyPackageWorkflow → persist draft.
 * Does not import `@tsu-stack/api` (Mastra bundler cannot absorb that graph).
 */
export async function generateApplyPackage(input: {
  applicationId: string;
  userId: string;
}): Promise<GenerateApplyPackageResult> {
  const db = createDb();
  const app = await runWithDb(db, () =>
    applicationRepository.findByIdForUser(input.applicationId, input.userId)
  );
  if (!app) return { ok: false, code: "NOT_FOUND" };

  const portfolio = await loadPortfolioSnapshot(input.userId);
  if (!portfolio) return { ok: false, code: "NOT_FOUND" };

  if (portfolio.experiences.length === 0 && portfolio.projects.length === 0) {
    return {
      ok: false,
      code: "NO_EVIDENCE",
      message: "Add portfolio experiences or projects before generating an apply package"
    };
  }

  const llm = await resolveRuntimeAiCredentials(input.userId, "applyPackage");
  if (!llm.apiKey?.trim()) {
    return {
      ok: false,
      code: "AI_NOT_CONFIGURED",
      message: "Configure a BYO API key under Settings → AI"
    };
  }

  let listingPageText: string | null = null;
  let listingUrl: string | null = null;

  if (isThinJobDescription(app.description)) {
    listingUrl = pickHttpListingUrl(app.url, app.applyUrl);
    if (listingUrl) {
      const fetched = await fetchPublicHtmlAsText(listingUrl, { maxChars: LISTING_MAX_CHARS });
      if (fetched.ok && fetched.text.trim().length > 0) {
        listingPageText = fetched.text;
        if (fetched.finalUrl) listingUrl = fetched.finalUrl;
      }
    }
  }

  const workflowInput: ApplyPackageWorkflowInput = {
    applicationId: app.id,
    job: {
      title: app.title,
      companyName: app.companyName,
      description: app.description,
      url: app.url,
      applyUrl: app.applyUrl,
      applyMethod: app.applyMethod,
      matchScore: app.matchScore,
      location: app.location,
      salaryRange: app.salaryRange,
      notes: app.notes,
      source: app.source
    },
    listingPageText,
    listingUrl,
    portfolio,
    llm
  };

  let draft: ApplyPackageDraft;
  try {
    const run = await applyPackageWorkflow.createRun();
    const requestContext = createByoRequestContext(llm, { userId: input.userId });
    const result = await run.start({
      inputData: workflowInput,
      requestContext
    });

    if (result.status !== "success") {
      const failMessage =
        result.status === "failed"
          ? result.error instanceof Error
            ? result.error.message
            : String(result.error)
          : result.status === "tripwire"
            ? (result.tripwire?.reason ?? "workflow tripwire")
            : `workflow status ${result.status}`;

      const failLog = createLogger({ operation: "agent__apply_package_generate_failed" });
      failLog.error(new Error(`Apply package workflow failed: ${failMessage}`), {
        event: "apply_package_generate_failed",
        applicationId: app.id,
        userId: input.userId,
        workflowStatus: result.status
      });
      failLog.emit({ _forceKeep: true });

      return {
        ok: false,
        code: "AGENT_FAILED",
        message: failMessage.slice(0, 200)
      };
    }

    draft = result.result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const failLog = createLogger({ operation: "agent__apply_package_generate_failed" });
    failLog.error(error instanceof Error ? error : new Error(msg), {
      event: "apply_package_generate_failed",
      applicationId: app.id,
      userId: input.userId
    });
    failLog.emit({ _forceKeep: true });
    return {
      ok: false,
      code: "AGENT_FAILED",
      message: msg.slice(0, 200)
    };
  }

  let sanitized = sanitizeDraftIds(
    {
      ...draft,
      applicationId: app.id
    },
    portfolio
  );

  const reparsed = ApplyPackageDraftSchema.safeParse(sanitized);
  if (!reparsed.success) {
    return {
      ok: false,
      code: "AGENT_FAILED",
      message: "Apply package draft failed schema validation after sanitize"
    };
  }
  sanitized = reparsed.data;

  const proposedEmail = sanitized.proposedRecruiterEmail?.trim() ?? null;
  const emailOk = proposedEmail ? emailSchema.safeParse(proposedEmail).success : false;
  const setRecruiter = app.recruiterEmail == null && emailOk && proposedEmail != null;

  const updated = await runWithDb(db, async () => {
    const row = await applicationRepository.update(app.id, input.userId, {
      applyPackageDraft: sanitized,
      applyPackageDraftedAt: new Date(),
      ...(setRecruiter ? { recruiterEmail: proposedEmail } : {})
    });
    if (!row) return null;
    await applicationActivityRepository.append({
      userId: input.userId,
      applicationId: row.id,
      kind: "package_generated",
      actorUserId: input.userId,
      metadata: { via: "hub" }
    });
    return row;
  });

  if (!updated) return { ok: false, code: "NOT_FOUND" };

  return { ok: true, applicationId: updated.id };
}
