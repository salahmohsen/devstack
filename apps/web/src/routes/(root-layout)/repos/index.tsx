import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { getGithubSetupStatusQueryOptions } from "@/features/github";

import {
  buildReposHubPrefetchInput,
  getFilterCookie,
  githubReposHubQueryOptions,
  RepositoriesPage
} from "@/pages/github-repos";

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
  ssr: false,
  loader: async ({ context, location }) => {
    const filterStore = await getFilterCookie();
    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions()
    );
    const search = location.search as { page?: number };
    const urlPage = typeof search.page === "number" && search.page > 0 ? search.page : 1;
    const hubPrefetchInput = buildReposHubPrefetchInput(filterStore, urlPage);

    if (setupStatus.isConfigured && setupStatus.owner) {
      await context.queryClient.prefetchQuery(githubReposHubQueryOptions(hubPrefetchInput));
    }

    return { filterStore };
  },
  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/repos"
      },
      title: "Repositories",
      description: "Browse and filter GitHub repositories.",
      robots: {
        follow: false,
        index: false
      }
    }),
  component: () => {
    const { filterStore } = Route.useLoaderData();
    return <RepositoriesPage filterStore={filterStore} />;
  }
});
