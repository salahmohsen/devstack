import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { identityRepository } from "@tsu-stack/db/repositories";

import { identityAgent, IdentityProposalsOutputSchema } from "#@/agents/identity-agent";

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
      "Propose changes that are clearly supported by the inputs. Return empty array if no changes are warranted."
    ].join("\n");

    const result = await identityAgent.generate(prompt, {
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
