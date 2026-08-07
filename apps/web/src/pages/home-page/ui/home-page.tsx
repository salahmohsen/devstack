import { useRouterState } from "@tanstack/react-router";
import { lazy, Suspense, useMemo } from "react";

const ContributionGraph = lazy(() =>
  import("@/pages/home-page/ui/contribution-graph").then((m) => {
    return { default: m.ContributionGraph };
  })
);

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubRevalidationSignalKeys } from "@tsu-stack/github/cache/github-revalidation";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";

import { useGitHubSignalStream } from "@/shared/lib/use-github-signal-stream";

import { getGithubProfileReposQueryOptions, useGetGithubSetupStatusQuery } from "@/features/github";
import { useGetPortfolioListQuery } from "@/features/portfolio";

import { useGetGithubActivityQuery } from "@/pages/home-page/api/get-github-activity.query";
import {
  getGithubContributionsQueryOptions,
  useGetGithubContributionsQuery
} from "@/pages/home-page/api/get-github-contributions.query";
import { getGithubPinnedReposQueryOptions } from "@/pages/home-page/api/get-github-pinned-repos.query";
import {
  getGithubProfileQueryOptions,
  useGetGithubProfileQuery
} from "@/pages/home-page/api/get-github-profile.query";
import { Experience } from "@/pages/home-page/ui/experience-section";
import { FlipSummary } from "@/pages/home-page/ui/flip-summary";
import { ProjectsSection } from "@/pages/home-page/ui/projects-section";

/**
 * Public portfolio home for a given profileName.
 * Portfolio evidence (projects, experience) always renders.
 * GitHub chrome is optional and only loads when **this profile** linked GitHub.
 */
