import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function getListProposalsQueryOptions(status?: "open" | "accepted" | "rejected") {
  return orpcQueryClient.identity.listProposals.queryOptions({
    input: { status },
    queryKey: ["identity", "listProposals", status ?? "all"]
  });
}
