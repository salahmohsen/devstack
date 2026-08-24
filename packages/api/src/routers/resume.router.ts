import { ORPCError } from "@orpc/server";

import {
  DeleteInputSchema,
  DeleteResponseSchema,
  ListQueryError,
  PublicUsernameInputSchema,
  ResumeListInputSchema,
  ResumeListOutputSchema,
  ResumeOutputSchema,
  SetDefaultInputSchema,
  type ResumeLinkedJob,
  type ResumeOutput
} from "@tsu-stack/core";
import { applicationRepository } from "@tsu-stack/db";
import { resumeRepository, type ResumeEntity } from "@tsu-stack/db/repositories";

import { compileListQuery } from "#@/lib/list-query/compile";
import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";
import { resolvePublicPortfolioContext } from "#@/lib/public-portfolio/resolve-context";
import {
  PdfEngineUnavailableError,
  PdfRenderFailedError,
  syncPortfolioDefaultResume
} from "#@/lib/resume/sync-portfolio-default-resume";

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
    .input(ResumeListInputSchema.optional())
    .output(ResumeListOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      let compiled;
      try {
        compiled = compileListQuery({
          resource: "resumes",
          q: input?.q,
          filter: input?.filter,
          sortBy: input?.sortBy,
          sortDir: input?.sortDir
        });
      } catch (error) {
        if (error instanceof ListQueryError) {
          throw new ORPCError("BAD_REQUEST", { message: error.message });
        }
        throw error;
      }
      const rows = await resumeRepository.findAllByUserId(userId, {
        where: compiled.where,
        sortBy: compiled.sortBy,
        sortDir: compiled.sortDir
      });
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
      try {
        const created = await syncPortfolioDefaultResume({
          userId,
          mediaBucket: context.mediaBucket
        });
        return toResumeOutput(created, []);
      } catch (error) {
        if (error instanceof PdfEngineUnavailableError) {
          throw errors.PDF_ENGINE_UNAVAILABLE({ message: error.message });
        }
        if (error instanceof PdfRenderFailedError) {
          throw errors.PDF_RENDER_FAILED({ message: error.message });
        }
        if (error instanceof Error && error.message === "Session user not found") {
          throw new ORPCError("NOT_FOUND", { message: "Session user not found" });
        }
        throw errors.PDF_RENDER_FAILED();
      }
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
