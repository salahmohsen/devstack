import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export { openDailyBriefTool } from "#@/mastra/tools/open-daily-brief.tool";

import { TodayLetterWorkflowOutputSchema } from "@tsu-stack/core";

import { resolveRuntimeAiCredentials } from "#@/mastra/lib/resolve-runtime-ai";
import { runtimeLlmFromRequestContext } from "#@/mastra/runtime-llm";
import { todayLetterWorkflow } from "#@/mastra/workflows/today-letter-workflow";

/**
 * Runs today-letter-workflow (facts + letter). Supervisor must not rewrite the markdown.
 */
export const getDailyBriefTool = createTool({
  id: "get-daily-brief",
  description:
    "Run the Today letter workflow for the last 24 hours ending now and return markdown plus facts. The side panel opens from this tool — do not call openDailyBrief, do not rewrite or paste the letter. Use when they ask what you have today, what's up, what's new, or catch me up.",
  inputSchema: z.object({}).describe("No arguments. Tenant is the session user."),
  outputSchema: TodayLetterWorkflowOutputSchema,
  execute: async (_input, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    const dateLabel = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
    const empty = {
      dateLabel,
      since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      window: "rolling24h" as const,
      empty: true,
      mail: [],
      inbox: [],
      tracked: [],
      mailCount: 0,
      inboxCount: 0,
      trackedCount: 0,
      markdown: `# ${dateLabel}\n\nNothing new right now.`
    };
    if (!userId) return empty;

    const fromContext = runtimeLlmFromRequestContext((key) => context.requestContext?.get?.(key));
    const llm = fromContext?.apiKey
      ? fromContext
      : await resolveRuntimeAiCredentials(userId, "hubChat");
    const hubPersonality = context.requestContext?.get?.("hubPersonality") as string | undefined;

    const run = await todayLetterWorkflow.createRun();
    const result = await run.start({
      inputData: { userId, llm, hubPersonality },
      requestContext: context.requestContext
    });

    const fail = {
      ...empty,
      empty: false,
      markdown: `# ${dateLabel}\n\nCould not write Today. Try again.`
    };
    if (result.status !== "success") return fail;

    const parsed = TodayLetterWorkflowOutputSchema.safeParse(result.result);
    if (parsed.success && parsed.data.markdown.trim().length > 0) return parsed.data;

    const raw = result.result as { markdown?: unknown } | undefined;
    const markdown = typeof raw?.markdown === "string" ? raw.markdown.trim() : "";
    if (markdown.length > 0) {
      return {
        ...empty,
        ...raw,
        markdown,
        empty: raw && "empty" in raw ? Boolean((raw as { empty?: unknown }).empty) : empty.empty
      };
    }
    return fail;
  }
});
