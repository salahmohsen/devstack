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
  getGithubPinnedReposQueryOptions,
  getGithubProfileQueryOptions,
  getGithubSetupStatusQueryOptions,
  HomePage
} from "@/pages/home-page";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/(root-layout)/")({
  ssr: true,
  loader: async ({ context }) => {
    const host = getRequestHostname();

    // Custom domain Host → public portfolio at / (no profileName path segment).
    if (host && isCustomDomainHost(host)) {
      try {
        const resolved = await context.queryClient.ensureQueryData(
          getResolvePublicPortfolioQueryOptions({ host })
        );

        if (resolved?.mode === "custom_domain" && resolved.profileName) {
          const { profileName } = resolved;

          try {
            await context.queryClient.ensureQueryData(getPortfolioListQueryOptions(profileName));
          } catch {
            return { mode: "landing" as const };
          }

          void context.queryClient.prefetchQuery(getDefaultResumeQueryOptions(profileName));

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

          return { mode: "custom_domain" as const, profileName };
        }
      } catch {
        // Fall through to community landing if resolve fails.
      }
    }

    return { mode: "landing" as const };
  },
  head: ({ loaderData }) => {
    if (loaderData?.mode === "custom_domain" && loaderData.profileName) {
      return generateAppSeo({
        alternates: {
          canonicalPath: "/"
        },
        description: `Public portfolio for @${loaderData.profileName}`,
        title: `@${loaderData.profileName}`
      });
    }

    return generateAppSeo({
      alternates: {
        canonicalPath: "/"
      },
      description:
        "Open-source, self-hostable personal hub. Public portfolios live at /{profileName} or on a verified custom domain.",
      title: appConfig.site.shortName
    });
  },
  component: RootIndexPage
});

function RootIndexPage() {
  const data = Route.useLoaderData();

  if (data.mode === "custom_domain") {
    return <HomePage profileName={data.profileName} surfaceMode="custom_domain" />;
  }

  return <CommunityLandingPage />;
}
