import { ORPCError } from "@orpc/server";

import {
  DeleteInputSchema,
  DeleteResponseSchema,
  PublicUsernameInputSchema,
  ResumeListOutputSchema,
  ResumeOutputSchema,
  SetDefaultInputSchema
} from "@tsu-stack/core";
import { contactRepository, userRepository } from "@tsu-stack/db";
import {
  experienceRepository,
  projectRepository,
  resumeRepository,
  stackRepository
} from "@tsu-stack/db/repositories";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";
import { resolvePublicPortfolioContext } from "#@/lib/public-portfolio/resolve-context";
import {
  toContactOutput,
  toExperienceOutput,
  toProjectOutput,
  toStackOutput
} from "#@/routers/portfolio.mappers";
import { renderResumePdfBytes } from "#@/routers/resume-pdf";

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

function slugifyName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "")
    .slice(0, 40);
  return slug || "Resume";
}

function formatFilename(profileName: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const stamp = `${now.getTime().toString(36)}`;
  return `${slugifyName(profileName)}_Resume_${y}-${m}-${d}_${stamp}.pdf`;
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
      return resumeRepository.findAllByUserId(userId);
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
      return (await resumeRepository.findByIdForUser(input.id, userId)) ?? undefined;
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
      return (await resumeRepository.findDefaultByUserId(resolved.userId)) ?? null;
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
      return updated ?? undefined;
    }),
  generate: protectedProcedure
    .route({
      description: "Generate a new resume PDF from portfolio data",
      method: "POST"
    })
    .output(ResumeOutputSchema)
    .handler(async ({ context }) => {
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

      const filename = formatFilename(profile.name);
      const r2Key = `${userId}/resumes/${filename}`;

      const bytes = await renderResumePdfBytes({ portfolio, profile });

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

      return created;
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
