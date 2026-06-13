import { useRouterState } from "@tanstack/react-router";
import { lazy, useMemo, type ComponentType } from "react";

import {
  BuildingIcon,
  ChevronDownIcon,
  EditIcon,
  ExternalLinkIcon,
  FollowersIcon,
  MapPinIcon
} from "@tsu-stack/icons";

const ContributionGraph = lazy(() =>
  import("@/pages/github-profile/ui/contribution-graph").then((m) => {
    return { default: m.ContributionGraph };
  })
);

import { githubRevalidationSignalKeys } from "@tsu-stack/github/cache/github-revalidation";
import { getLocale } from "@tsu-stack/i18n/runtime";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import { Button } from "@tsu-stack/ui/components/button";
import { Container } from "@tsu-stack/ui/components/container";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { githubProfileTabs, resolveGithubProfileTab } from "@/shared/lib/profile-tabs";
import {
  clampRepoListPage,
  parseRepoListPage,
  repoListHasNextPage,
  sliceReposForPage
} from "@/shared/lib/repo-list-page";
import { useGitHubSignalStream } from "@/shared/lib/use-github-signal-stream";
import { useHasMounted } from "@/shared/lib/use-has-mounted";

import { useGetGithubSetupStatusQuery } from "@/features/github";

import {
  getGithubActivityQueryOptions,
  useGetGithubActivityQuery
} from "@/pages/github-profile/api/get-github-activity.query";
import {
  getGithubContributionsQueryOptions,
  useGetGithubContributionsQuery
} from "@/pages/github-profile/api/get-github-contributions.query";
import {
  getGithubPinnedReposQueryOptions,
  useGetGithubPinnedReposQuery
} from "@/pages/github-profile/api/get-github-pinned-repos.query";
import {
  getGithubProfileReposQueryOptions,
  useGetGithubProfileReposQuery
} from "@/pages/github-profile/api/get-github-profile-repos.query";
import {
  getGithubProfileQueryOptions,
  useGetGithubProfileQuery,
  type GithubProfileQueryResult
} from "@/pages/github-profile/api/get-github-profile.query";
import { PinnedRepoCard } from "@/pages/github-profile/ui/pinned-repo-card";
import { RepositoryRow } from "@/pages/github-profile/ui/repository-row";
import { UserActivityFeed } from "@/pages/github-profile/ui/user-activity-feed";

