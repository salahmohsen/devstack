import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { getDefaultResumeQueryKey } from "@/features/portfolio";

export function useSetDefaultResumeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string }) => orpcClient.resume.setDefault(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orpcQueryClient.resume.list.queryKey() }),
        queryClient.invalidateQueries({ queryKey: getDefaultResumeQueryKey() })
      ]);
      toast.success("Default resume updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to set default resume");
    }
  });
}
