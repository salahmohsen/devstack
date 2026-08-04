import { createFileRoute, notFound } from "@tanstack/react-router";

import { parseProfileName } from "@tsu-stack/core";

import { generateAppSeo } from "@/shared/lib/seo";

import { getGithubSetupStatusQueryOptions } from "@/features/github";

import {
  buildReposHubPrefetchInput,
  getFilterCookie,
  githubReposHubQueryOptions,
  RepositoriesPage
} from "@/pages/github-repos";

export const Route = createFileRoute("/(root-layout)/$profileName/repos/")({
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
  ssr: false,
  beforeLoad: ({ params }) => {
    if (!parseProfileName(params.profileName).success) {
      throw notFound();
    }
  },
  loader: async ({ context, location, params }) => {
    const { profileName } = params;
    const filterStore = await getFilterCookie();
    const search = location.search as { page?: number };
    const urlPage = typeof search.page === "number" && search.page > 0 ? search.page : 1;
    const hubPrefetchInput = buildReposHubPrefetchInput(filterStore, urlPage);

    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions(profileName)
    );

    if (setupStatus?.isConfigured && setupStatus.owner) {
      void context.queryClient.prefetchQuery(
        githubReposHubQueryOptions(hubPrefetchInput, false, profileName)
      );
    }

    return { filterStore, profileName };
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/${params.profileName}/repos`
      },
      title: `@${params.profileName} · Repositories`,
      description: `GitHub repositories for @${params.profileName}`,
      robots: {
        follow: true,
        index: true
      }
    }),
  component: () => {
    const { filterStore, profileName } = Route.useLoaderData();
    return <RepositoriesPage filterStore={filterStore} profileName={profileName} />;
  }
});
