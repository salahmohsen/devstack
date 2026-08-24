import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";

import { isCustomDomainHost } from "@/shared/lib/primary-app-url";
import { generatePublicPortfolioSeo, portfolioSeoFields } from "@/shared/lib/public-portfolio-seo";
import { getRequestHostname } from "@/shared/lib/request-host";
import { sessionUsernameFromUser } from "@/shared/lib/session-username";

import { getResolvePublicPortfolioQueryOptions } from "@/features/domain";
import { getGithubSetupStatusQueryOptions } from "@/features/github";
import { getPortfolioListQueryOptions } from "@/features/portfolio";

import {
  buildReposHubPrefetchInput,
  getFilterCookie,
  githubReposHubQueryOptions,
  RepositoriesPage
} from "@/pages/github-repos";

/**
 * Custom-domain only: `https://custom.example/repos`.
 * On the primary host, redirect to `/{username}/repos` (session user or 404).
 */
export const Route = createFileRoute("/(root-layout)/repos/")({
  validateSearch: (raw: Record<string, unknown>): { page?: number } => {
    const pageRaw = raw.page;
    if (typeof pageRaw === "number" && Number.isFinite(pageRaw) && pageRaw > 0) {
      return { page: Math.floor(pageRaw) };
    }
    if (typeof pageRaw === "string" && pageRaw.length > 0) {
      const n = Number.parseInt(pageRaw, 10);
      if (Number.isFinite(n) && n > 0) return { page: n };
    }
    return {};
  },
  // SSR so portfolio name/image land in the initial document head for crawlers.
  ssr: true,
  beforeLoad: async ({ context, location }) => {
    const host = getRequestHostname();
    if (host && isCustomDomainHost(host)) {
      return; // custom domain: stay on /repos
    }

    // Primary host: force /{username}/repos
    const user = await context.queryClient.ensureQueryData(getAuthUserQueryOptions());
    const username = sessionUsernameFromUser(user);

    if (username) {
      throw redirect({
        to: "/$username/repos",
        params: { username },
        search: location.search as { page?: number }
      });
    }

    throw notFound();
  },
  loader: async ({ context, location }) => {
    const host = getRequestHostname();
    const resolvedPromise = context.queryClient.ensureQueryData(
      getResolvePublicPortfolioQueryOptions({ host: host ?? undefined })
    );
    const filterStore = await getFilterCookie();
    const search = location.search as { page?: number };
    const urlPage = typeof search.page === "number" && search.page > 0 ? search.page : 1;
    const hubPrefetchInput = buildReposHubPrefetchInput(filterStore, urlPage);

    const resolved = await resolvedPromise;

    if (!resolved?.username) {
      throw notFound();
    }

    const { username } = resolved;
    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions(username)
    );

    if (setupStatus?.isConfigured && setupStatus.owner) {
      void context.queryClient.prefetchQuery(
        githubReposHubQueryOptions(hubPrefetchInput, false, username)
      );
    }

    const portfolio = await context.queryClient
      .ensureQueryData(getPortfolioListQueryOptions(username))
      .catch(() => null);

    return {
      filterStore,
      username,
      pathUsername: null as string | null,
      ...portfolioSeoFields(portfolio)
    };
  },
  head: ({ loaderData }) =>
    generatePublicPortfolioSeo({
      username: loaderData?.username ?? "portfolio",
      name: loaderData?.name,
      image: loaderData?.image,
      summary: loaderData?.summary,
      canonicalPath: "/repos",
      pageLabel: "Repositories",
      openGraphType: "website"
    }),
  component: ReposIndexPage
});

function ReposIndexPage() {
  const { filterStore, username } = Route.useLoaderData();
  return (
    <RepositoriesPage filterStore={filterStore} username={username} surfaceMode="custom_domain" />
  );
}
