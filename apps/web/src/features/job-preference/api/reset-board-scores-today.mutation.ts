import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import {
  getJobPreferenceQueryOptions,
  type JobPreferenceQueryResult
} from "@/features/job-preference/api/get-job-preference.query";

export function useResetBoardScoresTodayMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.jobPreference.resetBoardScoresToday.mutationOptions({
      onSuccess: async (data) => {
        const queryKey = getJobPreferenceQueryOptions().queryKey;
        queryClient.setQueryData(queryKey, (prev: JobPreferenceQueryResult | undefined) => {
          if (!prev) return prev;
          return { ...prev, boardScoresUsedToday: data.boardScoresUsedToday };
        });
        await queryClient.invalidateQueries({ queryKey });
      }
    })
  );
}

export type ResetBoardScoresTodayMutationResult = Awaited<
  ReturnType<typeof orpcClient.jobPreference.resetBoardScoresToday>
>;
