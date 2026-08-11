import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

import { githubRevalidationSignalKeys } from "@tsu-stack/github/cache/github-revalidation";
import { Container } from "@tsu-stack/ui/components/container";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@tsu-stack/ui/components/empty";

import { parseRepoRouteSplat } from "@/shared/lib/parse-repo-route-splat";
import { getGitHubCacheStatus, getGitHubDataSource } from "@/shared/lib/query-persistence";
import {
  buildRepoTabUrl,
  repoBranchNavLocation,
  repoExplorerTabTitle
} from "@/shared/lib/repo-paths";
import { useGitHubSignalStream } from "@/shared/lib/use-github-signal-stream";

// oxlint-disable-next-line fsd/no-public-api-sidestep
import { useGetGithubSetupQuery } from "@/features/github/api/get-github-setup-status.query";

import { SidePanelPortal, useRegisterGithubPublicTab } from "@/widgets/layout";

import {
  getGithubRepoBranchesQueryOptions,
  useGetGithubRepoBranchesQuery
} from "@/pages/github-repo/api/get-github-repo-branches.query";
import {
  getGithubRepoOverviewQueryOptions,
  useGetGithubRepoOverviewQuery
} from "@/pages/github-repo/api/get-github-repo-overview.query";
import { getGithubRepoRefCommitQueryOptions } from "@/pages/github-repo/api/get-github-repo-ref-commit.query";
import {
  getGithubRepoTreeQueryOptions,
  useGetGithubRepoTreeQuery
} from "@/pages/github-repo/api/get-github-repo-tree.query";
import { BranchComparisonBanner } from "@/pages/github-repo/ui/branch-comparison-banner";
import { CodeExplorerToolbar } from "@/pages/github-repo/ui/code-explorer-toolbar";
import { FileTree } from "@/pages/github-repo/ui/file-tree";
import { LatestCommitBar } from "@/pages/github-repo/ui/latest-commit-bar";
import { RepoActivityCards } from "@/pages/github-repo/ui/repo-activity-cards";
import { RepoExplorerLayout } from "@/pages/github-repo/ui/repo-explorer-layout";
import { RepoHeader } from "@/pages/github-repo/ui/repo-header";
import { RepoMarkdownFiles } from "@/pages/github-repo/ui/repo-markdown-files";
import { RepoOverviewSkeleton } from "@/pages/github-repo/ui/repo-overview-skeleton";
import { RepoSidebar } from "@/pages/github-repo/ui/repo-sidebar";

type GithubRepoPageProps = {
  repo: string;
  /** Portfolio profile that owns this GitHub data (API scope). */
  username: string;
  /**
   * Path segment for in-app links.
   * string → /{username}/repos; null → /repos (custom domain).
   */
  pathUsername?: string | null;
  routeSplat?: string;
  view?: "blob" | "repo" | "tree";
};

