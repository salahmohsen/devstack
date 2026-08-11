import { createFileRoute, notFound, Outlet, redirect } from "@tanstack/react-router";

import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";

import { isValidGithubRepoSlug } from "@/shared/lib/github-repo-slug";
import { isCustomDomainHost } from "@/shared/lib/primary-app-url";
import { getRequestHostname } from "@/shared/lib/request-host";
import { sessionUsernameFromUser } from "@/shared/lib/session-username";

import { getResolvePublicPortfolioQueryOptions } from "@/features/domain";
import { getGithubSetupStatusQueryOptions } from "@/features/github";

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

    const host = getRequestHostname();
    if (host && isCustomDomainHost(host)) {
      return;
    }

    // Primary host: redirect bare /repos/$repo → /{username}/repos/$repo
    const user = await context.queryClient.ensureQueryData(getAuthUserQueryOptions());
    const username = sessionUsernameFromUser(user);

    if (username) {
      throw redirect({
        to: "/$username/repos/$repo",
        params: { username, repo: params.repo },
        search: location.search as Record<string, unknown>
      });
    }

    throw notFound();
  },
  loader: async ({ context, params }) => {
    const host = getRequestHostname();
    const resolved = await context.queryClient.ensureQueryData(
      getResolvePublicPortfolioQueryOptions({ host: host ?? undefined })
    );
    if (!resolved?.username) {
      throw notFound();
    }

    const { username } = resolved;
    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions(username)
    );
    if (!setupStatus.isConfigured || !setupStatus.owner) {
      throw notFound();
    }

    // Public surface only. Swallow RPC failures so custom-domain SSR does not 500.
    await Promise.all([
      context.queryClient
        .ensureQueryData(getGithubRepoOverviewQueryOptions(params.repo, false, username))
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(getGithubRepoBranchesQueryOptions(params.repo, false, username))
        .catch(() => undefined)
    ]);

    return { username, pathUsername: null as string | null };
  }
});

function RouteComponent() {
  return <Outlet />;
}
