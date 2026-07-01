import {
  GITHUB_TOKEN_MASK,
  GithubConfigOutputSchema,
  UpdateGithubConfigInputSchema
} from "@tsu-stack/core/github-config";
import { githubConfigRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure } from "#@/lib/procedures/factory";

function toGithubConfigOutput(
  settings: Awaited<ReturnType<typeof githubConfigRepository.findByUserId>>
) {
  return {
    githubToken: settings?.githubToken ? GITHUB_TOKEN_MASK : null,
    githubUsername: settings?.githubUsername ?? null,
    hasGithubToken: Boolean(settings?.githubToken),
    updatedAt: settings?.updatedAt ?? null
  };
}

export const githubConfigRouter = {
  get: protectedProcedure
    .route({
      description: "Get the current user's GitHub config",
      method: "GET"
    })
    .output(GithubConfigOutputSchema)
    .handler(async ({ context }) => {
      const settings = await githubConfigRepository.findByUserId(context.session.user.id);

      return toGithubConfigOutput(settings);
    }),
  update: protectedProcedure
    .route({
      description: "Create or update the current user's GitHub config",
      method: "POST"
    })
    .input(UpdateGithubConfigInputSchema)
    .output(GithubConfigOutputSchema)
    .handler(async ({ context, input }) => {
      const settings = await githubConfigRepository.upsert(context.session.user.id, {
        ...input,
        githubToken: input.githubToken === GITHUB_TOKEN_MASK ? undefined : input.githubToken
      });

      return toGithubConfigOutput(settings);
    })
};
