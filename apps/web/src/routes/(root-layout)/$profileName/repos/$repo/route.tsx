import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { parseProfileName } from "@tsu-stack/core";

import { isValidGithubRepoSlug } from "@/shared/lib/github-repo-slug";

import { getGithubSetupStatusQueryOptions } from "@/features/github";

import {
  getGithubRepoBranchesQueryOptions,
  getGithubRepoOverviewQueryOptions
} from "@/pages/github-repo";

const RESERVED_NON_REPO_SEGMENTS = new Set([".well-known", "firebase-messaging-sw.js"]);

export const Route = createFileRoute("/(root-layout)/$profileName/repos/$repo")({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    if (!parseProfileName(params.profileName).success) {
      throw notFound();
    }
    if (RESERVED_NON_REPO_SEGMENTS.has(params.repo) || !isValidGithubRepoSlug(params.repo)) {
      throw notFound();
    }

    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions(params.profileName)
    );

    if (!setupStatus.isConfigured || !setupStatus.owner) {
      throw notFound();
    }
  },
  loader: async ({ context, params }) => {
    if (!isValidGithubRepoSlug(params.repo)) {
      return;
    }

    const { profileName, repo } = params;
    void context.queryClient.prefetchQuery(
      getGithubRepoOverviewQueryOptions(repo, false, profileName)
    );
    void context.queryClient.prefetchQuery(
      getGithubRepoBranchesQueryOptions(repo, false, profileName)
    );
  }
});

function RouteComponent() {
  return <Outlet />;
}
