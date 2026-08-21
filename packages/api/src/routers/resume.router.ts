import { ORPCError } from "@orpc/server";

import {
  DeleteInputSchema,
  DeleteResponseSchema,
  formatGeneralResumeFilename,
  PublicUsernameInputSchema,
  ResumeListOutputSchema,
  ResumeOutputSchema,
  SetDefaultInputSchema,
  type ResumeLinkedJob,
  type ResumeOutput
} from "@tsu-stack/core";
import { applicationRepository, contactRepository, userRepository } from "@tsu-stack/db";
import {
  experienceRepository,
  projectRepository,
  resumeRepository,
  stackRepository,
  type ResumeEntity
} from "@tsu-stack/db/repositories";
import {
  PdfEngineUnavailableError,
  PdfRenderFailedError,
  renderResumePdfBytes
} from "@tsu-stack/pdf";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";
import { resolvePublicPortfolioContext } from "#@/lib/public-portfolio/resolve-context";
import {
  toContactOutput,
  toExperienceOutput,
  toProjectOutput,
  toStackOutput
} from "#@/routers/portfolio.mappers";

async function fetchPortfolioData(userId: string) {
  const experiences = await experienceRepository.findOptedInByUserId(userId);
  const projects = await projectRepository.findOptedInByUserId(userId);
  const stacks = await stackRepository.findOptedInByUserId(userId);
  const contacts = await contactRepository.findOptedInByUserId(userId);

  return {
    experiences: experiences.map((exp) => toExperienceOutput(exp!)),
    projects: projects.map((proj) => toProjectOutput(proj!)),
    stacks: stacks.map((stackRow) => toStackOutput(stackRow!)),
    contacts: contacts.map(toContactOutput)
  };
}

function toResumeOutput(row: ResumeEntity, jobs: ResumeLinkedJob[]): ResumeOutput {
  return {
    id: row.id,
    prompt: row.prompt,
    author: row.author,
    filename: row.filename,
    r2Key: row.r2Key,
    default: row.default,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    jobs
  };
}

function jobFromApp(app: {
  id: string;
  companyName: string;
  title: string;
  companyLogoUrl: string | null;
}): ResumeLinkedJob {
  return {
    id: app.id,
    companyName: app.companyName,
    title: app.title,
    companyLogoUrl: app.companyLogoUrl
  };
}

function applyPackageAppId(prompt: string | null): string | null {
  const match = prompt?.match(/^apply-package:(.+)$/);
  const id = match?.[1]?.trim();
  return id && id.length > 0 ? id : null;
}

async function withLinkedJobs(userId: string, rows: ResumeEntity[]): Promise<ResumeOutput[]> {
  const links = await applicationRepository.listLinkedByResumeIds(
    userId,
    rows.map((row) => row.id)
  );
  const byResume = new Map<string, ResumeLinkedJob[]>();
  const pushJob = (resumeId: string, job: ResumeLinkedJob) => {
    const list = byResume.get(resumeId) ?? [];
    if (list.some((item) => item.id === job.id)) return;
    list.push(job);
    byResume.set(resumeId, list);
  };
  for (const link of links) {
    if (!link.resumeId) continue;
    pushJob(link.resumeId, jobFromApp(link));
  }

  const promptIds = [
    ...new Set(
      rows.map((row) => applyPackageAppId(row.prompt)).filter((id): id is string => id != null)
    )
  ];
  if (promptIds.length > 0) {
    const fromPrompt = await applicationRepository.findByIdsForUser(userId, promptIds);
    const appById = new Map(fromPrompt.map((app) => [app.id, app]));
    for (const row of rows) {
      const appId = applyPackageAppId(row.prompt);
      const app = appId ? appById.get(appId) : undefined;
      if (app) pushJob(row.id, jobFromApp(app));
    }
  }

  return rows.map((row) => toResumeOutput(row, byResume.get(row.id) ?? []));
}

