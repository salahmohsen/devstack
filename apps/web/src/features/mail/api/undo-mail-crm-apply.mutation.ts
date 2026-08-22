import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { APPLICATION_STAGE_LABELS } from "@tsu-stack/core";

import { invalidateApplicationsListQueries } from "@/shared/lib/invalidate-applications-list";

import { mailQueryKeys } from "@/features/mail/api/list-mail.query";

export function useUndoMailCrmApplyMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.mail.undoCrmApply.mutationOptions({
      onSuccess: async (data) => {
        const stageLabel = data.restoredStage ? APPLICATION_STAGE_LABELS[data.restoredStage] : null;
        toast.success(
          stageLabel ? `Undid auto-stage · restored ${stageLabel}` : "Undid CRM auto-apply"
        );
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: mailQueryKeys.get(data.messageId) }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.mail.list.key({ type: "query" })
          }),
          invalidateApplicationsListQueries(queryClient)
        ]);
      },
      onError: (error) => {
        toast.error(error.message || "Could not undo CRM apply");
      }
    })
  );
}

export type UndoMailCrmApplyMutationResult = Awaited<
  ReturnType<typeof orpcClient.mail.undoCrmApply>
>;
