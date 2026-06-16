import { useQuery } from "@tanstack/react-query";
import { memo, useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { type RepoOverview } from "@tsu-stack/github/repo/shared.types.js";
import { baseLocale, getLocale } from "@tsu-stack/i18n/runtime";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";
import { ChevronLeftIcon, PanelLeftIcon } from "@tsu-stack/icons";
import { Drawer, DrawerContent, DrawerTitle } from "@tsu-stack/ui/components/drawer";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from "@tsu-stack/ui/components/resizable";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";

import { getExplorerPath, setExplorerPath } from "@/shared/lib/explorer-path-store";

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
  repo: repoName,
  viewMode
}: {
  currentPath: string;
  currentRef: string | null;
  repo: string;
  viewMode: "blob" | "tree";
}) {
  const hasMounted = useIsClient();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const overviewQuery = useQuery({
    ...getGithubRepoOverviewQueryOptions(repoName),
    enabled: hasMounted
  });

  const repoData = overviewQuery.data;
  const activeRef = currentRefProp ?? repoData?.defaultBranch ?? "main";

  setExplorerPath(currentPath);

  const localePrefix = getLocale() !== baseLocale ? `/${getLocale()}` : "";

  useRegisterGithubPublicTab(
    repoData
      ? {
          avatarUrl: repoData.ownerAvatarUrl ?? undefined,
          repo: repoName,
          title: repoData.name,
          type: "repo",
          url: `${localePrefix}/${repoName}`
        }
      : null
  );

  const rootTreeQuery = useQuery({
    ...getGithubRepoTreeQueryOptions(repoName, activeRef),
    enabled: hasMounted && !!repoData
  });

  const prefetchInput = useMemo(() => {
    return { ref: activeRef, repo: repoName };
  }, [repoName, activeRef]);
  usePrefetchTree(prefetchInput, rootTreeQuery.data);

  const currentTreeQuery = useQuery({
    ...getGithubRepoTreeQueryOptions(repoName, activeRef, currentPath),
    enabled: hasMounted && !!repoData && viewMode === "tree" && currentPath !== ""
  });

  const handleBranchChange = useCallback(
    (branch: string) => {
      const path = getExplorerPath();
      if (path) {
        void navigate({
          params: {
            repo: repoName,
            _splat: `${branch}/${path}`
          },
          to: viewMode === "blob" ? "/$repo/blob/$" : "/$repo/tree/$"
        });
      } else {
        void navigate({
          params: { repo: repoName },
          to: "/$repo"
        });
      }
    },
    [navigate, repoName, viewMode]
  );

  const handleOpenFileSheet = useCallback(() => setDrawerOpen(true), []);

  if (overviewQuery.error) throw overviewQuery.error;
  if (!repoData) return <ExplorerSkeleton />;

  const treeEntries =
    viewMode === "tree" ? (currentPath === "" ? rootTreeQuery.data : currentTreeQuery.data) : null;

  const contentPane =
    viewMode === "blob" ? (
      <div className="h-full overflow-y-auto p-4">
        <CodeFileView currentRef={activeRef} path={currentPath} repo={repoName} />
      </div>
    ) : treeEntries ? (
      <div className="h-full overflow-y-auto p-4">
        <FolderView
          currentPath={currentPath}
          currentRef={activeRef}
          entries={treeEntries}
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
    <RepoFileTreeSidebar currentRef={activeRef} entries={rootTreeQuery.data} repoName={repoName} />
  ) : null;

  return (
    <div className="flex h-full flex-col">
      <ExplorerToolbar
        currentRef={activeRef}
        isDesktop={isDesktop}
        onBranchChange={handleBranchChange}
        onOpenFileSheet={handleOpenFileSheet}
        repo={repoData}
        repoName={repoName}
      />

      {activeRef !== repoData.defaultBranch && (
        <div className="shrink-0 border-b bg-surface-1 px-3 py-2 md:px-4">
          <BranchComparisonBanner
            currentBranch={activeRef}
            defaultBranch={repoData.defaultBranch ?? "main"}
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
  repo,
  repoName
}: {
  currentRef: string;
  isDesktop: boolean;
  onBranchChange: (branch: string) => void;
  onOpenFileSheet: () => void;
  repo: RepoOverview;
  repoName: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b bg-surface-1 px-3 py-2 md:gap-3 md:px-4">
      {!isDesktop && (
        <button
          type="button"
          onClick={onOpenFileSheet}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground"
          aria-label="Open file tree"
        >
          <PanelLeftIcon size={16} strokeWidth={2} />
        </button>
      )}

      <Link
        to="/$repo"
        params={{ repo: repoName }}
        className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon size={16} />
        <span className="font-medium">{repoName}</span>
      </Link>

      <div className="ml-auto">
        <CodeExplorerToolbar currentRef={currentRef} onBranchChange={onBranchChange} repo={repo} />
      </div>
    </div>
  );
});

function ExplorerSkeleton() {
  return (
    <div className="flex h-full flex-col">
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
