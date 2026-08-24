import { createFileRoute } from "@tanstack/react-router";

import { isCustomDomainHost } from "@/shared/lib/primary-app-url";
import { getRequestHostname } from "@/shared/lib/request-host";
import { generateAppSeo } from "@/shared/lib/seo";

import { getResolvePublicPortfolioQueryOptions } from "@/features/domain";
import { getDefaultResumeQueryOptions, getPortfolioListQueryOptions } from "@/features/portfolio";

import { CommunityLandingPage } from "@/pages/community-landing";
import {
  getGithubActivityQueryOptions,
  getGithubContributionsQueryOptions,
  getGithubProfileQueryOptions,
  getGithubSetupStatusQueryOptions,
  HomePage
} from "@/pages/home-page";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/(root-layout)/")({
  ssr: true,
  loader: async ({ context }) => {
    const host = getRequestHostname();

    // Custom domain Host → public portfolio at / (no username path segment).
    if (host && isCustomDomainHost(host)) {
      try {
        const resolved = await context.queryClient.ensureQueryData(
          getResolvePublicPortfolioQueryOptions({ host })
        );

        if (resolved?.mode === "custom_domain" && resolved.username) {
          const { username } = resolved;

          try {
            await context.queryClient.ensureQueryData(getPortfolioListQueryOptions(username));
          } catch {
            return { mode: "landing" as const };
          }

          void context.queryClient.prefetchQuery(getDefaultResumeQueryOptions(username));

          const setupStatus = await context.queryClient.ensureQueryData(
            getGithubSetupStatusQueryOptions(username)
          );

          if (setupStatus?.isConfigured && setupStatus?.owner) {
            void context.queryClient.prefetchQuery(getGithubProfileQueryOptions(username));
            void Promise.all([
              context.queryClient.prefetchQuery(getGithubContributionsQueryOptions(username)),
              context.queryClient.prefetchQuery(getGithubActivityQueryOptions(username))
            ]);
          }

          return { mode: "custom_domain" as const, username };
        }
      } catch {
        // Fall through to community landing if resolve fails.
      }
    }

    return { mode: "landing" as const };
  },
  head: ({ loaderData }) => {
    if (loaderData?.mode === "custom_domain" && loaderData.username) {
      return generateAppSeo({
        alternates: {
          canonicalPath: "/"
        },
        description: `Public portfolio for @${loaderData.username}`,
        title: `@${loaderData.username}`
      });
    }

    return generateAppSeo({
      alternates: {
        canonicalPath: "/"
      },
      description:
        "Self-hostable job-apply assistant: job board adapters, New jobs, Tracked jobs, Career Inbox, hub agent with BYO AI, and a public portfolio at /{username}.",
      title: appConfig.site.shortName
    });
  },
  component: RootIndexPage
});

function RootIndexPage() {
  const data = Route.useLoaderData();

  if (data.mode === "custom_domain") {
    return <HomePage username={data.username} surfaceMode="custom_domain" />;
  }

  return <CommunityLandingPage />;
}
