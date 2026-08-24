import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { parseUsername } from "@tsu-stack/core/profile";

import { isCustomDomainHost } from "@/shared/lib/primary-app-url";
import { generatePublicPortfolioSeo, portfolioSeoFields } from "@/shared/lib/public-portfolio-seo";
import { getRequestHostname } from "@/shared/lib/request-host";

import { getDefaultResumeQueryOptions, getPortfolioListQueryOptions } from "@/features/portfolio";

import {
  getGithubActivityQueryOptions,
  getGithubContributionsQueryOptions,
  getGithubProfileQueryOptions,
  getGithubSetupStatusQueryOptions,
  HomePage
} from "@/pages/home-page";

export const Route = createFileRoute("/(root-layout)/$username/")({
  ssr: true,
  beforeLoad: ({ params }) => {
    // Reject reserved segments and non-profile junk (e.g. firebase-messaging-sw.js)
    // before any portfolio RPC / SSR loader work.
    if (!parseUsername(params.username).success) {
      throw notFound();
    }
    // Custom domain Host: portfolio is at `/`, not `/{username}`.
    const host = getRequestHostname();
    if (host && isCustomDomainHost(host)) {
      throw redirect({ to: "/", replace: true });
    }
  },
  loader: async ({ context, params }) => {
    const { username } = params;

    const portfolioPromise = context.queryClient.ensureQueryData(
      getPortfolioListQueryOptions(username)
    );
    const setupPromise = context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions(username)
    );
    void context.queryClient.prefetchQuery(getDefaultResumeQueryOptions(username));

    // Portfolio is required for this page — missing profile → 404.
    let portfolio;
    try {
      portfolio = await portfolioPromise;
    } catch {
      throw notFound();
    }

    // Optional GitHub for **this** profile only (not a global owner).
    const setupStatus = await setupPromise;

    if (setupStatus?.isConfigured && setupStatus?.owner) {
      void context.queryClient.prefetchQuery(getGithubProfileQueryOptions(username));
      void Promise.all([
        context.queryClient.prefetchQuery(getGithubContributionsQueryOptions(username)),
        context.queryClient.prefetchQuery(getGithubActivityQueryOptions(username))
      ]);
    }

    return { username, ...portfolioSeoFields(portfolio) };
  },
  head: ({ loaderData, params }) =>
    generatePublicPortfolioSeo({
      username: loaderData?.username ?? params.username,
      name: loaderData?.name,
      image: loaderData?.image,
      summary: loaderData?.summary,
      canonicalPath: `/${params.username}`
    }),
  component: PublicProfilePage
});

function PublicProfilePage() {
  const { username } = Route.useParams();
  return <HomePage username={username} />;
}
