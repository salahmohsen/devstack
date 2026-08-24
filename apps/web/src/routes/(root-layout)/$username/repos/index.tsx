import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { parseUsername } from "@tsu-stack/core/profile";

import { isCustomDomainHost } from "@/shared/lib/primary-app-url";
import { generatePublicPortfolioSeo, portfolioSeoFields } from "@/shared/lib/public-portfolio-seo";
import { getRequestHostname } from "@/shared/lib/request-host";

import { getGithubSetupStatusQueryOptions } from "@/features/github";
import { getPortfolioListQueryOptions } from "@/features/portfolio";

import {
  buildReposHubPrefetchInput,
  getFilterCookie,
  githubReposHubQueryOptions,
  RepositoriesPage
} from "@/pages/github-repos";

export const Route = createFileRoute("/(root-layout)/$username/repos/")({
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
  beforeLoad: ({ params, location }) => {
    if (!parseUsername(params.username).success) {
      throw notFound();
    }
    // Custom domain Host must not use path portfolios: /{profile}/repos → /repos
    const host = getRequestHostname();
    if (host && isCustomDomainHost(host)) {
      throw redirect({
        to: "/repos",
        search: location.search as { page?: number },
        replace: true
      });
    }
  },
  loader: async ({ context, location, params }) => {
    const { username } = params;
    const setupPromise = context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions(username)
    );
    const filterStore = await getFilterCookie();
    const search = location.search as { page?: number };
    const urlPage = typeof search.page === "number" && search.page > 0 ? search.page : 1;
    const hubPrefetchInput = buildReposHubPrefetchInput(filterStore, urlPage);

    const setupStatus = await setupPromise;

    if (setupStatus?.isConfigured && setupStatus.owner) {
      void context.queryClient.prefetchQuery(
        githubReposHubQueryOptions(hubPrefetchInput, false, username)
      );
    }

    const portfolio = await context.queryClient
      .ensureQueryData(getPortfolioListQueryOptions(username))
      .catch(() => null);

    return { filterStore, username, ...portfolioSeoFields(portfolio) };
  },
  head: ({ loaderData, params }) =>
    generatePublicPortfolioSeo({
      username: loaderData?.username ?? params.username,
      name: loaderData?.name,
      image: loaderData?.image,
      summary: loaderData?.summary,
      canonicalPath: `/${params.username}/repos`,
      pageLabel: "Repositories",
      openGraphType: "website"
    }),
  component: UsernameReposIndexPage
});

function UsernameReposIndexPage() {
  const { filterStore, username } = Route.useLoaderData();
  return <RepositoriesPage filterStore={filterStore} username={username} surfaceMode="path" />;
}
