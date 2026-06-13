import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { log } from "@tsu-stack/logger/server";

import {
  getGithubActivityQueryOptions,
  getGithubContributionsQueryOptions,
  getGithubPinnedReposQueryOptions,
  getGithubProfileQueryOptions,
  getGithubSetupStatusQueryOptions,
  GithubProfilePage
} from "@/pages/github-profile";

export const Route = createFileRoute("/{-$locale}/(github-layout)/$owner/")({
  ssr: true,
  beforeLoad: async ({ context, params }) => {
    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions()
    );

    if (!setupStatus.isConfigured || !setupStatus.owner) {
      throw notFound();
    }

    if (setupStatus.owner.toLowerCase() !== params.owner.toLowerCase()) {
      throw redirect({
        params: {
          locale: params.locale
        },
        to: "/{-$locale}"
      });
    }

    try {
      await Promise.all([
        context.queryClient.ensureQueryData(getGithubProfileQueryOptions(setupStatus.owner)),
        context.queryClient.ensureQueryData(getGithubPinnedReposQueryOptions(setupStatus.owner)),
        context.queryClient.ensureQueryData(getGithubContributionsQueryOptions(setupStatus.owner)),
        context.queryClient.ensureQueryData(getGithubActivityQueryOptions(setupStatus.owner))
      ]);
    } catch (error) {
      log.error({
        error,
        event: "owner_github_profile_preload_failed",
        owner: setupStatus.owner
      });
    }
  },
  component: GithubProfileOwnerPage
});

function GithubProfileOwnerPage() {
  const { owner } = Route.useParams();
  return <GithubProfilePage username={owner} />;
}
