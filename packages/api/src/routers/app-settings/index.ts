import { appSettingsRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure } from "#@/lib/procedures/factory";
import {
  AppSettingsOutputSchema,
  UpdateAppSettingsInputSchema
} from "#@/routers/app-settings/types";

function toAppSettingsOutput(
  settings: Awaited<ReturnType<typeof appSettingsRepository.findByUserId>>
): {
  githubUsername: string | null;
  hasGithubToken: boolean;
  updatedAt: string | null;
} {
  return {
    githubUsername: settings?.githubUsername ?? null,
    hasGithubToken: Boolean(settings?.githubToken),
    updatedAt: settings?.updatedAt.toISOString() ?? null
  };
}

export const appSettingsRouter = {
  get: protectedProcedure
    .route({
      description: "Get the current user's app settings",
      method: "GET"
    })
    .output(AppSettingsOutputSchema)
    .handler(async ({ context }) => {
      const settings = await appSettingsRepository.findByUserId(context.session.user.id);

      return toAppSettingsOutput(settings);
    }),
  update: protectedProcedure
    .route({
      description: "Create or update the current user's app settings",
      method: "POST"
    })
    .input(UpdateAppSettingsInputSchema)
    .output(AppSettingsOutputSchema)
    .handler(async ({ context, input }) => {
      const settings = await appSettingsRepository.upsert(context.session.user.id, input);

      return toAppSettingsOutput(settings);
    })
};