export const resumeRouter = {
  list: protectedProcedure
    .route({
      description: "List all generated resumes",
      method: "GET"
    })
    .output(ResumeListOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const rows = await resumeRepository.findAllByUserId(userId);
      return withLinkedJobs(userId, rows);
    }),
  get: protectedProcedure
    .route({
      description: "Get a single resume by ID",
      method: "GET"
    })
    .input(SetDefaultInputSchema)
    .output(ResumeOutputSchema.optional())
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const row = await resumeRepository.findByIdForUser(input.id, userId);
      if (!row) return undefined;
      const [mapped] = await withLinkedJobs(userId, [row]);
      return mapped;
    }),
  getDefault: publicProcedure
    .route({
      description: "Get the default resume for a public profile",
      method: "GET"
    })
    .input(PublicUsernameInputSchema)
    .output(ResumeOutputSchema.nullable())
    .errors({
      NOT_FOUND: {
        message: "Profile not found",
        status: 404
      }
    })
    .handler(async ({ input, context, errors }) => {
      const resolved = await resolvePublicPortfolioContext({
        host: context.host,
        pathUsername: input.username
      });
      if (!resolved) {
        throw errors.NOT_FOUND();
      }
      // Query clients cannot store `undefined`. No default resume is `null`.
      const row = await resumeRepository.findDefaultByUserId(resolved.userId);
      return row ? toResumeOutput(row, []) : null;
    }),
  setDefault: protectedProcedure
    .route({
      description: "Set a resume as the default (unsets any previous default)",
      method: "POST"
    })
    .input(SetDefaultInputSchema)
    .output(ResumeOutputSchema.optional())
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const updated = await resumeRepository.setDefault(input.id, userId);
      if (!updated) return undefined;
      const [mapped] = await withLinkedJobs(userId, [updated]);
      return mapped;
    }),
  generate: protectedProcedure
    .route({
      description: "Generate a new resume PDF from portfolio data",
      method: "POST"
    })
    .output(ResumeOutputSchema)
    .errors({
      PDF_ENGINE_UNAVAILABLE: {
        message: "PDF engine is unavailable (rendercv or typst missing on PATH)"
      },
      PDF_RENDER_FAILED: {
        message: "PDF render failed"
      }
    })
    .handler(async ({ context, errors }) => {
      const userId = context.session.user.id;
      const portfolio = await fetchPortfolioData(userId);
      const userRow = await userRepository.findById(userId);
      if (!userRow) {
        throw new ORPCError("NOT_FOUND", { message: "Session user not found" });
      }

      const profile = {
        name: userRow.name?.trim() || "Resume",
        email: userRow.email
      };

      const filename = formatGeneralResumeFilename({ candidateName: profile.name });
      const r2Key = `${userId}/resumes/${crypto.randomUUID()}.pdf`;

      let bytes: Uint8Array;
      try {
        bytes = await renderResumePdfBytes({
          portfolio,
          profile,
          summary: userRow.summary ?? ""
        });
      } catch (error) {
        if (error instanceof PdfEngineUnavailableError) {
          throw errors.PDF_ENGINE_UNAVAILABLE({ message: error.message });
        }
        if (error instanceof PdfRenderFailedError) {
          throw errors.PDF_RENDER_FAILED({ message: error.message });
        }
        throw errors.PDF_RENDER_FAILED();
      }

      await context.mediaBucket.put(r2Key, bytes.slice().buffer as ArrayBuffer, {
        httpMetadata: { contentType: "application/pdf" }
      });

      const created = await resumeRepository.create({
        userId,
        prompt: null,
        author: "admin",
        filename,
        r2Key
      });

      return toResumeOutput(created, []);
    }),
  delete: protectedProcedure
    .route({
      description: "Delete a resume (DB record + R2 object)",
      method: "DELETE"
    })
    .input(DeleteInputSchema)
    .output(DeleteResponseSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const allResumes = await resumeRepository.findAllByUserId(userId);
      const toDelete = allResumes.filter((r) => input.ids.includes(r.id));
      const r2Keys = toDelete.map((r) => r.r2Key).filter(Boolean);

      await Promise.all(r2Keys.map((key) => context.mediaBucket.delete(key)));

      const deleted = await resumeRepository.deleteMany(input.ids, userId);
      return { success: deleted.length > 0 };
    })
};
