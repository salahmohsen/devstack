import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { mailSmartRulesQueryKeys } from "@/features/mail-smart-rules/api/list-smart-rules.query";

export function useDeleteMailSmartRuleMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.mailSmartRules.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Rule deleted");
        await queryClient.invalidateQueries({ queryKey: mailSmartRulesQueryKeys.list() });
      },
      onError: (error) => {
        toast.error(error.message || "Could not delete rule");
      }
    })
  );
}

export type DeleteMailSmartRuleResult = Awaited<
  ReturnType<typeof orpcClient.mailSmartRules.delete>
>;
