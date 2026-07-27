import { createFileRoute } from "@tanstack/react-router";

import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";

import { generateAppSeo } from "@/shared/lib/seo";

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
    const search = location.search as { page?: number };
    const urlPage = typeof search.page === "number" && search.page > 0 ? search.page : 1;
    const hubPrefetchInput = buildReposHubPrefetchInput(filterStore, urlPage);

    // Multi-user: /repos is the signed-in user's private hub only — never a
    // global "site owner" public repo list.
    const sessionUser = await context.queryClient.ensureQueryData(getAuthUserQueryOptions());
    if (sessionUser) {
      void context.queryClient.prefetchQuery(githubReposHubQueryOptions(hubPrefetchInput, true));
    }

    return { filterStore };
  },
  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/repos"
      },
      title: "Repositories",
      description: "Your linked GitHub repositories (signed-in).",
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
