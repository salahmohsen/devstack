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
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";

import { githubProfileTabs, resolveGithubProfileTab } from "@/shared/lib/profile-tabs";
import { useGitHubSignalStream } from "@/shared/lib/use-github-signal-stream";

import {
  getGithubProfileReposQueryOptions,
  useGetGithubProfileReposQuery,
  useGetGithubSetupStatusQuery
} from "@/features/github";

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
import { GithubProfileUnavailableState } from "@/pages/home-page/ui/github-setup-component";
import { PinnedRepoCard } from "@/pages/home-page/ui/pinned-repo-card";
import { ProjectsSection } from "@/pages/home-page/ui/projects-section";

export function HomePage({ profileName }: { profileName: string }) {
  const hasMounted = useIsClient();
  const location = useRouterState({
    select: (state) => state.location
  });
  const setupStatusQuery = useGetGithubSetupStatusQuery();
  const owner = setupStatusQuery.data?.owner ?? "salahnmohsen";
  const currentSearch = new URLSearchParams(location.searchStr);
  const activeTab = resolveGithubProfileTab(currentSearch.get("tab"));
  const isRepositoriesTab = activeTab === githubProfileTabs.repositories;
  const profileQuery = useGetGithubProfileQuery();
  const contributionsQuery = useGetGithubContributionsQuery();
  const admin = useAuth();
  const isPrivate = !!admin.user;

  const pinnedReposQuery = useGetGithubPinnedReposQuery();
  useGetGithubProfileReposQuery(isRepositoriesTab);
  const activityQuery = useGetGithubActivityQuery(1);
  const signalTargets = useMemo(
    () =>
      [
        {
          queryKey: getGithubProfileQueryOptions(isPrivate).queryKey,
          signalKeys: [githubRevalidationSignalKeys.ownerProfile(owner)]
        },
        {
          queryKey: getGithubContributionsQueryOptions(isPrivate).queryKey,
          signalKeys: [githubRevalidationSignalKeys.ownerContributions(owner)]
        },
        {
          queryKey: getGithubPinnedReposQueryOptions(isPrivate).queryKey,
          signalKeys: [githubRevalidationSignalKeys.ownerPinnedRepos(owner)]
        },
        {
          queryKey: getGithubProfileReposQueryOptions(isPrivate).queryKey,
          signalKeys: [
            isPrivate
              ? githubRevalidationSignalKeys.PrivateOwnerRepos(owner)
              : githubRevalidationSignalKeys.PublicOwnerRepos(owner)
          ]
        }
      ] as const,
    [owner, isPrivate]
  );
  useGitHubSignalStream(signalTargets);

  if (setupStatusQuery.isLoading && !setupStatusQuery.data) {
    return <GithubProfileSkeleton />;
  }

  if (!setupStatusQuery.data?.isConfigured || !owner) {
    return <GithubProfileUnavailableState />;
  }

  if (profileQuery.isLoading && !profileQuery.data) {
    return <GithubProfileSkeleton />;
  }

  if (
    profileQuery.isError ||
    pinnedReposQuery.isError ||
    contributionsQuery.isError ||
    activityQuery.isError
  ) {
    return <GithubProfileUnavailableState />;
  }

  const profile = profileQuery.data;
  if (!profile) {
    return <GithubProfileUnavailableState />;
  }

  return (
    <>
      <div className="w-full overflow-hidden pb-16">
        <div className="relative h-48 w-screen overflow-hidden sm:h-56">
          {contributionsQuery.data && hasMounted ? (
            // The `ContributionGraph` is a `lazy()` chunk, so it suspends on
            // first render after hydration. The `<Suspense>` boundary lets the
            // chunk resolve without tripping the root `errorComponent`; the
            // fallback is the same gradient the `else` branch renders, so the
            // first paint is identical to the current behaviour.
            // `hasMounted` is still required: the graph uses `createPortal` to
            // `document.body` and would crash during SSR.
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

            {admin.user && !admin.isPending && (
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
              </div>
            </div>
          </div>

          {profile.bio ? (
            <p className="max-w-lg text-sm leading-relaxed text-primary/80">{profile.bio}</p>
          ) : null}

          <ProfileMetadata profile={profile} />

          <div className="mx-auto max-w-3xl">
            {(pinnedReposQuery.data ?? []).length > 0 ? (
              <section className="flex flex-col gap-2 pt-6">
                <h2 className="text-sm font-medium text-muted-foreground">Pinned</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(pinnedReposQuery.data ?? []).map((repo) => (
                    <PinnedRepoCard key={`${repo.owner}/${repo.name}`} repo={repo} />
                  ))}
                </div>
              </section>
            ) : null}

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

function GithubProfileSkeleton() {
  return (
    <div className="w-full overflow-hidden pb-16">
      <div className="h-48 sm:h-56" />
      <div className="relative mx-auto max-w-3xl px-6">
        <div className="-mt-16 flex items-end justify-between sm:-mt-20">
          <Skeleton className="size-28 rounded-full border-4 border-background sm:size-32" />
          <Skeleton className="mb-1 size-8 rounded-full" />
        </div>
        <ProfileSkeleton />
      </div>
    </div>
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
  // if (profile.blog) {
  //   const href = profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`;
  //   const displayUrl = profile.blog.replace(/^https?:\/\//, "").replace(/\/$/, "");
  //   items.push({ icon: ExternalLink, label: displayUrl, href });
  // }
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

function ProfileSkeleton() {
  return (
    <div className="mx-auto mt-3 flex max-w-3xl flex-col gap-3 pb-8">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="h-4 w-72" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
