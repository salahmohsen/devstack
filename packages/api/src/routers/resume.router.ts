import { ORPCError } from "@orpc/server";
import { buildDocumentPDFBytes } from "pdfnative";

import {
  DeleteInputSchema,
  DeleteResponseSchema,
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
import {
  toContactOutput,
  toExperienceOutput,
  toProjectOutput,
  toStackOutput
} from "#@/routers/portfolio.mappers";
import { buildResumeDocument } from "#@/routers/resume-pdf";

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

function formatFilename(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `SalahMohsen_Resume_${y}-${m}-${d}.pdf`;
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
      description: "Get the default resume",
      method: "GET"
    })
    .output(ResumeOutputSchema.optional())
    .handler(async () => {
      // TODO(Phase C): resolve userId from profileName / verified custom domain Host.
      const owner = await userRepository.findFirst();
      if (!owner) return undefined;
      return resumeRepository.findDefaultByUserId(owner.id);
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
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const portfolio = await fetchPortfolioData(userId);
      const userRow = await userRepository.findById(userId);
      if (!userRow) {
        throw new ORPCError("NOT_FOUND", { message: "Session user not found" });
      }

      const profile = {
        name: userRow.name ?? "Salah Mohsen",
        email: userRow.email
      };

      const filename = formatFilename();
      const r2Key = `resumes/${filename}`;

      const { params, layout } = buildResumeDocument({ portfolio, profile });
      const bytes = buildDocumentPDFBytes(params, layout);

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
