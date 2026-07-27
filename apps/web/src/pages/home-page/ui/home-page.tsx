import { useRouterState } from "@tanstack/react-router";
import { Building, Edit, ExternalLink, MapPin } from "lucide-react";
import { lazy, Suspense, useMemo, type ComponentType } from "react";

const ContributionGraph = lazy(() =>
  import("@/pages/home-page/ui/contribution-graph").then((m) => {
    return { default: m.ContributionGraph };
  })
);

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubRevalidationSignalKeys } from "@tsu-stack/github/cache/github-revalidation";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import { Button } from "@tsu-stack/ui/components/button";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";

import { useGitHubSignalStream } from "@/shared/lib/use-github-signal-stream";

import { getGithubProfileReposQueryOptions, useGetGithubSetupStatusQuery } from "@/features/github";

import { useGetGithubActivityQuery } from "@/pages/home-page/api/get-github-activity.query";
import {
  getGithubContributionsQueryOptions,
  useGetGithubContributionsQuery
} from "@/pages/home-page/api/get-github-contributions.query";
import {
  getGithubPinnedReposQueryOptions,
  useGetGithubPinnedReposQuery
} from "@/pages/home-page/api/get-github-pinned-repos.query";
import {
  getGithubProfileQueryOptions,
  useGetGithubProfileQuery,
  type GithubProfileQueryResult
} from "@/pages/home-page/api/get-github-profile.query";
import { Experience } from "@/pages/home-page/ui/experience-section";
import { PinnedRepoCard } from "@/pages/home-page/ui/pinned-repo-card";
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
  const pinnedReposQuery = useGetGithubPinnedReposQuery(profileName, isPrivate, githubReady);
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

  return (
    <>
      <div className="w-full overflow-hidden pb-16">
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
              <div className="-mt-16 flex items-end justify-between sm:-mt-20">
                <Avatar className="size-28 border sm:size-32">
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

                {isOwnProfile && !auth.isPending && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="mb-1 size-8 rounded-full hover:bg-white/5"
                    render={
                      <a
                        href="https://github.com/settings/profile"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Edit GitHub profile"
                      />
                    }
                    aria-label="Edit GitHub profile"
                  >
                    <Edit className="size-3.5" />
                  </Button>
                )}
              </div>
              <div className="mx-auto flex max-w-3xl flex-col gap-3">
                <div className="flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <h1 className="text-2xl font-semibold tracking-tight capitalize">
                      {profile.name ?? profile.login}
                    </h1>
                    <p className="text-sm text-muted-foreground">@{profileName}</p>
                  </div>
                </div>
              </div>

              {profile.bio ? (
                <p className="max-w-lg text-sm leading-relaxed text-primary/80">{profile.bio}</p>
              ) : null}

              <ProfileMetadata profile={profile} />

              {(pinnedReposQuery.data ?? []).length > 0 ? (
                <section className="flex flex-col gap-2 pt-6">
                  <h2 className="text-sm font-medium text-muted-foreground">Pinned</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(pinnedReposQuery.data ?? []).map((repo) => (
                      <PinnedRepoCard
                        key={`${repo.owner}/${repo.name}`}
                        profileName={profileName}
                        repo={repo}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : (
            <div className="-mt-8 space-y-2 sm:-mt-10">
              <h1 className="text-2xl font-semibold tracking-tight">@{profileName}</h1>
              <p className="text-sm text-muted-foreground">Portfolio</p>
            </div>
          )}

          <div className="mx-auto max-w-3xl">
            <section id="projects" className="flex flex-col gap-2 pt-16">
              <h2 className="mb-10 text-sm font-medium text-muted-foreground">Projects</h2>
              <ProjectsSection profileName={profileName} />
            </section>

            <section id="experience" className="flex flex-col gap-2 pt-16">
              <h2 className="mb-10 text-sm font-medium text-muted-foreground">Experience</h2>
              <Experience profileName={profileName} />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function ProfileMetadata({ profile }: { profile: NonNullable<GithubProfileQueryResult> }) {
  const items: Array<{
    href?: string;
    icon: ComponentType<{ className?: string }>;
    label: string;
  }> = [];

  if (profile.company) {
    items.push({ icon: Building, label: profile.company });
  }
  if (profile.location) {
    items.push({ icon: MapPin, label: profile.location });
  }
  if (profile.twitterUsername) {
    items.push({
      icon: ExternalLink,
      label: `@${profile.twitterUsername}`,
      href: `https://x.com/${profile.twitterUsername}`
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {items.map((item) => {
        const content = (
          <span className="flex items-center gap-1.5">
            <item.icon className="size-4" />
            <span>{item.label}</span>
          </span>
        );

        if (item.href) {
          return (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="transition-colors"
            >
              {content}
            </a>
          );
        }

        return <span key={item.label}>{content}</span>;
      })}
    </div>
  );
}
