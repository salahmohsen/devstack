import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type UpsertJobPreferenceInput } from "@tsu-stack/core";

import { jobPreferenceQueryKeys } from "@/features/job-preference/api/get-job-preference.query";

export function useUpsertJobPreferenceMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.jobPreference.upsert.mutationOptions({
      onSuccess: async (data) => {
        queryClient.setQueryData(jobPreferenceQueryKeys.current(), data);
        await queryClient.invalidateQueries({
          queryKey: jobPreferenceQueryKeys.current()
        });
      }
    })
  );
}

export type UpsertJobPreferenceMutationResult = Awaited<
  ReturnType<typeof orpcClient.jobPreference.upsert>
>;

export type { UpsertJobPreferenceInput };
