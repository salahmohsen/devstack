import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { mailSmartRulesQueryKeys } from "@/features/mail-smart-rules/api/list-smart-rules.query";

export function useUpdateMailSmartRuleMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.mailSmartRules.update.mutationOptions({
      onSuccess: async (_data, variables) => {
        if (variables.keywords === undefined) {
          toast.success("Rule saved");
        }
        await queryClient.invalidateQueries({ queryKey: mailSmartRulesQueryKeys.list() });
      },
      onError: (error) => {
        toast.error(error.message || "Could not save rule");
      }
    })
  );
}

export type UpdateMailSmartRuleResult = Awaited<
  ReturnType<typeof orpcClient.mailSmartRules.update>
>;
