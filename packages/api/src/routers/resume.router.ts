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

async function fetchPortfolioData() {
  const experiences = await experienceRepository.findOptedIn();
  const projects = await projectRepository.findOptedIn();
  const stacks = await stackRepository.findOptedIn();
  const adminUser = await userRepository.findFirst();
  const contacts = adminUser ? await contactRepository.findOptedInByUserId(adminUser.id) : [];

  return {
    experiences: experiences.map((exp) => toExperienceOutput(exp!)),
    projects: projects.map((proj) => toProjectOutput(proj!)),
    stacks: stacks.map((stack) => toStackOutput(stack!)),
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
  list: publicProcedure
    .route({
      description: "List all generated resumes",
      method: "GET"
    })
    .output(ResumeListOutputSchema)
    .handler(async () => resumeRepository.findAll()),
  get: publicProcedure
    .route({
      description: "Get a single resume by ID",
      method: "GET"
    })
    .input(SetDefaultInputSchema)
    .output(ResumeOutputSchema.optional())
    .handler(async ({ input }) => resumeRepository.findById(input.id)),
  getDefault: publicProcedure
    .route({
      description: "Get the default resume",
      method: "GET"
    })
    .output(ResumeOutputSchema.optional())
    .handler(async () => resumeRepository.findDefault()),
  setDefault: protectedProcedure
    .route({
      description: "Set a resume as the default (unsets any previous default)",
      method: "POST"
    })
    .input(SetDefaultInputSchema)
    .output(ResumeOutputSchema.optional())
    .handler(async ({ input }) => resumeRepository.setDefault(input.id)),
  generate: protectedProcedure
    .route({
      description: "Generate a new resume PDF from portfolio data",
      method: "POST"
    })
    .handler(async ({ context }) => {
      const portfolio = await fetchPortfolioData();
      const userRow = await userRepository.findById(context.session.user.id);
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
      const allResumes = await resumeRepository.findAll();
      const toDelete = allResumes.filter((r) => input.ids.includes(r.id));
      const r2Keys = toDelete.map((r) => r.r2Key).filter(Boolean);

      await Promise.all(r2Keys.map((key) => context.mediaBucket.delete(key)));

      const deleted = await resumeRepository.deleteMany(input.ids);
      return { success: deleted.length > 0 };
    })
};
