import { useMutation } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type TestAiProviderInput } from "@tsu-stack/core";

export function useTestAiProviderMutation() {
  return useMutation(orpcQueryClient.aiSettings.testProvider.mutationOptions());
}

export type TestAiProviderMutationResult = Awaited<
  ReturnType<typeof orpcClient.aiSettings.testProvider>
>;

export type { TestAiProviderInput };
