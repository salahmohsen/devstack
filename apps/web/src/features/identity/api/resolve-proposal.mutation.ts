import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

export function getResolveProposalMutationOptions() {
  return orpc.identity.resolveProposal.mutationOptions();
}
