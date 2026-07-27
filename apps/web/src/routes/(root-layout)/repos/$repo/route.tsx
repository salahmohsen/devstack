import { createFileRoute, notFound, Outlet, redirect } from "@tanstack/react-router";

import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";

import { isValidGithubRepoSlug } from "@/shared/lib/github-repo-slug";
import { isCustomDomainHost } from "@/shared/lib/primary-app-url";
import { getRequestHostname } from "@/shared/lib/request-host";

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

    // Primary host: redirect bare /repos/$repo → /{profileName}/repos/$repo
    const user = await context.queryClient.ensureQueryData(getAuthUserQueryOptions());
    const profileName =
      typeof (user as { profileName?: string } | null)?.profileName === "string"
        ? (user as { profileName: string }).profileName
        : null;

    if (profileName) {
      throw redirect({
        to: "/$profileName/repos/$repo",
        params: { profileName, repo: params.repo },
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
    if (!resolved?.profileName) {
      throw notFound();
    }

    const { profileName } = resolved;
    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions(profileName)
    );
    if (!setupStatus.isConfigured || !setupStatus.owner) {
      throw notFound();
    }

    void context.queryClient.prefetchQuery(
      getGithubRepoOverviewQueryOptions(params.repo, false, profileName)
    );
    void context.queryClient.prefetchQuery(
      getGithubRepoBranchesQueryOptions(params.repo, false, profileName)
    );

    return { profileName, pathProfileName: null as string | null };
  }
});

function RouteComponent() {
  return <Outlet />;
}
