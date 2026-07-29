import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type CreateMailSmartRuleInput } from "@tsu-stack/core";

import { mailSmartRulesQueryKeys } from "@/features/mail-smart-rules/api/list-smart-rules.query";

export function useCreateMailSmartRuleMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.mailSmartRules.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Rule created");
        await queryClient.invalidateQueries({ queryKey: mailSmartRulesQueryKeys.list() });
      },
      onError: (error) => {
        toast.error(error.message || "Could not create rule");
      }
    })
  );
}

export type { CreateMailSmartRuleInput };
export type CreateMailSmartRuleResult = Awaited<
  ReturnType<typeof orpcClient.mailSmartRules.create>
>;
