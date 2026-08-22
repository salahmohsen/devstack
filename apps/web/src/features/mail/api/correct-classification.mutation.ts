import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { invalidateApplicationsListQueries } from "@/shared/lib/invalidate-applications-list";

import { mailQueryKeys } from "@/features/mail/api/list-mail.query";

export function useCorrectMailClassificationMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.mail.correctClassification.mutationOptions({
      onSuccess: async (data, vars) => {
        const label = data.correction.correctedSystemLabels[0] ?? "none";
        toast.success(
          data.crmUndone ? `Corrected to ${label} · CRM auto-apply undone` : `Corrected to ${label}`
        );
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: mailQueryKeys.get(vars.messageId) }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.mail.list.key({ type: "query" })
          }),
          invalidateApplicationsListQueries(queryClient)
        ]);
      },
      onError: (error) => {
        toast.error(error.message || "Could not save correction");
      }
    })
  );
}

export type CorrectMailClassificationMutationResult = Awaited<
  ReturnType<typeof orpcClient.mail.correctClassification>
>;
