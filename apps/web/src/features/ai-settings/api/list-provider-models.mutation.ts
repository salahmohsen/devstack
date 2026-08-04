import { useMutation } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ListProviderModelsInput } from "@tsu-stack/core";

export function useListProviderModelsMutation() {
  return useMutation(orpcQueryClient.aiSettings.listProviderModels.mutationOptions());
}

export type ListProviderModelsMutationResult = Awaited<
  ReturnType<typeof orpcClient.aiSettings.listProviderModels>
>;

export type { ListProviderModelsInput };
