import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type FacetKey, type PortfolioIdentitySource } from "@tsu-stack/core/identity";

type WriteFacetInput = {
  key: FacetKey;
  value: unknown;
  source?: PortfolioIdentitySource;
  sourceRef?: string | null;
  reason: string;
};

export function getWriteFacetMutationOptions() {
  return orpcQueryClient.identity.writeFacet.mutationOptions();
}

export type { WriteFacetInput };
