import { useMutation } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type TestMailSettingsInput } from "@tsu-stack/core";

export function useTestMailSettingsMutation() {
  return useMutation(orpcQueryClient.mailSettings.test.mutationOptions());
}

export type TestMailSettingsMutationResult = Awaited<
  ReturnType<typeof orpcClient.mailSettings.test>
>;

export type { TestMailSettingsInput };
