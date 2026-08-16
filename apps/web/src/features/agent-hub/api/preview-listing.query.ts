import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { canonicalizeJobUrl } from "@tsu-stack/core";

export function previewListingQueryOptions(url: string | null | undefined) {
  const href = canonicalizeJobUrl(url?.trim() ?? "") ?? url?.trim() ?? "";
  return {
    ...orpcQueryClient.applications.previewListing.queryOptions({
      input: { url: href || "https://invalid.local/" }
    }),
    enabled: href.startsWith("http")
  };
}

export function usePreviewListingQuery(url: string | null | undefined) {
  return useQuery(previewListingQueryOptions(url));
}
