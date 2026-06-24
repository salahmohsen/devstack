import { Agent } from "@mastra/core/agent";
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { identityRepository } from "@tsu-stack/db/repositories";

import { IdentityProposalsOutputSchema } from "#@/agents/identity-agent";
import { getMastraModel, IDENTITY_AGENT_INSTRUCTIONS } from "#@/lib/prompt-fragments";
import { diffFacetsShapeScorer } from "#@/scorers/diff-facets-shape.scorer";

const RepoContextSchema = z.object({
  owner: z.string(),
  name: z.string(),
  readme: z.string().nullable(),
  agentDocs: z.record(z.string(), z.string().nullable()),
  recentCommits: z.array(
    z.object({
      sha: z.string(),
      message: z.string(),
      date: z.coerce.date()
    })
  )
});

export const diffFacetsStep = createStep({
  id: "diff-facets",
  inputSchema: z.object({
    commitSha: z.string().optional(),
    reason: z.string(),
    repoContexts: z.array(RepoContextSchema)
  }),
  outputSchema: z.object({
    commitSha: z.string().optional(),
    reason: z.string(),
    currentFacets: z.record(z.string(), z.unknown()),
    proposals: IdentityProposalsOutputSchema.shape.proposals
  }),
  // Validates the LLM's structured output is well-formed. Catches the
  // recurring failure modes documented in plan #17 (bare-array response)
  // and #29 (invented facet keys). Sampling 100% — no LLM cost.
  scorers: {
    diffFacetsShape: {
      scorer: diffFacetsShapeScorer,
      sampling: { type: "ratio", rate: 1 }
    }
  },
  execute: async ({ inputData }) => {
    const currentFacets = await identityRepository.listFacets();
    const currentByKey = Object.fromEntries(currentFacets.map((f) => [f.key, f.value]));

    const prompt = [
      "Current identity facets:",
      JSON.stringify(currentByKey, null, 2),
      "",
      "Repo contexts (one per repo):",
      JSON.stringify(
        inputData.repoContexts.map((c) => {
          return {
            agentDocs: c.agentDocs,
            readme: c.readme,
            recentCommits: c.recentCommits,
            repo: `${c.owner}/${c.name}`
          };
        }),
        null,
        2
      ),
      "",
      // The schema's `key` is a Zod enum. The model has to see the exact
      // allowed set in the prompt or it invents new keys (e.g. "skills",
      // "projects") and the structured-output validator rejects the whole
      // response. See plan #28 follow-up.
      "Allowed facet keys (use exactly one of these for each proposal's `key`):",
      JSON.stringify(["headline", "bio", "focus_log", "narrative"], null, 2),
      "",
      "Required response shape (return a json object with this exact shape — do not return a bare array, do not rename fields):",
      JSON.stringify(
        {
          proposals: [
            {
              key: "<one of: headline | bio | focus_log | narrative>",
              proposedValue: "<the new value for the facet, matching the current shape>",
              confidence: 0.85,
              reason: "<a short string citing the source, e.g. 'AGENTS.md states ...'>"
            }
          ]
        },
        null,
        2
      ),
      "",
      'If the inputs do not warrant any changes, return `{ "proposals": [] }`.',
      "",
      // The Alibaba OpenAI-compatible gateway rejects `response_format: json_object`
      // when no message contains the literal word "json". See plan #17.
      "Respond with a json object matching the schema above."
    ].join("\n");

    // Use a tool-free, memory-free agent for this batch step. The
    // `identityAgent` is a chat agent with `getIdentity`,
    // `searchIdentity`, and `updateWorkingMemory` tools and a working-
    // memory input processor. For this batch step neither is needed —
    // the current facets are passed via `currentByKey`, and the
    // working-memory processor otherwise triggers an infinite
    // tool-call loop while the model is mid-structured-output
    // generation. A one-off `Agent` instance with no `tools` and no
    // `memory` keeps this a single non-tool model turn. See plan #29.
    const diffFacetsAgent = new Agent({
      id: "diff-facets",
      name: "Diff Facets",
      instructions: IDENTITY_AGENT_INSTRUCTIONS,
      model: getMastraModel()
    });
    const result = await diffFacetsAgent.generate(prompt, {
      structuredOutput: { schema: IdentityProposalsOutputSchema }
    });

    return {
      commitSha: inputData.commitSha,
      currentFacets: currentByKey,
      proposals: result.object.proposals,
      reason: inputData.reason
    };
  }
});
