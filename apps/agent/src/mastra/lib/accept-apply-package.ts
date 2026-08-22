import { z } from "zod";

import {
  ApplyPackageDraftSchema,
  applyPackageResumePrompt,
  defaultJobPreference,
  formatTailoredCoverFilename,
  formatTailoredResumeFilename,
  isApplyPackageResumePrompt,
  resolveApplyPackagePdfDraft,
  runFailClosedApplyKitReplace,
  type AcceptApplyPackageInput,
  type ApplyPackageDraft
} from "@tsu-stack/core";
import {
  applicationRepository,
  contactRepository,
  createDb,
  experienceRepository,
  jobPreferenceRepository,
  projectRepository,
  resumeRepository,
  runWithDb,
  stackRepository,
  userRepository,
  type ApplicationEntity
} from "@tsu-stack/db";
import {
  PdfEngineUnavailableError,
  PdfRenderFailedError,
  renderCoverLetterPdfBytes,
  renderResumePdfBytes,
  type ResumePdfPortfolio
} from "@tsu-stack/pdf";

import { createAgentLogger } from "#@/mastra/agent-logger";
import { createAgentMediaBucket } from "#@/mastra/lib/media-bucket";

export type AcceptApplyPackageErrorCode =
  | "NOT_FOUND"
  | "NO_DRAFT"
  | "INVALID_DRAFT"
  | "STORAGE_NOT_CONFIGURED"
  | "PDF_ENGINE_UNAVAILABLE"
  | "PDF_RENDER_FAILED"
  | "COMMIT_FAILED";

export type AcceptApplyPackageResult =
  | { ok: true; application: ApplicationEntity }
  | { ok: false; code: AcceptApplyPackageErrorCode; message?: string };

const emailSchema = z.string().email();

