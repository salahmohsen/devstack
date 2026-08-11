import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function getResolvePublicPortfolioQueryOptions(input: { host?: string; username?: string }) {
  return orpcQueryClient.domain.resolvePublic.queryOptions({
    input
  });
}

export type ResolvePublicPortfolioQueryResult = Awaited<
  ReturnType<typeof orpcClient.domain.resolvePublic>
>;
