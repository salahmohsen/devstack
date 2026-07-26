import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { ResumeImportWorkflowInputSchema } from "@tsu-stack/core";

import {
  ResumeExtractOutputSchema,
  type ResumeExtractOutput
} from "#@/mastra/workflows/resume-import-workflow/extract-output.schema";
import { prepare } from "#@/mastra/workflows/resume-import-workflow/prepare.step";

/** Full-resume extract can take longer than small categorization batches. */
export const EXTRACT_TIMEOUT_MS = 180_000;

const existingProfileSchema = ResumeImportWorkflowInputSchema.shape.existingProfile;
const existingStacksSchema = ResumeImportWorkflowInputSchema.shape.existingStacks;

function emptyExtract(warnings: string[]): ResumeExtractOutput {
  return {
    profile: {
      name: null,
      email: null,
      summary: null,
      contacts: []
    },
    experiences: [],
    projects: [],
    stacks: [],
    warnings
  };
}

export const extract = createStep({
  id: "extract",
  description: "Uses the resume-import extractor agent for structured resume parse",
  inputSchema: prepare.outputSchema,
  outputSchema: z.object({
    extract: ResumeExtractOutputSchema,
    sourceFilename: z.string().optional(),
    existingProfile: existingProfileSchema,
    existingStacks: existingStacksSchema
  }),
  execute: async ({ inputData, mastra }) => {
    const { resumeText, sourceFilename, existingProfile, existingStacks } = inputData;

    const base = {
      sourceFilename,
      existingProfile,
      existingStacks
    };

    const agent = mastra?.getAgent("resumeImportExtractor");
    if (!agent) {
      return {
        ...base,
        extract: emptyExtract(["Resume import extractor agent is not available"])
      };
    }

    const existingStackLines =
      existingStacks.length > 0
        ? existingStacks.map((s) => `- ${s.name} (id: ${s.id})`).join("\n")
        : "(none)";

    const prompt = `Extract structured portfolio data from this resume.

Existing profile snapshot (prefer resume facts; use as fallback for missing name/email):
- name: ${existingProfile.name.length > 0 ? existingProfile.name : "(empty)"}
- email: ${existingProfile.email ?? "(empty)"}
- summary: ${existingProfile.summary ?? "(empty)"}

Existing stacks already in the portfolio (prefer these exact names when the resume mentions the same tech):
${existingStackLines}

Source filename: ${sourceFilename ?? "(unknown)"}

--- RESUME TEXT ---
${resumeText}
--- END RESUME TEXT ---

Return structured data for profile, experiences, projects, and stacks/skills.
Link projects to experiences when nested under a job (experienceIndex or matching experienceClientId).
Dates ISO when possible. Prefer empty arrays over invention.`;

    try {
      const result = await Promise.race([
        agent.generate([{ role: "user", content: prompt }], {
          structuredOutput: {
            schema: ResumeExtractOutputSchema
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`LLM timeout after ${EXTRACT_TIMEOUT_MS / 1000}s`)),
            EXTRACT_TIMEOUT_MS
          )
        )
      ]);

      const object = result.object ?? emptyExtract(["Extractor returned no structured object"]);
      const parsed = ResumeExtractOutputSchema.safeParse(object);
      if (!parsed.success) {
        return {
          ...base,
          extract: emptyExtract([
            "Extractor output failed schema validation",
            ...parsed.error.issues.map((i) => i.message)
          ])
        };
      }

      return {
        ...base,
        extract: parsed.data
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown extract error";
      return {
        ...base,
        extract: emptyExtract([`Resume extract failed: ${message}`])
      };
    }
  }
});
