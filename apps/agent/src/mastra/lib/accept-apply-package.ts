import { z } from "zod";

import {
  ApplyPackageDraftSchema,
  formatTailoredCoverFilename,
  formatTailoredResumeFilename,
  type AcceptApplyPackageInput,
  type ApplyPackageDraft
} from "@tsu-stack/core";
import {
  applicationRepository,
  contactRepository,
  createDb,
  experienceRepository,
  projectRepository,
  resumeRepository,
  runWithDb,
  stackRepository,
  userRepository,
  type ApplicationEntity
} from "@tsu-stack/db";

import { createAgentMediaBucket } from "#@/mastra/lib/media-bucket";
import { buildCoverLetterPdfBytes } from "#@/mastra/lib/pdf/cover-letter-pdf";
import { renderResumePdfBytes, type ResumeBuilderData } from "#@/mastra/lib/pdf/resume-pdf";

export type AcceptApplyPackageErrorCode =
  | "NOT_FOUND"
  | "NO_DRAFT"
  | "INVALID_DRAFT"
  | "STORAGE_NOT_CONFIGURED";

export type AcceptApplyPackageResult =
  | { ok: true; application: ApplicationEntity }
  | { ok: false; code: AcceptApplyPackageErrorCode; message?: string };

const emailSchema = z.string().email();

function resolveDraft(
  input: AcceptApplyPackageInput,
  app: ApplicationEntity
):
  | { ok: true; draft: ApplyPackageDraft }
  | { ok: false; code: AcceptApplyPackageErrorCode; message?: string } {
  if (input.draft) {
    const parsed = ApplyPackageDraftSchema.safeParse(input.draft);
    if (!parsed.success) {
      return {
        ok: false,
        code: "INVALID_DRAFT",
        message: "Apply package draft failed schema validation"
      };
    }
    return { ok: true, draft: { ...parsed.data, applicationId: app.id } };
  }

  if (app.applyPackageDraft == null) {
    return {
      ok: false,
      code: "NO_DRAFT",
      message: "No apply package draft to accept — prepare a package first"
    };
  }

  const parsed = ApplyPackageDraftSchema.safeParse(app.applyPackageDraft);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_DRAFT",
      message: "Stored apply package draft is invalid — regenerate the package"
    };
  }

  return { ok: true, draft: { ...parsed.data, applicationId: app.id } };
}

/**
 * Materialize resume + cover PDFs from apply package draft (agent-local parity).
 */
