import { type IdentityFacet, type IdentityRevision, type FacetKey } from "@tsu-stack/core/identity";
import { identityRepository } from "@tsu-stack/db/repositories";

type IdentityProposal = Awaited<ReturnType<typeof identityRepository.listProposals>>[number];

export const identityQueries = {
  listFacets: async (): Promise<IdentityFacet[]> => identityRepository.listFacets(),
  getFacet: async (key: FacetKey): Promise<IdentityFacet | null> =>
    identityRepository.getFacet(key),
  getRevisions: async (key: FacetKey, limit?: number): Promise<IdentityRevision[]> =>
    identityRepository.getRevisions(key, { limit }),
  listProposals: async (status?: "open" | "accepted" | "rejected"): Promise<IdentityProposal[]> =>
    identityRepository.listProposals({ status })
};
