import { createFileRoute, notFound, Outlet, redirect } from "@tanstack/react-router";

import { parseUsername } from "@tsu-stack/core";

import { isValidGithubRepoSlug } from "@/shared/lib/github-repo-slug";
import { isCustomDomainHost } from "@/shared/lib/primary-app-url";
import { getRequestHostname } from "@/shared/lib/request-host";

import { getGithubSetupStatusQueryOptions } from "@/features/github";

import {
  getGithubRepoBranchesQueryOptions,
  getGithubRepoOverviewQueryOptions
} from "@/pages/github-repo";

const RESERVED_NON_REPO_SEGMENTS = new Set([".well-known", "firebase-messaging-sw.js"]);

export const Route = createFileRoute("/(root-layout)/$username/repos/$repo")({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    if (!parseUsername(params.username).success) {
      throw notFound();
    }
    if (RESERVED_NON_REPO_SEGMENTS.has(params.repo) || !isValidGithubRepoSlug(params.repo)) {
      throw notFound();
    }

    // Custom domain: /{profile}/repos/{repo} → /repos/{repo}
    const host = getRequestHostname();
    if (host && isCustomDomainHost(host)) {
      throw redirect({
        to: "/repos/$repo",
        params: { repo: params.repo },
        replace: true
      });
    }

    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions(params.username)
    );

    if (!setupStatus.isConfigured || !setupStatus.owner) {
      throw notFound();
    }
  },

  loader: async ({ context, params }) => {
    if (!isValidGithubRepoSlug(params.repo)) {
      return;
    }

    const { username, repo } = params;
    // Public surface only. Never throw from SSR if GitHub/RPC is flaky — the page
    // renders empty/error UI instead of a full-page 500.
    await Promise.all([
      context.queryClient
        .ensureQueryData(getGithubRepoOverviewQueryOptions(repo, false, username))
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(getGithubRepoBranchesQueryOptions(repo, false, username))
        .catch(() => undefined)
    ]);
  }
});

function RouteComponent() {
  return <Outlet />;
}
