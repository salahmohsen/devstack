import { createFileRoute, notFound } from "@tanstack/react-router";

import { parseProfileName } from "@tsu-stack/core";

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
    // Reject reserved segments and non-profile junk (e.g. firebase-messaging-sw.js)
    // before any portfolio RPC / SSR loader work.
    if (!parseProfileName(params.profileName).success) {
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

    // Optional GitHub for **this** profile only (not a global owner).
    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions(profileName)
    );

    if (setupStatus?.isConfigured && setupStatus?.owner) {
      void context.queryClient.prefetchQuery(getGithubProfileQueryOptions(profileName));
      void Promise.all([
        context.queryClient.prefetchQuery(getGithubPinnedReposQueryOptions(profileName)),
        context.queryClient.prefetchQuery(getGithubContributionsQueryOptions(profileName)),
        context.queryClient.prefetchQuery(getGithubActivityQueryOptions(profileName))
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
