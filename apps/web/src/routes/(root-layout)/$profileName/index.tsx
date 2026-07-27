import { createFileRoute, notFound } from "@tanstack/react-router";

import { isReservedProfilePath } from "@tsu-stack/core";

import { generateAppSeo } from "@/shared/lib/seo";

import { getDefaultResumeQueryOptions, getPortfolioListQueryOptions } from "@/features/portfolio";

import {
  getGithubActivityQueryOptions,
  getGithubContributionsQueryOptions,
  getGithubPinnedReposQueryOptions,
  getGithubProfileQueryOptions,
  getGithubSetupStatusQueryOptions,
  HomePage
} from "@/pages/home-page";

export const Route = createFileRoute("/(root-layout)/$profileName/")({
  ssr: true,
  beforeLoad: ({ params }) => {
    if (isReservedProfilePath(params.profileName)) {
      throw notFound();
    }
  },
  loader: async ({ context, params }) => {
    const { profileName } = params;

    // Portfolio is required for this page — missing profile → 404.
    try {
      await context.queryClient.ensureQueryData(getPortfolioListQueryOptions(profileName));
    } catch {
      throw notFound();
    }

    void context.queryClient.prefetchQuery(getDefaultResumeQueryOptions(profileName));

    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions()
    );

    if (setupStatus?.isConfigured && setupStatus?.owner) {
      void context.queryClient.prefetchQuery(getGithubProfileQueryOptions());

      void Promise.all([
        context.queryClient.prefetchQuery(getGithubPinnedReposQueryOptions()),
        context.queryClient.prefetchQuery(getGithubContributionsQueryOptions()),
        context.queryClient.prefetchQuery(getGithubActivityQueryOptions())
      ]);
    }

    return { profileName };
  },
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: `/${params.profileName}`
      },
      description: `Public portfolio for @${params.profileName}`,
      title: `@${params.profileName}`
    }),
  component: PublicProfilePage
});

function PublicProfilePage() {
  const { profileName } = Route.useParams();
  return <HomePage profileName={profileName} />;
}