export function GithubProfilePage({ username }: { username?: string | null }) {
  const hasMounted = useHasMounted();
  const location = useRouterState({
    select: (state) => state.location
  });
  const setupStatusQuery = useGetGithubSetupStatusQuery();
  const resolvedUsername = username ?? setupStatusQuery.data?.owner ?? null;
  const currentSearch = new URLSearchParams(location.searchStr);
  const activeTab = resolveGithubProfileTab(currentSearch.get("tab"));
  const isRepositoriesTab = activeTab === githubProfileTabs.repositories;
  const profileQuery = useGetGithubProfileQuery(resolvedUsername ?? "");
  const contributionsQuery = useGetGithubContributionsQuery(resolvedUsername ?? "");
  const pinnedReposQuery = useGetGithubPinnedReposQuery(resolvedUsername ?? "");
  const reposQuery = useGetGithubProfileReposQuery(resolvedUsername ?? "", isRepositoriesTab);
  const activityQuery = useGetGithubActivityQuery(resolvedUsername ?? "", 1);
  const signalTargets = useMemo(() => {
    if (!resolvedUsername) {
      return [];
    }

    return [
      {
        queryKey: getGithubProfileQueryOptions(resolvedUsername).queryKey,
        signalKeys: [githubRevalidationSignalKeys.ownerProfile(resolvedUsername)]
      },
      {
        queryKey: getGithubContributionsQueryOptions(resolvedUsername).queryKey,
        signalKeys: [githubRevalidationSignalKeys.ownerContributions(resolvedUsername)]
      },
      {
        queryKey: getGithubPinnedReposQueryOptions(resolvedUsername).queryKey,
        signalKeys: [githubRevalidationSignalKeys.ownerPinnedRepos(resolvedUsername)]
      },
      {
        queryKey: getGithubProfileReposQueryOptions(resolvedUsername).queryKey,
        signalKeys: [githubRevalidationSignalKeys.ownerRepos(resolvedUsername)]
      },
      {
        queryKey: getGithubActivityQueryOptions(resolvedUsername).queryKey,
        signalKeys: [githubRevalidationSignalKeys.ownerActivity(resolvedUsername)]
      }
    ] as const;
  }, [resolvedUsername]);
  useGitHubSignalStream(signalTargets);

  const currentPage = parseRepoListPage(currentSearch.get("page"));
  const localePrefix = getLocale() ? `/${getLocale()}` : "";

  if (setupStatusQuery.isLoading && !setupStatusQuery.data) {
    return <GithubProfileSkeleton />;
  }

  if (!setupStatusQuery.data?.isConfigured || !resolvedUsername) {
    return <GithubProfileSetupState />;
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
    return <GithubProfileSetupState />;
  }

  const repos = reposQuery.data ?? [];
  const safePage = clampRepoListPage(currentPage, repos.length);
  const pagedRepos = sliceReposForPage(repos, safePage);
  const overviewHref = resolvedProfileHref(resolvedUsername, localePrefix);
  const repositoriesHref = buildRepositoriesHref(resolvedUsername, localePrefix, 1);

  return (
    <div className="overflow-hidden pb-16">
      <div className="relative h-48 overflow-hidden sm:h-56">
        {contributionsQuery.data && hasMounted ? (
          <>
            <ContributionGraph
              calendar={contributionsQuery.data}
              className="absolute inset-0 opacity-60"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-(--background) to-transparent" />
            <div className="pointer-events-none absolute top-0 left-0 h-full w-40 bg-linear-to-r from-(--background) to-transparent" />
            <div className="pointer-events-none absolute top-0 right-0 h-full w-40 bg-linear-to-l from-(--background) to-transparent" />
          </>
        ) : (
          <>
            <div className="h-full bg-[radial-gradient(circle_at_top,rgba(35,134,54,0.22),transparent_35%),linear-gradient(180deg,#161b22_0%,var(--color-background)_50%)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-(--background) to-transparent" />
          </>
        )}
      </div>

      <div className="relative mx-auto max-w-3xl px-6">
        <div className="-mt-16 flex items-end justify-between sm:-mt-20">
          <Avatar className="size-28 border-4 border-[#0d1117] sm:size-32">
            <AvatarImage alt={profile.login} src={profile.avatarUrl} />
            <AvatarFallback>
              {(profile.name ?? profile.login).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="mb-1 size-8 rounded-full text-base-300 hover:bg-white/5 hover:text-white"
          >
            <Link href="https://github.com/settings/profile" target="_blank" rel="noreferrer">
              <EditIcon className="size-3.5" />
            </Link>
          </Button>
        </div>

        <div className="mt-3 flex flex-col gap-3 pb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {profile.name ?? profile.login}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-base text-base-400">
                <span>@{profile.login}</span>
                <span className="text-white/20">·</span>
                <span className="text-sm">
                  Joined{" "}
                  {new Date(profile.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric"
                  })}
                </span>
              </div>
            </div>

            <div className="flex h-7 w-full items-center justify-start gap-0 rounded-lg bg-white/4 p-0.5 sm:w-auto sm:shrink-0">
              <Link
                href={overviewHref}
                className={
                  activeTab === githubProfileTabs.overview
                    ? "inline-flex h-6 items-center justify-center rounded-md bg-white/10 px-2.5 py-0 text-[11px] leading-none font-medium text-white"
                    : "inline-flex h-6 items-center justify-center rounded-md px-2.5 py-0 text-[11px] leading-none font-medium text-base-300 transition-colors hover:text-white"
                }
              >
                Overview
              </Link>
              <Link
                href={repositoriesHref}
                className={
                  activeTab === githubProfileTabs.repositories
                    ? "inline-flex h-6 items-center justify-center rounded-md bg-white/10 px-2.5 py-0 text-[11px] leading-none font-medium text-white"
                    : "inline-flex h-6 items-center justify-center rounded-md px-2.5 py-0 text-[11px] leading-none font-medium text-base-300 transition-colors hover:text-white"
                }
              >
                Repositories
              </Link>
            </div>
          </div>

          {profile.bio ? (
            <p className="max-w-lg text-sm leading-relaxed text-base-300">{profile.bio}</p>
          ) : null}

          <ProfileMetadata profile={profile} />

          <div className="flex items-center gap-4 text-sm">
            <Link
              href={`https://github.com/${profile.login}?tab=followers`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-base-400 transition-colors hover:text-white"
            >
              <FollowersIcon className="size-4" />
              <span className="font-semibold text-white">{formatCount(profile.followers)}</span>
              <span>{profile.followers === 1 ? "follower" : "followers"}</span>
            </Link>
            <span className="text-white/20">·</span>
            <a
              href={`https://github.com/${profile.login}?tab=following`}
              target="_blank"
              rel="noreferrer"
              className="text-base-400 transition-colors hover:text-white"
            >
              <span className="font-semibold text-white">{formatCount(profile.following)}</span>{" "}
              following
            </a>
          </div>

          {activeTab === githubProfileTabs.overview ? (
            <>
              {(pinnedReposQuery.data ?? []).length > 0 ? (
                <section className="flex flex-col gap-2 pt-6">
                  <h2 className="text-sm font-medium text-base-500">Pinned</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(pinnedReposQuery.data ?? []).map((repo) => (
                      <PinnedRepoCard key={`${repo.owner}/${repo.name}`} repo={repo} />
                    ))}
                  </div>
                </section>
              ) : null}

              {(activityQuery.data ?? []).length > 0 ? (
                <section className="flex flex-col pt-6">
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-white/4 px-4 py-2.5">
                    <h2 className="text-xs font-medium text-white">Recent activity</h2>
                    <span className="text-xs text-base-500 tabular-nums">
                      {(activityQuery.data ?? []).length}
                    </span>
                  </div>
                  <UserActivityFeed events={activityQuery.data ?? []} />
                </section>
              ) : null}
            </>
          ) : (
            <section className="-mx-[max(0,calc((100vw-100%)/2))] flex flex-col pt-20">
              <div className="mx-auto w-full max-w-4xl px-3 md:px-6">
                {reposQuery.isLoading ? (
                  <div className="flex justify-center py-12">
                    <Spinner className="size-6 text-base-400" />
                  </div>
                ) : repos.length === 0 ? (
                  <p className="py-8 text-center text-sm text-base-400">No repositories to show.</p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {pagedRepos.map((repo) => (
                        <div
                          key={repo.id}
                          style={{
                            contentVisibility: "auto",
                            containIntrinsicSize: "auto 72px"
                          }}
                        >
                          <RepositoryRow repo={repo} />
                        </div>
                      ))}
                    </div>
                    {repoListHasNextPage(safePage, repos.length) ? (
                      <Button
                        asChild
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mx-auto mt-6 rounded-full bg-white/8 text-white hover:bg-white/12"
                      >
                        <a
                          href={buildRepositoriesHref(resolvedUsername, localePrefix, safePage + 1)}
                        >
                          <ChevronDownIcon className="size-4" />
                          Load more
                        </a>
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function GithubProfileSetupState() {
  return (
    <Container className="py-16">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>GitHub profile is not configured</EmptyTitle>
          <EmptyDescription>
            Add the public GitHub username and token in the dashboard to render the homepage
            profile.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/dashboard/github-config">Open GitHub config</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </Container>
  );
}

function GithubProfileUnavailableState() {
  return (
    <Container className="py-16">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>GitHub profile is temporarily unavailable</EmptyTitle>
          <EmptyDescription>
            The public GitHub data for the homepage could not be loaded. Verify the configured
            GitHub username and token in the dashboard, then try again.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/dashboard/github-config">Open GitHub config</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </Container>
  );
}

function GithubProfileSkeleton() {
  return (
    <div className="overflow-hidden pb-16">
      <div className="h-48 bg-[linear-gradient(180deg,#161b22_0%,#0d1117_100%)] sm:h-56" />
      <div className="relative mx-auto max-w-3xl px-6">
        <div className="-mt-16 flex items-end justify-between sm:-mt-20">
          <Skeleton className="size-28 rounded-full border-4 border-[#0d1117] sm:size-32" />
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
    items.push({ icon: BuildingIcon, label: profile.company });
  }
  if (profile.location) {
    items.push({ icon: MapPinIcon, label: profile.location });
  }
  if (profile.blog) {
    const href = profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`;
    const displayUrl = profile.blog.replace(/^https?:\/\//, "").replace(/\/$/, "");
    items.push({ icon: ExternalLinkIcon, label: displayUrl, href });
  }
  if (profile.twitterUsername) {
    items.push({
      icon: ExternalLinkIcon,
      label: `@${profile.twitterUsername}`,
      href: `https://x.com/${profile.twitterUsername}`
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-base-400">
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
              className="transition-colors hover:text-white"
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
    <div className="mt-3 flex flex-col gap-3 pb-8">
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

function formatCount(count: number) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\\.0$/, "")}k`;
  }

  return count.toString();
}

function resolvedProfileHref(username: string | null, localePrefix: string) {
  if (!username) {
    return localePrefix || "/";
  }

  return `${localePrefix}/${username}`;
}

function buildRepositoriesHref(username: string | null, localePrefix: string, page: number) {
  const baseHref = `${resolvedProfileHref(username, localePrefix)}?tab=repositories`;
  return page > 1 ? `${baseHref}&page=${page}` : baseHref;
}