export function GithubRepoPage({
  repo,
  username,
  pathUsername = username,
  routeSplat,
  view = "repo"
}: GithubRepoPageProps) {
  const navigate = useNavigate();
  const githubSetup = useGetGithubSetupQuery(username);
  const owner = githubSetup.data?.owner ?? "";
  const overviewQuery = useGetGithubRepoOverviewQuery(repo, username);
  const branchesQuery = useGetGithubRepoBranchesQuery(repo, username);

  useEffect(() => {
    const source = getGitHubDataSource(overviewQuery.data);
    const status = getGitHubCacheStatus(overviewQuery.data);
    if (source && status) {
      console.debug(`[github-repo] overview ${repo}: source=${source} status=${status}`);
    }
  }, [overviewQuery.data, repo]);

  useEffect(() => {
    const source = getGitHubDataSource(branchesQuery.data);
    const status = getGitHubCacheStatus(branchesQuery.data);
    if (source && status) {
      console.debug(`[github-repo] branches ${repo}: source=${source} status=${status}`);
    }
  }, [branchesQuery.data, repo]);

  const routeTarget = useMemo(
    () =>
      parseRepoRouteSplat({
        branchNames: branchesQuery.data?.map((branch) => branch.name) ?? [],
        defaultBranch: overviewQuery.data?.defaultBranch ?? "main",
        splat: routeSplat
      }),
    [branchesQuery.data, overviewQuery.data?.defaultBranch, routeSplat]
  );

  const branchName = routeTarget.ref;
  const routePath = routeTarget.path;
  const directoryPath = routePath;
  const isExplorerView = view === "blob" || (view === "tree" && Boolean(routePath));

  // Always call hooks (no conditional returns above). Explorer views skip the
  // overview tree query via `enabled`.
  const treeQuery = useGetGithubRepoTreeQuery(repo, branchName, directoryPath, username, {
    enabled: !isExplorerView
  });

  const signalTargets = useMemo(() => {
    if (isExplorerView) return [];
    const repoSignalKeys = [
      githubRevalidationSignalKeys.repoMeta({ owner, repo }),
      githubRevalidationSignalKeys.repoCode({ owner, repo })
    ] as const;

    return [
      {
        queryKey: getGithubRepoOverviewQueryOptions(repo, false, username).queryKey,
        signalKeys: repoSignalKeys
      },
      {
        queryKey: getGithubRepoBranchesQueryOptions(repo, false, username).queryKey,
        signalKeys: [githubRevalidationSignalKeys.repoCode({ owner, repo })]
      },
      {
        queryKey: getGithubRepoTreeQueryOptions(repo, branchName, directoryPath, false, username)
          .queryKey,
        signalKeys: [githubRevalidationSignalKeys.repoCode({ owner, repo })]
      },
      {
        queryKey: getGithubRepoRefCommitQueryOptions(repo, branchName, false, username).queryKey,
        signalKeys: [githubRevalidationSignalKeys.repoCode({ owner, repo })]
      }
    ];
  }, [branchName, directoryPath, isExplorerView, repo, owner, username]);
  useGitHubSignalStream(signalTargets);

  // Register immediately — do not wait for overviewQuery. Bare repo slug is
  // enough for a tab; avatar/title enrich when overview lands.
  const tabUrl = buildRepoTabUrl({
    username: pathUsername,
    repo,
    view: view === "blob" ? "blob" : view === "tree" ? "tree" : "repo",
    ref: branchName,
    path: routePath
  });
  const tabTitle = repoExplorerTabTitle(
    overviewQuery.data?.name ?? repo,
    view === "repo" ? "" : routePath
  );

  useRegisterGithubPublicTab({
    avatarUrl: overviewQuery.data?.ownerAvatarUrl ?? undefined,
    repo,
    tabId: `repo:${repo}`,
    title: tabTitle,
    type: "repo",
    url: tabUrl
  });

  if (view === "blob") {
    return (
      <RepoExplorerLayout
        currentPath={routePath}
        currentRef={branchName}
        pathUsername={pathUsername}
        username={username}
        repo={repo}
        viewMode="blob"
      />
    );
  }

  if (view === "tree" && routePath) {
    return (
      <RepoExplorerLayout
        currentPath={routePath}
        currentRef={branchName}
        pathUsername={pathUsername}
        username={username}
        repo={repo}
        viewMode="tree"
      />
    );
  }

  if (overviewQuery.isLoading && !overviewQuery.data) {
    return <RepoOverviewSkeleton />;
  }

  if (overviewQuery.isError && !overviewQuery.data) {
    return (
      <Container className="py-16">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Could not load repository</EmptyTitle>
            <EmptyDescription>
              Something went wrong while loading this repository. Check your connection and try
              again.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Container>
    );
  }

  if (!overviewQuery.data) {
    return (
      <Container className="py-16">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Repository not available</EmptyTitle>
            <EmptyDescription>
              This repository could not be loaded from the configured public GitHub source.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Container>
    );
  }

  const overview = overviewQuery.data;
  const isDefaultBranch = branchName === overview.defaultBranch;

  // Overview surface only (blob/tree return earlier with RepoExplorerLayout).
  const handleBranchChange = (nextBranch: string) => {
    const loc = repoBranchNavLocation(pathUsername ?? null, repo, nextBranch, {
      path: routePath,
      view: "tree",
      defaultBranch: overview.defaultBranch
    });
    void navigate({ to: loc.to, params: loc.params } as never);
  };

  return (
    <>
      <div className="mx-auto grid gap-10 px-3 py-10 md:px-5 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
        <div className="flex min-w-0 flex-col gap-6">
          <RepoHeader repo={overview} />

          <CodeExplorerToolbar
            currentRef={routeTarget.ref}
            onBranchChange={handleBranchChange}
            username={username}
            repo={overview}
          />

          {!isDefaultBranch && (
            <BranchComparisonBanner
              username={username}
              currentBranch={branchName}
              defaultBranch={overview.defaultBranch ?? "main"}
              repo={repo}
            />
          )}

          <div>
            <LatestCommitBar
              branchRef={branchName}
              defaultBranch={overview.defaultBranch ?? "main"}
              defaultBranchTip={overview.latestCommit}
              username={username}
              repoName={repo}
            />
            {treeQuery.data ? (
              <FileTree
                directoryPath={directoryPath}
                entries={treeQuery.data}
                username={username}
                refName={branchName}
                repo={repo}
              />
            ) : (
              <FileTreeSkeleton />
            )}
          </div>

          <RepoMarkdownFiles currentRef={branchName} entries={treeQuery.data ?? []} repo={repo} />
        </div>

        <RepoSidebar repo={overview} />
      </div>
      <SidePanelPortal>
        <RepoActivityCards owner={owner} username={username} repo={repo} repoData={overview} />
      </SidePanelPortal>
    </>
  );
}

const skeletonRows = ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7"];

function FileTreeSkeleton() {
  return (
    <div className="overflow-hidden rounded-b-2xl border border-border">
      {skeletonRows.map((key) => (
        <div
          key={key}
          className="flex items-center gap-4 border-b border-border px-4 py-2.5 last:border-b-0"
        >
          <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-4 flex-1 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-12 shrink-0 animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}
