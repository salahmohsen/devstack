import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function getResolveProposalMutationOptions() {
  return orpcQueryClient.identity.resolveProposal.mutationOptions();
}