function pdfFailure(error: unknown): Extract<AcceptApplyPackageResult, { ok: false }> {
  if (error instanceof PdfEngineUnavailableError) {
    return { ok: false, code: "PDF_ENGINE_UNAVAILABLE", message: error.message };
  }
  if (error instanceof PdfRenderFailedError) {
    return { ok: false, code: "PDF_RENDER_FAILED", message: error.message };
  }
  return { ok: false, code: "PDF_RENDER_FAILED", message: "PDF render failed" };
}

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

    const prefRow = await jobPreferenceRepository.findByUserId(input.userId);
    const reviewApplyKit = prefRow?.reviewApplyKit ?? defaultJobPreference().reviewApplyKit;
    const recencyRows = await Promise.all(
      resolved.draft.experiences.map((e) =>
        experienceRepository.findByIdForUser(e.experienceId, input.userId)
      )
    );
    const pdfDraft = resolveApplyPackagePdfDraft({
      draft: resolved.draft,
      reviewApplyKit,
      experiences: recencyRows
        .filter((row): row is NonNullable<typeof row> => row != null)
        .map((row) => {
          return {
            experienceId: row.id,
            rewrittenBullets: [],
            fromDate: row.fromDate ?? null,
            isPresent: row.isPresent ?? false
          };
        }),
      jobSkills: [...(app.requiredSkills ?? []), ...(app.preferredSkills ?? [])]
    });
    const draft = pdfDraft.draft;

    if (pdfDraft.hiddenExperienceCount > 0 || pdfDraft.hiddenProjectCount > 0) {
      const includeLog = createAgentLogger({ operation: "agent__apply_kit_pdf_include" });
      includeLog.set({
        event: "apply_kit_pdf_include",
        applicationId: app.id,
        hiddenExperienceCount: pdfDraft.hiddenExperienceCount,
        hiddenProjectCount: pdfDraft.hiddenProjectCount,
        pageBudget: pdfDraft.pageBudget
      });
      includeLog.emit();
    }

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

    const resumeExperiences: ResumePdfPortfolio["experiences"] = [];
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

    const resumeProjects: ResumePdfPortfolio["projects"] = [];
    for (const draftProj of includedProjects) {
      const live = projectById.get(draftProj.projectId);
      if (!live) continue;
      if (!live.portfolioEntryId) continue;
      resumeProjects.push({
        title: live.title,
        summary: draftProj.rewrittenSummary || live.summary,
        demoUrl: live.demoUrl ?? null,
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

    const resumeStacks: ResumePdfPortfolio["stacks"] = includedStacks.map((s) => {
      const row = stackRows.find((r) => r.id === s.stackId);
      return {
        name: stackNameById.get(s.stackId) ?? s.name,
        type: stackTypeById.get(s.stackId) ?? null,
        includedInPortfolio: true,
        sortOrder: row?.sortOrder
      };
    });

    const portfolio: ResumePdfPortfolio = {
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

    // Write new objects first. Delete the previous kit only after PUT + DB commit.
    const previousCoverKey = app.coverLetterR2Key;
    const coverUuid = crypto.randomUUID();
    const coverFilename = formatTailoredCoverFilename({
      candidateName: profile.name,
      companyName: app.companyName,
      roleTitle: app.title
    });
    const coverR2Key = `${input.userId}/cover-letters/${app.id}-${coverUuid}.pdf`;

    let resumeBytes: Uint8Array;
    let coverBytes: Uint8Array;
    try {
      resumeBytes = await renderResumePdfBytes({
        portfolio,
        profile,
        summary: userRow.summary ?? "",
        professionalSummary: draft.professionalSummary,
        headline: draft.headline?.trim() ? draft.headline : undefined
      });
      coverBytes = await renderCoverLetterPdfBytes({
        candidateName: profile.name,
        body: draft.coverLetterBody,
        companyName: app.companyName,
        roleTitle: app.title,
        contacts: portfolio.contacts,
        email: profile.email
      });
    } catch (error) {
      return pdfFailure(error);
    }

    const proposedEmail = draft.proposedRecruiterEmail?.trim() ?? null;
    const emailOk = proposedEmail ? emailSchema.safeParse(proposedEmail).success : false;
    const recruiterEmail = emailOk ? proposedEmail : (app.recruiterEmail ?? null);

    const previousResume =
      app.resumeId != null
        ? await resumeRepository.findByIdForUser(app.resumeId, input.userId)
        : null;

    let createdResumeId: string | null = null;
    let updated: ApplicationEntity | null = null;

    const replace = await runFailClosedApplyKitReplace({
      putNew: async () => {
        await mediaBucket.put(resumeR2Key, resumeBytes.slice().buffer as ArrayBuffer, {
          httpMetadata: { contentType: "application/pdf" }
        });
        try {
          await mediaBucket.put(coverR2Key, coverBytes.slice().buffer as ArrayBuffer, {
            httpMetadata: { contentType: "application/pdf" }
          });
        } catch (error) {
          try {
            await mediaBucket.delete(resumeR2Key);
          } catch {
            // best-effort orphan resume object
          }
          throw error;
        }
      },
      commitDb: async () => {
        const createdResume = await resumeRepository.create({
          userId: input.userId,
          prompt: applyPackageResumePrompt(app.id),
          author: "agent",
          filename: resumeFilename,
          r2Key: resumeR2Key
        });
        createdResumeId = createdResume.id;
        const row = await applicationRepository.update(app.id, input.userId, {
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
        if (!row) throw new Error("application update failed after new kit put");
        updated = row;
      },
      deleteNewBestEffort: async () => {
        if (createdResumeId) {
          try {
            await resumeRepository.deleteMany([createdResumeId], input.userId);
          } catch {
            // best-effort
          }
        }
        try {
          await mediaBucket.delete(resumeR2Key);
        } catch {
          // best-effort
        }
        try {
          await mediaBucket.delete(coverR2Key);
        } catch {
          // best-effort
        }
      },
      deleteOldBestEffort: async () => {
        if (previousCoverKey && previousCoverKey !== coverR2Key) {
          try {
            await mediaBucket.delete(previousCoverKey);
          } catch {
            // best-effort
          }
        }
        if (
          previousResume &&
          isApplyPackageResumePrompt(previousResume.prompt, app.id) &&
          previousResume.id !== createdResumeId
        ) {
          try {
            await resumeRepository.deleteMany([previousResume.id], input.userId);
          } catch {
            // best-effort
          }
          if (previousResume.r2Key && previousResume.r2Key !== resumeR2Key) {
            try {
              await mediaBucket.delete(previousResume.r2Key);
            } catch {
              // best-effort
            }
          }
        }
      }
    });

    if (!replace.ok) {
      const failLog = createAgentLogger({ operation: "agent__apply_kit_replace_failed" });
      failLog.error(replace.error instanceof Error ? replace.error : String(replace.error), {
        event: "apply_kit_replace_failed",
        applicationId: app.id,
        stage: replace.stage
      });
      failLog.emit({ _forceKeep: true });
      if (replace.stage === "commit") {
        return {
          ok: false,
          code: "COMMIT_FAILED" as const,
          message: "Failed to save the new apply kit. The previous kit is unchanged."
        };
      }
      return {
        ok: false,
        code: "PDF_RENDER_FAILED" as const,
        message: "Failed to store apply package PDFs"
      };
    }

    const deletedResumeId =
      previousResume && isApplyPackageResumePrompt(previousResume.prompt, app.id)
        ? previousResume.id
        : null;
    const replacedLog = createAgentLogger({ operation: "agent__apply_kit_replaced" });
    replacedLog.set({
      event: "apply_kit_replaced",
      applicationId: app.id,
      deletedResumeId,
      reviewApplyKit
    });
    replacedLog.emit();

    if (!updated) return { ok: false, code: "NOT_FOUND" as const };
    return { ok: true as const, application: updated };
  });
}
