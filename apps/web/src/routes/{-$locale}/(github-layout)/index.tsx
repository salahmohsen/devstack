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

export const Route = createFileRoute("/{-$locale}/(github-layout)/")({
  ssr: true,
  beforeLoad: async ({ context }) => {
    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions()
    );

    if (setupStatus.isConfigured && setupStatus.owner) {
      try {
        await Promise.all([
          context.queryClient.ensureQueryData(getGithubProfileQueryOptions(setupStatus.owner)),
          context.queryClient.ensureQueryData(getGithubPinnedReposQueryOptions(setupStatus.owner)),
          context.queryClient.ensureQueryData(
            getGithubContributionsQueryOptions(setupStatus.owner)
          ),
          context.queryClient.ensureQueryData(getGithubActivityQueryOptions(setupStatus.owner))
        ]);
      } catch (error) {
        log.error({
          error,
          event: "home_github_profile_preload_failed",
          owner: setupStatus.owner
        });
      }
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
