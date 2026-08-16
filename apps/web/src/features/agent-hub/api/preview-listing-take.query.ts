import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { canonicalizeJobUrl } from "@tsu-stack/core";

import { type ProposeApplicationFromJdCardInput } from "@/features/agent-hub/lib/hub-tool-names";

export function previewListingTakeQueryOptions(
  input: ProposeApplicationFromJdCardInput,
  enabled: boolean
) {
  const listingUrl = canonicalizeJobUrl(input.url ?? "") ?? input.url ?? undefined;
  return {
    ...orpcQueryClient.applications.previewListingTake.queryOptions({
      input: {
        title: input.title.trim() || "Untitled role",
        companyName: input.companyName.trim() || "Unknown company",
        location: input.location ?? null,
        employmentType: input.employmentType ?? null,
        salaryRange: input.salaryRange ?? null,
        matchScore: input.matchScore ?? null,
        description: input.description ?? null,
        listingUrl
      }
    }),
    enabled,
    staleTime: 5 * 60_000
  };
}

export function usePreviewListingTakeQuery(
  input: ProposeApplicationFromJdCardInput,
  enabled: boolean
) {
  return useQuery(previewListingTakeQueryOptions(input, enabled));
}
