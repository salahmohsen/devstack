import { createFileRoute, notFound, Outlet, redirect } from "@tanstack/react-router";

import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";

import { isValidGithubRepoSlug } from "@/shared/lib/github-repo-slug";

import {
  getGithubRepoBranchesQueryOptions,
  getGithubRepoOverviewQueryOptions
} from "@/pages/github-repo";

const RESERVED_NON_REPO_SEGMENTS = new Set([".well-known", "firebase-messaging-sw.js"]);

export const Route = createFileRoute("/(root-layout)/repos/$repo")({
  component: RouteComponent,
  beforeLoad: async ({ context, params, location }) => {
    if (RESERVED_NON_REPO_SEGMENTS.has(params.repo) || !isValidGithubRepoSlug(params.repo)) {
      throw notFound();
    }

    // Multi-user: repo browser is the signed-in user's private hub only.
    const user = await context.queryClient.ensureQueryData(getAuthUserQueryOptions());
    if (!user) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: location.href }
      });
    }
  },
  loader: async ({ context, params }) => {
    if (!isValidGithubRepoSlug(params.repo)) {
      return;
    }

    // Always private (session GitHub OAuth) — never global public owner.
    void context.queryClient.prefetchQuery(getGithubRepoOverviewQueryOptions(params.repo, true));
    void context.queryClient.prefetchQuery(getGithubRepoBranchesQueryOptions(params.repo, true));
  }
});

function RouteComponent() {
  return <Outlet />;
}
