import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import {
  getGithubActivityQueryOptions,
  getGithubContributionsQueryOptions,
  getGithubPinnedReposQueryOptions,
  getGithubProfileQueryOptions,
  getGithubSetupStatusQueryOptions,
  HomePage
} from "@/pages/home-page";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/(root-layout)/")({
  ssr: true,
  beforeLoad: ({ context }) =>
    context.queryClient.ensureQueryData(getGithubSetupStatusQueryOptions()),
  loader: async ({ context }) => {
    const setupStatus = context.queryClient.getQueryData(
      getGithubSetupStatusQueryOptions().queryKey
    );

    if (setupStatus?.isConfigured && setupStatus?.owner) {
      void context.queryClient.prefetchQuery(getGithubProfileQueryOptions());

      void Promise.all([
        context.queryClient.prefetchQuery(getGithubPinnedReposQueryOptions()),
        context.queryClient.prefetchQuery(getGithubContributionsQueryOptions()),
        context.queryClient.prefetchQuery(getGithubActivityQueryOptions())
      ]);
    }
  },
  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/"
      },
      description: appConfig.site.description
    }),
  component: RootGithubProfilePage
});

function RootGithubProfilePage() {
  return <HomePage />;
}