export function HomePage({ profileName }: { profileName: string }) {
  const hasMounted = useIsClient();
  const location = useRouterState({
    select: (state) => state.location
  });
  const auth = useAuth();
  const sessionProfileName =
    typeof (auth.user as { profileName?: string } | null | undefined)?.profileName === "string"
      ? (auth.user as { profileName: string }).profileName
      : null;
  /** Private GitHub APIs only when viewing your own portfolio while signed in. */
  const isOwnProfile = Boolean(auth.user && sessionProfileName === profileName);
  const isPrivate = isOwnProfile;

  const setupStatusQuery = useGetGithubSetupStatusQuery(profileName);
  const githubReady = Boolean(setupStatusQuery.data?.isConfigured && setupStatusQuery.data?.owner);
  const owner = setupStatusQuery.data?.owner ?? "";

  const profileQuery = useGetGithubProfileQuery(profileName, isPrivate, githubReady);
  const contributionsQuery = useGetGithubContributionsQuery(profileName, isPrivate, githubReady);
  useGetGithubActivityQuery(profileName, 1, isPrivate, githubReady);

  const signalTargets = useMemo(
    () =>
      githubReady && owner
        ? ([
            {
              queryKey: getGithubProfileQueryOptions(profileName, isPrivate).queryKey,
              signalKeys: [githubRevalidationSignalKeys.ownerProfile(owner)]
            },
            {
              queryKey: getGithubContributionsQueryOptions(profileName, isPrivate).queryKey,
              signalKeys: [githubRevalidationSignalKeys.ownerContributions(owner)]
            },
            {
              queryKey: getGithubPinnedReposQueryOptions(profileName, isPrivate).queryKey,
              signalKeys: [githubRevalidationSignalKeys.ownerPinnedRepos(owner)]
            },
            {
              queryKey: getGithubProfileReposQueryOptions(profileName, isPrivate).queryKey,
              signalKeys: [
                isPrivate
                  ? githubRevalidationSignalKeys.PrivateOwnerRepos(owner)
                  : githubRevalidationSignalKeys.PublicOwnerRepos(owner)
              ]
            }
          ] as const)
        : [],
    [githubReady, owner, profileName, isPrivate]
  );
  useGitHubSignalStream(signalTargets);

  // Silence unused location for now (tabs were GitHub-centric; portfolio is default).
  void location;

  const profile = profileQuery.data;
  const showGithubHero = githubReady && profile && !profileQuery.isError;
  // Public blurb from Better Auth user.summary (dashboard Profile settings) — not GitHub bio.
  const portfolioQuery = useGetPortfolioListQuery(profileName);
  const publicSummary = portfolioQuery.data?.summary?.trim()
    ? portfolioQuery.data.summary.trim()
    : null;

  return (
    <>
      {/*
        Clip horizontal bleed from the contribution graph (w-screen) WITHOUT creating
        a scroll container. CSS: overflow-x:hidden makes overflow-y compute to auto,
        which becomes the sticky containing block and kills position:sticky for the
        project card stack. overflow-x:clip does not establish a scrollport, so sticky
        still resolves against the layout ScrollArea viewport.
        @see https://drafts.csswg.org/css-overflow-3/#overflow-properties
      */}
      <div className="w-full overflow-x-clip pb-16">
        <div className="relative h-48 w-screen overflow-hidden sm:h-56">
          {showGithubHero && contributionsQuery.data && hasMounted ? (
            <Suspense
              fallback={
                <>
                  <div className="h-full bg-[radial-gradient(circle_at_top,var(--background),transparent_35%),linear-gradient(180deg,var(--color-background)_0%,var(--color-background)_50%)]" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background to-transparent" />
                </>
              }
            >
              <ContributionGraph
                calendar={contributionsQuery.data}
                className="absolute inset-x-0 top-0 h-full opacity-60"
                svgProps={{ preserveAspectRatio: "xMidYMid slice" }}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background to-transparent" />
              <div className="pointer-events-none absolute top-0 left-0 h-full w-40 bg-linear-to-r from-background to-transparent" />
              <div className="pointer-events-none absolute top-0 right-0 h-full w-40 bg-linear-to-l from-background to-transparent" />
            </Suspense>
          ) : (
            <>
              <div className="h-full bg-[radial-gradient(circle_at_top,var(--background),transparent_35%),linear-gradient(180deg,var(--color-background)_0%,var(--color-background)_50%)]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background to-transparent" />
            </>
          )}
        </div>

        <div className="relative mx-auto max-w-3xl space-y-5 px-6">
          {showGithubHero ? (
            <>
              <div className="-mt-16 flex items-end gap-4 sm:-mt-10 sm:gap-5">
                <Avatar className="size-28 shrink-0 border sm:size-32">
                  <AvatarImage
                    alt={profile.login}
                    src={profile.avatarUrl}
                    fetchPriority="high"
                    width={128}
                    height={128}
                    sizes="(min-width: 640px) 128px, 112px"
                  />
                  <AvatarFallback>
                    {(profile.name ?? profile.login).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex min-w-0 flex-1 items-end justify-between gap-3 pb-1">
                  <div className="flex min-w-0 flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight capitalize">
                      {profile.name ?? profile.login}
                    </h1>
                    {publicSummary ? <FlipSummary summary={publicSummary} /> : null}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="-mt-8 space-y-2 sm:-mt-10">
              <h1 className="text-2xl font-semibold tracking-tight">@{profileName}</h1>
              <p className="text-sm text-muted-foreground">Portfolio</p>
              {publicSummary ? <FlipSummary summary={publicSummary} className="max-w-lg" /> : null}
            </div>
          )}

          <div className="mx-auto flex w-full max-w-3xl flex-col gap-16">
            <section id="projects" className="flex flex-col">
              <h2 className="mb-8 text-sm font-medium text-muted-foreground">Projects</h2>
              <ProjectsSection profileName={profileName} />
            </section>

            <section id="experience" className="flex flex-col">
              <h2 className="mb-8 text-sm font-medium text-muted-foreground">Experience</h2>
              <Experience profileName={profileName} />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
