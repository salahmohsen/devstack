import { useQuery } from "@tanstack/react-query";

import { type FacetKey } from "@tsu-stack/core/identity";

import { getFacetQueryOptions } from "@/features/identity/api/get-facet.query";
import { getListFacetsQueryOptions } from "@/features/identity/api/list-facets.query";

export function useIdentityFacets() {
  return useQuery(getListFacetsQueryOptions());
}

export function useIdentityFacet(key: FacetKey) {
  return useQuery(getFacetQueryOptions(key));
}
