import { useMemo } from "react";

import { githubRevalidationSignalKeys } from "@tsu-stack/github/cache/github-revalidation";
import { Container } from "@tsu-stack/ui/components/container";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@tsu-stack/ui/components/empty";

import { parseRepoRouteSplat } from "@/shared/lib/parse-repo-route-splat";
import { useGitHubSignalStream } from "@/shared/lib/use-github-signal-stream";

// oxlint-disable-next-line fsd/no-public-api-sidestep
import { useGetGithubSetupQuery } from "@/features/github/api/get-github-setup-status.query";

import { SidePanelPortal, useRegisterGithubPublicTab } from "@/widgets/layout";

import {
  getGithubRepoActivityCardsQueryOptions,
  useGetGithubRepoActivityCardsQuery
} from "@/pages/github-repo/api/get-github-repo-activity-cards.query";
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
  routeSplat?: string;
  view?: "blob" | "repo" | "tree";
};

export function GithubRepoPage({ repo, routeSplat, view = "repo" }: GithubRepoPageProps) {
  const githubSetup = useGetGithubSetupQuery();
  const owner = githubSetup.data?.owner ?? "salahmohsen";
  const overviewQuery = useGetGithubRepoOverviewQuery(repo);
  const branchesQuery = useGetGithubRepoBranchesQuery(repo);
  useGetGithubRepoActivityCardsQuery(repo);

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
        repo={repo}
        viewMode="tree"
      />
    );
  }

  const directoryPath = routePath;

  const treeQuery = useGetGithubRepoTreeQuery(repo, branchName, directoryPath);

  const signalTargets = useMemo(() => {
    const repoSignalKeys = [
      githubRevalidationSignalKeys.repoMeta({ owner, repo }),
      githubRevalidationSignalKeys.repoCode({ owner, repo })
    ] as const;

    return [
      {
        queryKey: getGithubRepoOverviewQueryOptions(repo).queryKey,
        signalKeys: repoSignalKeys
      },
      {
        queryKey: getGithubRepoBranchesQueryOptions(repo).queryKey,
        signalKeys: [githubRevalidationSignalKeys.repoCode({ owner, repo })]
      },
      {
        queryKey: getGithubRepoActivityCardsQueryOptions(repo).queryKey,
        signalKeys: [githubRevalidationSignalKeys.repoMeta({ owner, repo })]
      },
      {
        queryKey: getGithubRepoTreeQueryOptions(repo, branchName, directoryPath).queryKey,
        signalKeys: [githubRevalidationSignalKeys.repoCode({ owner, repo })]
      },
      {
        queryKey: getGithubRepoRefCommitQueryOptions(repo, branchName).queryKey,
        signalKeys: [githubRevalidationSignalKeys.repoCode({ owner, repo })]
      }
    ];
  }, [branchName, directoryPath, repo, owner]);
  useGitHubSignalStream(signalTargets);

  const tabUrl =
    view === "tree" ? `${repo}/tree/${branchName}${routePath ? `/${routePath}` : ""}` : `${repo}`;
  const tabTitle =
    view === "repo" || !routePath ? `${repo}` : (routePath.split("/").at(-1) ?? routePath);

  useRegisterGithubPublicTab(
    overviewQuery.data
      ? {
          avatarUrl: overviewQuery.data.ownerAvatarUrl ?? undefined,
          repo: `${repo}`,
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
      window.location.assign(`${repo}/tree/${nextBranch}${routePath ? `/${routePath}` : ""}`);
      return;
    }

    if (nextBranch === overview.defaultBranch) {
      window.location.assign(`${repo}`);
      return;
    }

    window.location.assign(`${repo}/tree/${nextBranch}`);
  };

  return (
    <>
      <div className="h-full w-full overflow-auto">
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
                repo={repo}
              />
            )}

            <div>
              <LatestCommitBar
                branchRef={branchName}
                defaultBranch={overview.defaultBranch ?? "main"}
                defaultBranchTip={overview.latestCommit}
                repoName={repo}
              />
              {treeQuery.data ? (
                <FileTree
                  directoryPath={directoryPath}
                  entries={treeQuery.data}
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
      </div>
      <SidePanelPortal>
        <RepoActivityCards repo={repo} />
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
          <div className="size-4 shrink-0 animate-pulse rounded bg-white/4" />
          <div className="h-4 w-32 animate-pulse rounded-md bg-white/4" />
          <div className="h-4 flex-1 animate-pulse rounded-md bg-white/4" />
          <div className="h-4 w-12 shrink-0 animate-pulse rounded-md bg-white/4" />
        </div>
      ))}
    </div>
  );
}
