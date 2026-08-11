import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, PanelLeft } from "lucide-react";
import { memo, useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { type RepoOverview } from "@tsu-stack/github/repo/shared.types.js";
import { Drawer, DrawerContent, DrawerTitle } from "@tsu-stack/ui/components/drawer";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from "@tsu-stack/ui/components/resizable";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";

import { getExplorerPath, setExplorerPath } from "@/shared/lib/explorer-path-store";
import {
  buildRepoTabUrl,
  repoBranchNavLocation,
  repoExplorerTabTitle
} from "@/shared/lib/repo-paths";

import { useRegisterGithubPublicTab } from "@/widgets/layout";

import { getGithubRepoOverviewQueryOptions } from "@/pages/github-repo/api/get-github-repo-overview.query";
import { getGithubRepoTreeQueryOptions } from "@/pages/github-repo/api/get-github-repo-tree.query";

import { BranchComparisonBanner } from "./branch-comparison-banner";
import { CodeExplorerToolbar } from "./code-explorer-toolbar";
import { CodeFileView } from "./code-file-view";
import { FolderView, FolderViewSkeleton } from "./folder-view";
import { RepoFileTreeSidebar } from "./repo-file-tree-sidebar";
import { usePrefetchTree } from "./use-prefetch-tree";

const MD_QUERY = "(min-width: 768px)";
const mdSubscribe = (cb: () => void) => {
  const mql = window.matchMedia(MD_QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};
const getMdSnapshot = () => window.matchMedia(MD_QUERY).matches;
const getMdServerSnapshot = () => true;

function useIsDesktop() {
  return useSyncExternalStore(mdSubscribe, getMdSnapshot, getMdServerSnapshot);
}

export function RepoExplorerLayout({
  currentPath,
  currentRef: currentRefProp,
  profileName,
  pathProfileName = profileName,
  repo: repoName,
  viewMode
}: {
  currentPath: string;
  currentRef: string | null;
  profileName: string;
  pathProfileName?: string | null;
  repo: string;
  viewMode: "blob" | "tree";
}) {
  const hasMounted = useIsClient();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const sessionProfileName =
    typeof (user as { profileName?: string } | null)?.profileName === "string"
      ? (user as { profileName: string }).profileName
      : null;
  const isPrivate = Boolean(user && sessionProfileName === profileName);

  const overviewQuery = useQuery({
    ...getGithubRepoOverviewQueryOptions(repoName, isPrivate, profileName),
    enabled: hasMounted
  });

  const repoData = overviewQuery.data;
  const activeRef = currentRefProp ?? repoData?.defaultBranch ?? "main";

  setExplorerPath(currentPath);

  const displayRepoName = repoData?.name ?? repoName;
  const explorerTabTitle = repoExplorerTabTitle(displayRepoName, currentPath);

  useRegisterGithubPublicTab(
    repoData
      ? {
          avatarUrl: repoData.ownerAvatarUrl ?? undefined,
          // Stable id per repo so tree/blob navigation updates the same tab.
          repo: repoName,
          tabId: `repo:${repoName}`,
          title: explorerTabTitle,
          type: "repo",
          url: buildRepoTabUrl({
            profileName: pathProfileName,
            repo: repoName,
            view: viewMode,
            ref: activeRef,
            path: currentPath
          })
        }
      : null
  );

  const rootTreeQuery = useQuery({
    ...getGithubRepoTreeQueryOptions(repoName, activeRef, "", isPrivate, profileName),
    enabled: hasMounted && !!repoData
  });

  const prefetchInput = useMemo(() => {
    return { ref: activeRef, repo: repoName, profileName };
  }, [activeRef, profileName, repoName]);
  usePrefetchTree(prefetchInput, rootTreeQuery.data, isPrivate);

  const currentTreeQuery = useQuery({
    ...getGithubRepoTreeQueryOptions(repoName, activeRef, currentPath, isPrivate, profileName),
    enabled: hasMounted && !!repoData && viewMode === "tree" && currentPath !== ""
  });

  const handleBranchChange = useCallback(
    (branch: string) => {
      const path = getExplorerPath();
      const loc = repoBranchNavLocation(pathProfileName ?? null, repoName, branch, {
        path,
        view: viewMode,
        defaultBranch: repoData?.defaultBranch
      });
      void navigate({ to: loc.to, params: loc.params } as never);
    },
    [navigate, pathProfileName, repoData?.defaultBranch, repoName, viewMode]
  );

  const handleOpenFileSheet = useCallback(() => setDrawerOpen(true), []);

  if (overviewQuery.error) throw overviewQuery.error;
  if (!repoData) return <ExplorerSkeleton />;

  const treeEntries =
    viewMode === "tree" ? (currentPath === "" ? rootTreeQuery.data : currentTreeQuery.data) : null;

  const contentPane =
    viewMode === "blob" ? (
      <div className="h-full overflow-y-auto p-4">
        <CodeFileView
          currentRef={activeRef}
          path={currentPath}
          profileName={profileName}
          repo={repoName}
        />
      </div>
    ) : treeEntries ? (
      <div className="h-full overflow-y-auto p-4">
        <FolderView
          currentPath={currentPath}
          currentRef={activeRef}
          entries={treeEntries}
          profileName={profileName}
          repo={repoData}
          repoName={repoName}
        />
      </div>
    ) : (
      <div className="h-full overflow-y-auto p-4">
        <FolderViewSkeleton />
      </div>
    );

  const sidebarContent = rootTreeQuery.data ? (
    <RepoFileTreeSidebar
      currentRef={activeRef}
      entries={rootTreeQuery.data}
      profileName={profileName}
      repoName={repoName}
    />
  ) : null;

  return (
    <div className="flex h-full w-full flex-col">
      <ExplorerToolbar
        currentRef={activeRef}
        isDesktop={isDesktop}
        onBranchChange={handleBranchChange}
        onOpenFileSheet={handleOpenFileSheet}
        profileName={profileName}
        repo={repoData}
        repoName={repoName}
      />

      {activeRef !== repoData.defaultBranch && (
        <div className="shrink-0 border-b bg-surface-1 px-3 py-2 md:px-4">
          <BranchComparisonBanner
            currentBranch={activeRef}
            defaultBranch={repoData.defaultBranch ?? "main"}
            profileName={profileName}
            repo={repoName}
          />
        </div>
      )}

      {isDesktop ? (
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize="20%" maxSize="40%" minSize="12%">
            {sidebarContent}
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize="80%">{contentPane}</ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <>
          <div className="flex-1 overflow-hidden">{contentPane}</div>
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerContent className="max-h-[70dvh]">
              <DrawerTitle className="sr-only">File tree</DrawerTitle>
              {sidebarContent}
            </DrawerContent>
          </Drawer>
        </>
      )}
    </div>
  );
}

const ExplorerToolbar = memo(function ExplorerToolbar({
  currentRef,
  isDesktop,
  onBranchChange,
  onOpenFileSheet,
  profileName,
  repo,
  repoName
}: {
  currentRef: string;
  isDesktop: boolean;
  onBranchChange: (branch: string) => void;
  onOpenFileSheet: () => void;
  /** Tenant slug for GitHub public data; path segment may be null on custom domain. */
  profileName: string;
  repo: RepoOverview;
  repoName: string;
}) {
  const params = useParams({ strict: false }) as { profileName?: string };
  const pathProfileName = params.profileName;
  return (
    <div className="flex shrink-0 items-center gap-2 border-b bg-card px-3 py-2 md:gap-3 md:px-4">
      {!isDesktop && (
        <button
          type="button"
          onClick={onOpenFileSheet}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground"
          aria-label="Open file tree"
        >
          <PanelLeft size={16} strokeWidth={2} />
        </button>
      )}

      <Link
        // Custom-domain surface: path profile is null → `/repos/$repo` (no slug).
        to={pathProfileName ? "/$profileName/repos/$repo" : "/repos/$repo"}
        params={
          pathProfileName ? { profileName: pathProfileName, repo: repoName } : { repo: repoName }
        }
        className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft size={16} />
        <span className="font-medium">{repoName}</span>
      </Link>

      <div className="ml-auto">
        <CodeExplorerToolbar
          currentRef={currentRef}
          onBranchChange={onBranchChange}
          profileName={profileName}
          repo={repo}
        />
      </div>
    </div>
  );
});

function ExplorerSkeleton() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b bg-surface-1 px-4 py-2">
        <Skeleton className="h-5 w-32 rounded" />
        <div className="ml-auto">
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>
      <div className="flex-1 p-4">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    </div>
  );
}
