import { z } from "zod";

import {
  ApplyPackageDraftSchema,
  isThinJobDescription,
  type ApplyPackageDraft,
  type ApplyPackagePortfolioSnapshot,
  type ApplyPackageWorkflowInput
} from "@tsu-stack/core";
import {
  applicationRepository,
  contactRepository,
  experienceRepository,
  projectRepository,
  stackRepository,
  userRepository,
  type ApplicationEntity
} from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

import { agentFailureUserMessage } from "#@/lib/agent/agent-call-result";
import { callApplyPackageAgent } from "#@/lib/application/call-apply-package-agent";
import { fetchListingPageText, pickHttpListingUrl } from "#@/lib/application/fetch-listing-page";
import { generateAgentTake } from "#@/lib/application/generate-agent-take";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

export type GenerateApplyPackageErrorCode =
  | "NOT_FOUND"
  | "NO_EVIDENCE"
  | "AI_NOT_CONFIGURED"
  | "AGENT_FAILED";

export type GenerateApplyPackageResult =
  | { ok: true; application: ApplicationEntity }
  | { ok: false; code: GenerateApplyPackageErrorCode; message?: string };

const emailSchema = z.string().email();

/**
 * Keep only portfolio-known experience/project/stack ids.
 */
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

async function loadPortfolioSnapshot(
  userId: string
): Promise<ApplyPackagePortfolioSnapshot | null> {
  const [userRow, experiencesRaw, projectsRaw, stacksRaw, contactsRaw] = await Promise.all([
    userRepository.findById(userId),
    experienceRepository.findOptedInByUserId(userId),
    projectRepository.findOptedInByUserId(userId),
    stackRepository.findOptedInByUserId(userId),
    contactRepository.findOptedInByUserId(userId)
  ]);

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
 * Generate (or regenerate) an apply package draft for one application.
 * Preflight → optional thin-JD page fetch → agent → persist draft.
 */
export async function generateApplyPackage(input: {
  applicationId: string;
  userId: string;
}): Promise<GenerateApplyPackageResult> {
  const app = await applicationRepository.findByIdForUser(input.applicationId, input.userId);
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
      const fetched = await fetchListingPageText(listingUrl);
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

  const agentCall = await callApplyPackageAgent(workflowInput, { userId: input.userId });
  if (!agentCall.ok) {
    const failLog = createLogger({ operation: "api__apply_package_generate_failed" });
    failLog.error(new Error(`Apply package agent failed: ${agentCall.failure.reason}`), {
      event: "apply_package_generate_failed",
      applicationId: app.id,
      userId: input.userId,
      agentFailReason: agentCall.failure.reason,
      agentFailStatus: agentCall.failure.status ?? null,
      agentFailMessage: agentCall.failure.message ?? null
    });
    failLog.emit({ _forceKeep: true });
    return {
      ok: false,
      code: "AGENT_FAILED",
      message: agentCall.failure.message ?? agentFailureUserMessage(agentCall.failure)
    };
  }

  let draft = sanitizeDraftIds(
    {
      ...agentCall.data,
      applicationId: app.id
    },
    portfolio
  );

  const reparsed = ApplyPackageDraftSchema.safeParse(draft);
  if (!reparsed.success) {
    return {
      ok: false,
      code: "AGENT_FAILED",
      message: "Apply package draft failed schema validation after sanitize"
    };
  }
  draft = reparsed.data;

  const proposedEmail = draft.proposedRecruiterEmail?.trim() ?? null;
  const emailOk = proposedEmail ? emailSchema.safeParse(proposedEmail).success : false;
  const setRecruiter = app.recruiterEmail == null && emailOk && proposedEmail != null;

  const updated = await applicationRepository.update(app.id, input.userId, {
    applyPackageDraft: draft,
    applyPackageDraftedAt: new Date(),
    ...(setRecruiter ? { recruiterEmail: proposedEmail } : {})
  });

  if (!updated) return { ok: false, code: "NOT_FOUND" };

  // Ensure an agent take exists for the dialog + hub; never fail the package generation.
  let takeFailCode: string | null = null;
  let takeFailMessage: string | null = null;
  try {
    const takeResult = await generateAgentTake({
      applicationId: app.id,
      userId: input.userId
    });
    if (takeResult.ok) {
      return { ok: true, application: takeResult.application };
    }
    takeFailCode = takeResult.code;
    takeFailMessage = takeResult.message ?? null;
  } catch (error) {
    takeFailMessage = error instanceof Error ? error.message : String(error);
  }
  const takeLog = createLogger({ operation: "api__apply_package_take_failed" });
  takeLog.error(new Error(`Agent take failed: ${takeFailCode ?? takeFailMessage ?? "unknown"}`), {
    event: "apply_package_take_failed",
    applicationId: app.id,
    userId: input.userId,
    takeFailCode,
    takeFailMessage
  });
  takeLog.emit({ _forceKeep: true });

  return { ok: true, application: updated };
}
