import { formatGeneralResumeFilename } from "@tsu-stack/core";
import { contactRepository, userRepository } from "@tsu-stack/db";
import {
  certificationRepository,
  educationRepository,
  experienceRepository,
  projectRepository,
  resumeRepository,
  stackRepository,
  type ResumeEntity
} from "@tsu-stack/db/repositories";
import { createLogger } from "@tsu-stack/logger/server";
import {
  PdfEngineUnavailableError,
  PdfRenderFailedError,
  renderResumePdfBytes
} from "@tsu-stack/pdf";

import {
  toContactOutput,
  toExperienceOutput,
  toProjectOutput,
  toStackOutput
} from "#@/routers/portfolio.mappers";

type MediaBucket = {
  put: (
    key: string,
    body: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } }
  ) => Promise<unknown>;
  delete: (key: string) => Promise<unknown>;
};

async function fetchPortfolioData(userId: string) {
  const [experiences, projects, stacks, contacts, educations, certifications] = await Promise.all([
    experienceRepository.findOptedInByUserId(userId),
    projectRepository.findOptedInByUserId(userId),
    stackRepository.findOptedInByUserId(userId),
    contactRepository.findOptedInByUserId(userId),
    // Include-when-present (spec): no portfolio opt-in gate for education/certifications.
    educationRepository.findAllByUserId(userId),
    certificationRepository.findAllByUserId(userId)
  ]);

  return {
    experiences: experiences.map((exp) => toExperienceOutput(exp!)),
    projects: projects.map((proj) => toProjectOutput(proj!)),
    stacks: stacks.map((stackRow) => toStackOutput(stackRow!)),
    contacts: contacts.map(toContactOutput),
    educations: educations.map((edu) => {
      return {
        school: edu.school,
        degree: edu.degree,
        field: edu.field ?? null,
        location: edu.location ?? null,
        fromDate: edu.fromDate ?? null,
        toDate: edu.toDate ?? null,
        isPresent: edu.isPresent ?? false,
        description: edu.description ?? null,
        gpa: edu.gpa ?? null
      };
    }),
    certifications: certifications.map((cert) => {
      return {
        name: cert.name,
        issuer: cert.issuer,
        issuedAt: cert.issuedAt ?? null,
        expiresAt: cert.expiresAt ?? null,
        credentialUrl: cert.credentialUrl ?? null,
        description: cert.description ?? null
      };
    })
  };
}

/**
 * Build a fresh general resume from opted-in portfolio evidence, mark it default,
 * and delete the previous default row + R2 object (if any).
 */
export async function syncPortfolioDefaultResume(input: {
  userId: string;
  mediaBucket: MediaBucket;
}): Promise<ResumeEntity> {
  const { userId, mediaBucket } = input;
  const previous = await resumeRepository.findDefaultByUserId(userId);

  const userRow = await userRepository.findById(userId);
  if (!userRow) {
    throw new Error("Session user not found");
  }

  const portfolio = await fetchPortfolioData(userId);
  const profile = {
    name: userRow.name?.trim() || "Resume",
    email: userRow.email
  };
  const filename = formatGeneralResumeFilename({ candidateName: profile.name });
  const r2Key = `${userId}/resumes/${crypto.randomUUID()}.pdf`;

  const bytes = await renderResumePdfBytes({
    portfolio,
    profile,
    summary: userRow.summary ?? ""
  });

  await mediaBucket.put(r2Key, bytes.slice().buffer as ArrayBuffer, {
    httpMetadata: { contentType: "application/pdf" }
  });

  const created = await resumeRepository.create({
    userId,
    prompt: null,
    author: "admin",
    filename,
    r2Key
  });

  await resumeRepository.setDefault(created.id, userId);

  if (previous && previous.id !== created.id) {
    if (previous.r2Key) {
      try {
        await mediaBucket.delete(previous.r2Key);
      } catch {
        // Best-effort object cleanup; DB row still removed.
      }
    }
    await resumeRepository.deleteMany([previous.id], userId);
  }

  const refreshed = await resumeRepository.findByIdForUser(created.id, userId);
  return refreshed ?? created;
}

/**
 * Fire-and-forget portfolio default refresh after evidence writes.
 * Failures are logged; callers should not block the primary mutation.
 */
export function schedulePortfolioDefaultResumeSync(input: {
  userId: string;
  mediaBucket: MediaBucket;
}): void {
  void syncPortfolioDefaultResume(input).catch((error) => {
    const log = createLogger({ operation: "api__portfolio_default_resume" });
    log.set({
      event: "portfolio_default_resume_sync_failed",
      userId: input.userId,
      error: error instanceof Error ? error.message : String(error)
    });
    log.emit();
  });
}

export { PdfEngineUnavailableError, PdfRenderFailedError };
