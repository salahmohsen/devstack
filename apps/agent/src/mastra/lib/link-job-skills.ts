import {
  buildJobSkillLinkPrompt,
  JOB_SKILL_LINK_MIN_DESCRIPTION_CHARS,
  LinkedJobSkillsPayloadSchema,
  sanitizeLinkedJobSkills,
  splitJobSkillTags,
  type JobSkillTag
} from "@tsu-stack/core";
import { createDb, runWithDb, stackRepository } from "@tsu-stack/db";

import { resolveRuntimeAiCredentials } from "#@/mastra/lib/resolve-runtime-ai";
import { createByoRequestContext } from "#@/mastra/runtime-llm";

const EMPTY = { requiredSkills: [] as JobSkillTag[], preferredSkills: [] as JobSkillTag[] };

/**
 * Catalog-aware skill link for Mastra tools (cannot import `@tsu-stack/api`).
 */
export async function linkJobSkillsForUserInAgent(input: {
  userId: string;
  title: string;
  companyName: string;
  description: string | null | undefined;
  listingUrl?: string | null;
  mastra?: unknown;
}): Promise<{ requiredSkills: JobSkillTag[]; preferredSkills: JobSkillTag[] }> {
  const description = input.description?.trim() ?? "";
  if (description.length < JOB_SKILL_LINK_MIN_DESCRIPTION_CHARS) return EMPTY;

  const db = createDb();
  const stacks = await runWithDb(db, async () => {
    const rows = await stackRepository.findAllByUserId(input.userId);
    return rows.map((stack) => {
      return { id: stack.id, name: stack.name, aliases: stack.aliases ?? [] };
    });
  });

  const mastra = input.mastra as
    | {
        getAgent?: (id: string) => {
          generate: (
            messages: Array<{ role: string; content: string }>,
            options: Record<string, unknown>
          ) => Promise<{ object?: unknown }>;
        };
      }
    | null
    | undefined;
  const agent = mastra?.getAgent?.("jobPageExtractor");
  const llm = await resolveRuntimeAiCredentials(input.userId, "scorer");
  if (!agent || !llm.apiKey) return EMPTY;

  try {
    const result = await agent.generate(
      [
        {
          role: "user",
          content: buildJobSkillLinkPrompt({
            title: input.title,
            companyName: input.companyName,
            listingUrl: input.listingUrl,
            description,
            stacks
          })
        }
      ],
      {
        structuredOutput: { schema: LinkedJobSkillsPayloadSchema, jsonPromptInjection: "inline" },
        toolChoice: "none",
        requestContext: createByoRequestContext(llm, { userId: input.userId }),
        maxSteps: 1
      }
    );
    return splitJobSkillTags(sanitizeLinkedJobSkills(result.object, stacks));
  } catch {
    return EMPTY;
  }
}
