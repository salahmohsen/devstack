import { env } from "cloudflare:workers";
import { renderToBytes } from "pdfnative-react";

import {
  type ExperienceOutput,
  type ProjectOutput,
  type StackOutput
} from "@tsu-stack/core/portfolio";
import { resumeRepository } from "@tsu-stack/db/repositories";
import { type ContactSchemaSelect } from "@tsu-stack/db/types";

import { ResumeDocument } from "@/server/resume-pdf";

export type PortfolioData = {
  name: string;
  contacts: ContactSchemaSelect[];
  experiences: ExperienceOutput[];
  projects: ProjectOutput[];
  stacks: StackOutput[];
};

function formatFilename(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `SalahMohsen_Resume_${y}-${m}-${d}.pdf`;
}

export async function generateResume(portfolio: PortfolioData) {
  const filename = formatFilename();
  const r2Key = `resumes/${filename}`;

  const bytes = renderToBytes(<ResumeDocument data={portfolio} />);
  await env.MEDIA_BUCKET.put(r2Key, bytes, {
    httpMetadata: { contentType: "application/pdf" }
  });

  const created = await resumeRepository.create({
    prompt: null,
    author: "admin",
    filename,
    r2Key
  });

  return created;
}

export async function deleteResumePdf(r2Key: string) {
  try {
    await env.MEDIA_BUCKET.delete(r2Key);
  } catch {
    // R2 object may not exist if already deleted
  }
}
