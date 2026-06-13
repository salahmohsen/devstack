import { createFileRoute } from "@tanstack/react-router";

import { log } from "@tsu-stack/logger/server";

import { generateAppSeo } from "@/shared/lib/seo";

import {
  getGithubActivityQueryOptions,
  getGithubContributionsQueryOptions,
  getGithubPinnedReposQueryOptions,
  getGithubProfileQueryOptions,
  getGithubSetupStatusQueryOptions,
  GithubProfilePage
} from "@/pages/github-profile";

import { appConfig } from "@/config/app.config";

async function ensureGithubQueryData<T>({
  load,
  event,
  owner
}: {
  load: () => Promise<T>;
  event: string;
  owner?: string;
}) {
  try {
    return await load();
  } catch (error) {
    log.error({
      error,
      event,
      ...(owner ? { owner } : {})
    });
    throw error;
  }
}

export const Route = createFileRoute("/{-$locale}/(github-layout)/")({
  ssr: true,
  beforeLoad: async ({ context }) => {
    const setupStatus = await ensureGithubQueryData({
      load: () => context.queryClient.ensureQueryData(getGithubSetupStatusQueryOptions()),
      event: "home_github_setup_status_preload_failed"
    });

    if (setupStatus.isConfigured && setupStatus.owner) {
      await Promise.all([
        ensureGithubQueryData({
          load: () =>
            context.queryClient.ensureQueryData(getGithubProfileQueryOptions(setupStatus.owner!)),
          event: "home_github_profile_preload_failed",
          owner: setupStatus.owner
        }),
        ensureGithubQueryData({
          load: () =>
            context.queryClient.ensureQueryData(
              getGithubPinnedReposQueryOptions(setupStatus.owner!)
            ),
          event: "home_github_pinned_repos_preload_failed",
          owner: setupStatus.owner
        }),
        ensureGithubQueryData({
          load: () =>
            context.queryClient.ensureQueryData(
              getGithubContributionsQueryOptions(setupStatus.owner!)
            ),
          event: "home_github_contributions_preload_failed",
          owner: setupStatus.owner
        }),
        ensureGithubQueryData({
          load: () =>
            context.queryClient.ensureQueryData(getGithubActivityQueryOptions(setupStatus.owner!)),
          event: "home_github_activity_preload_failed",
          owner: setupStatus.owner
        })
      ]);
    }
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/",
        locale: params.locale
      },
      description: appConfig.site.description
    }),
  component: RootGithubProfilePage
});

function RootGithubProfilePage() {
  return <GithubProfilePage />;
}