export async function acceptApplyPackage(input: {
  applicationId: string;
  userId: string;
  draft?: AcceptApplyPackageInput["draft"];
}): Promise<AcceptApplyPackageResult> {
  const media = createAgentMediaBucket();
  if (!media.ok) {
    return { ok: false, code: "STORAGE_NOT_CONFIGURED", message: media.message };
  }
  const mediaBucket = media.bucket;

  const db = createDb();
  return runWithDb(db, async () => {
    const app = await applicationRepository.findByIdForUser(input.applicationId, input.userId);
    if (!app) return { ok: false, code: "NOT_FOUND" as const };

    const resolved = resolveDraft({ applicationId: input.applicationId, draft: input.draft }, app);
    if (!resolved.ok) return resolved;
    const draft = resolved.draft;

    const includedExperiences = draft.experiences.filter((e) => e.include);
    const includedProjects = draft.projects.filter((p) => p.include);
    const includedStacks = draft.stacks.filter((s) => s.include);

    const [userRow, contactsRaw] = await Promise.all([
      userRepository.findById(input.userId),
      contactRepository.findOptedInByUserId(input.userId)
    ]);

    if (!userRow) return { ok: false, code: "NOT_FOUND" as const };

    const experienceRows = (
      await Promise.all(
        includedExperiences.map((e) =>
          experienceRepository.findByIdForUser(e.experienceId, input.userId)
        )
      )
    ).filter((row): row is NonNullable<typeof row> => row != null);

    const expById = new Map(experienceRows.map((row) => [row.id, row]));

    const projectRows = (
      await Promise.all(
        includedProjects.map((p) => projectRepository.findByIdForUser(p.projectId, input.userId))
      )
    ).filter((row): row is NonNullable<typeof row> => row != null);

    const projectById = new Map(projectRows.map((row) => [row.id, row]));

    const stackRows = (
      await Promise.all(
        includedStacks.map((s) => stackRepository.findByIdForUser(s.stackId, input.userId))
      )
    ).filter((row): row is NonNullable<typeof row> => row != null);
    const stackNameById = new Map(stackRows.map((row) => [row.id, row.name]));
    const stackTypeById = new Map(stackRows.map((row) => [row.id, row.type ?? null]));

    const resumeExperiences: ResumeBuilderData["portfolio"]["experiences"] = [];
    for (const draftExp of includedExperiences) {
      const live = expById.get(draftExp.experienceId);
      if (!live) continue;
      if (!live.portfolioEntryId) continue;
      resumeExperiences.push({
        organization: live.organization,
        title: live.title,
        fromDate: live.fromDate ?? null,
        toDate: live.toDate ?? null,
        isPresent: live.isPresent ?? false,
        description: live.description,
        includedInPortfolio: true,
        bullets: draftExp.rewrittenBullets
      });
    }

    const resumeProjects: ResumeBuilderData["portfolio"]["projects"] = [];
    for (const draftProj of includedProjects) {
      const live = projectById.get(draftProj.projectId);
      if (!live) continue;
      if (!live.portfolioEntryId) continue;
      resumeProjects.push({
        title: live.title,
        summary: draftProj.rewrittenSummary || live.summary,
        description: live.description ?? null,
        stacks: (live.stacks ?? [])
          .map((join) =>
            join.stack
              ? {
                  name: join.stack.name,
                  type: join.stack.type ?? null,
                  includedInPortfolio: !!join.stack.portfolioEntryId,
                  sortOrder: join.stack.sortOrder
                }
              : null
          )
          .filter(
            (
              s
            ): s is {
              name: string;
              type: string | null;
              includedInPortfolio: boolean;
              sortOrder: number;
            } => s != null
          ),
        includedInPortfolio: true,
        isArchived: live.isArchived ?? false,
        bullets: draftProj.rewrittenBullets
      });
    }

    const resumeStacks: ResumeBuilderData["portfolio"]["stacks"] = includedStacks.map((s) => {
      const row = stackRows.find((r) => r.id === s.stackId);
      return {
        name: stackNameById.get(s.stackId) ?? s.name,
        type: stackTypeById.get(s.stackId) ?? null,
        includedInPortfolio: true,
        sortOrder: row?.sortOrder
      };
    });

    const portfolio: ResumeBuilderData["portfolio"] = {
      experiences: resumeExperiences,
      projects: resumeProjects.filter((p) => !p.isArchived),
      stacks: resumeStacks,
      contacts: contactsRaw.map((c) => {
        return { type: c.type, value: c.value, sortOrder: c.sortOrder };
      })
    };

    const profile = {
      name: userRow.name?.trim() || "Candidate",
      email: userRow.email
    };

    const resumeFilename = formatTailoredResumeFilename({
      candidateName: profile.name,
      companyName: app.companyName,
      roleTitle: app.title
    });
    const resumeR2Key = `${input.userId}/resumes/${crypto.randomUUID()}.pdf`;

    const resumeBytes = await renderResumePdfBytes({
      portfolio,
      profile,
      professionalSummary: draft.professionalSummary
    });

    await mediaBucket.put(resumeR2Key, resumeBytes.slice().buffer as ArrayBuffer, {
      httpMetadata: { contentType: "application/pdf" }
    });

    const createdResume = await resumeRepository.create({
      userId: input.userId,
      prompt: `apply-package:${app.id}`,
      author: "agent",
      filename: resumeFilename,
      r2Key: resumeR2Key
    });

    const previousCoverKey = app.coverLetterR2Key;
    const coverUuid = crypto.randomUUID();
    const coverFilename = formatTailoredCoverFilename({
      candidateName: profile.name,
      companyName: app.companyName,
      roleTitle: app.title
    });
    const coverR2Key = `${input.userId}/cover-letters/${app.id}-${coverUuid}.pdf`;

    const coverBytes = await buildCoverLetterPdfBytes({
      candidateName: profile.name,
      body: draft.coverLetterBody,
      companyName: app.companyName,
      roleTitle: app.title
    });

    await mediaBucket.put(coverR2Key, coverBytes.slice().buffer as ArrayBuffer, {
      httpMetadata: { contentType: "application/pdf" }
    });

    const proposedEmail = draft.proposedRecruiterEmail?.trim() ?? null;
    const emailOk = proposedEmail ? emailSchema.safeParse(proposedEmail).success : false;
    const recruiterEmail = emailOk ? proposedEmail : (app.recruiterEmail ?? null);

    const updated = await applicationRepository.update(app.id, input.userId, {
      resumeId: createdResume.id,
      coverLetterBody: draft.coverLetterBody,
      coverLetterR2Key: coverR2Key,
      coverLetterFilename: coverFilename,
      outreachSubject: draft.outreachSubject,
      outreachBody: draft.outreachBody,
      recruiterEmail,
      applyPackageDraft: null,
      applyPackageDraftedAt: null
    });

    if (!updated) {
      try {
        await mediaBucket.delete(coverR2Key);
      } catch {
        // ignore
      }
      return { ok: false, code: "NOT_FOUND" as const };
    }

    if (previousCoverKey && previousCoverKey !== coverR2Key) {
      try {
        await mediaBucket.delete(previousCoverKey);
      } catch {
        // best-effort
      }
    }

    return { ok: true as const, application: updated };
  });
}
