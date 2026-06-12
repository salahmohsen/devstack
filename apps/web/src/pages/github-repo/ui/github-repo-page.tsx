import { useMemo } from "react";

import { githubRevalidationSignalKeys } from "@tsu-stack/github/cache/github-revalidation";
import { getLocale } from "@tsu-stack/i18n/runtime";
import { Container } from "@tsu-stack/ui/components/container";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@tsu-stack/ui/components/empty";

import { useGitHubSignalStream } from "@/shared/lib/use-github-signal-stream";

import { SidePanelPortal, useRegisterGithubPublicTab } from "@/widgets/layout";

import {
  getGithubRepoActivityCardsQueryOptions,
  useGetGithubRepoActivityCardsQuery
} from "@/pages/github-repo/api/get-github-repo-activity-cards.query";
import {
  getGithubRepoBranchesQueryOptions,
  useGetGithubRepoBranchesQuery
} from "@/pages/github-repo/api/get-github-repo-branches.query";
import { getGithubRepoFileContentQueryOptions } from "@/pages/github-repo/api/get-github-repo-file-content.query";
import {
  getGithubRepoOverviewQueryOptions,
  useGetGithubRepoOverviewQuery
} from "@/pages/github-repo/api/get-github-repo-overview.query";
import { getGithubRepoRefCommitQueryOptions } from "@/pages/github-repo/api/get-github-repo-ref-commit.query";
import {
  getGithubRepoTreeQueryOptions,
  useGetGithubRepoTreeQuery
} from "@/pages/github-repo/api/get-github-repo-tree.query";
import { parseRepoRouteSplat } from "@/pages/github-repo/lib/parse-repo-route-splat";
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
  owner: string;
  repo: string;
  routeSplat?: string;
  view?: "blob" | "repo" | "tree";
};

export function GithubRepoPage({ owner, repo, routeSplat, view = "repo" }: GithubRepoPageProps) {
  const localePrefix = getLocale() ? `/${getLocale()}` : "";
  const overviewQuery = useGetGithubRepoOverviewQuery(owner, repo);
  const branchesQuery = useGetGithubRepoBranchesQuery(owner, repo);
  useGetGithubRepoActivityCardsQuery(owner, repo);

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

  if (view === "blob") {
    return (
      <RepoExplorerLayout
        currentPath={routePath}
        currentRef={branchName}
        owner={owner}
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
        owner={owner}
        repo={repo}
        viewMode="tree"
      />
    );
  }

  const directoryPath = routePath;

  const treeQuery = useGetGithubRepoTreeQuery(owner, repo, branchName, directoryPath);

  const signalTargets = useMemo(() => {
    const repoSignalKeys = [
      githubRevalidationSignalKeys.repoMeta({ owner, repo }),
      githubRevalidationSignalKeys.repoCode({ owner, repo })
    ] as const;

    return [
      {
        queryKey: getGithubRepoOverviewQueryOptions(owner, repo).queryKey,
        signalKeys: repoSignalKeys
      },
      {
        queryKey: getGithubRepoBranchesQueryOptions(owner, repo).queryKey,
        signalKeys: [githubRevalidationSignalKeys.repoCode({ owner, repo })]
      },
      {
        queryKey: getGithubRepoActivityCardsQueryOptions(owner, repo).queryKey,
        signalKeys: [githubRevalidationSignalKeys.repoMeta({ owner, repo })]
      },
      {
        queryKey: getGithubRepoTreeQueryOptions(owner, repo, branchName, directoryPath).queryKey,
        signalKeys: [githubRevalidationSignalKeys.repoCode({ owner, repo })]
      },
      {
        queryKey: getGithubRepoRefCommitQueryOptions(owner, repo, branchName).queryKey,
        signalKeys: [githubRevalidationSignalKeys.repoCode({ owner, repo })]
      }
    ];
  }, [branchName, directoryPath, owner, repo]);
  useGitHubSignalStream(signalTargets);

  const tabUrl =
    view === "tree"
      ? `${localePrefix}/${owner}/${repo}/tree/${branchName}${routePath ? `/${routePath}` : ""}`
      : `${localePrefix}/${owner}/${repo}`;
  const tabTitle =
    view === "repo" || !routePath ? `${owner}/${repo}` : (routePath.split("/").at(-1) ?? routePath);

  useRegisterGithubPublicTab(
    overviewQuery.data
      ? {
          avatarUrl: overviewQuery.data.ownerAvatarUrl ?? undefined,
          repo: `${owner}/${repo}`,
          tabId:
            view === "repo"
              ? undefined
              : `${view}:${owner}/${repo}:${branchName}:${routePath || "."}`,
          title: tabTitle,
          type: "repo",
          url: tabUrl
        }
      : null
  );

  if (overviewQuery.isLoading && !overviewQuery.data) {
    return <RepoOverviewSkeleton />;
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

  const handleBranchChange = (nextBranch: string) => {
    if (routePath) {
      window.location.assign(
        `${localePrefix}/${owner}/${repo}/tree/${nextBranch}${routePath ? `/${routePath}` : ""}`
      );
      return;
    }

    if (nextBranch === overview.defaultBranch) {
      window.location.assign(`${localePrefix}/${owner}/${repo}`);
      return;
    }

    window.location.assign(`${localePrefix}/${owner}/${repo}/tree/${nextBranch}`);
  };

  return (
    <>
      <div className="h-full overflow-auto">
        <div className="mx-auto grid max-w-7xl gap-10 px-3 py-10 md:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
          <div className="flex min-w-0 flex-col gap-6">
            <RepoHeader repo={overview} />

            <CodeExplorerToolbar
              currentRef={routeTarget.ref}
              onBranchChange={handleBranchChange}
              repo={overview}
            />

            {!isDefaultBranch && (
              <BranchComparisonBanner
                currentBranch={branchName}
                defaultBranch={overview.defaultBranch ?? "main"}
                owner={owner}
                repo={repo}
              />
            )}

            <div>
              <LatestCommitBar
                branchRef={branchName}
                defaultBranch={overview.defaultBranch ?? "main"}
                defaultBranchTip={overview.latestCommit}
                owner={owner}
                repoName={repo}
              />
              {treeQuery.data ? (
                <FileTree
                  directoryPath={directoryPath}
                  entries={treeQuery.data}
                  owner={owner}
                  refName={branchName}
                  repo={repo}
                />
              ) : (
                <FileTreeSkeleton />
              )}
            </div>

            <RepoMarkdownFiles
              currentRef={branchName}
              entries={treeQuery.data ?? []}
              owner={owner}
              repo={repo}
            />
          </div>

          <RepoSidebar repo={overview} />
        </div>
      </div>
      <SidePanelPortal>
        <RepoActivityCards owner={owner} repo={repo} />
      </SidePanelPortal>
    </>
  );
}

const skeletonRows = ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7"];

function FileTreeSkeleton() {
  return (
    <div className="overflow-hidden rounded-b-2xl border border-white/8">
      {skeletonRows.map((key) => (
        <div
          key={key}
          className="flex items-center gap-4 border-b border-white/8 px-4 py-2.5 last:border-b-0"
        >
          <div className="size-4 shrink-0 animate-pulse rounded bg-white/4" />
          <div className="h-4 w-32 animate-pulse rounded-md bg-white/4" />
          <div className="h-4 flex-1 animate-pulse rounded-md bg-white/4" />
          <div className="h-4 w-12 shrink-0 animate-pulse rounded-md bg-white/4" />
        </div>
      ))}
    </div>
  );
}
