import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, File, Folder } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { type GitHubRepoTreeEntry } from "@tsu-stack/github/types";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  useExplorerPath,
  useIsActivePath,
  useIsAncestorPath
} from "@/shared/lib/explorer-path-store";
import { type FileSearchEntry, type FileSearchResult } from "@/shared/lib/fuzzy-file-search";
import { useRepoRouteLinks } from "@/shared/lib/use-repo-route-links";
import { FileSearchCard } from "@/shared/ui/file-search-card";

import { getGithubRepoTreeQueryOptions } from "@/pages/github-repo/api/get-github-repo-tree.query";

function useAllCachedFiles(repo: string, ref: string): FileSearchEntry[] {
  const queryClient = useQueryClient();
  const allFiles: FileSearchEntry[] = [];

  for (const query of queryClient.getQueryCache().getAll()) {
    const data = query.state.data as GitHubRepoTreeEntry[] | undefined;
    if (!data) continue;

    const key = query.queryKey;
    const path = key[0];
    if (
      !Array.isArray(path) ||
      (path[path.length - 1] !== "publicGetRepoTree" &&
        path[path.length - 1] !== "privateGetRepoTree")
    ) {
      continue;
    }

    const input = (key[1] as { input?: { repo?: string; ref?: string } } | undefined)?.input;
    if (input?.repo !== repo || input?.ref !== ref) continue;

    for (const entry of data) {
      allFiles.push({
        name: entry.name,
        path: entry.path,
        type: entry.type
      });
    }
  }

  return allFiles;
}

export const RepoFileTreeSidebar = memo(function RepoFileTreeSidebar({
  currentRef,
  entries,
  repoName
}: {
  currentRef: string;
  entries: GitHubRepoTreeEntry[];
  repoName: string;
}) {
  const navigate = useNavigate();
  const currentPath = useExplorerPath();
  const allFiles = useAllCachedFiles(repoName, currentRef);
  const links = useRepoRouteLinks();

  const defaultEntries = useMemo(
    () => allFiles.filter((f) => f.type === "file" && f.path.includes("/")),
    [allFiles]
  );

  const handleSelect = useCallback(
    (entry: FileSearchResult) => {
      const isDir = entry.type === "dir";
      const link = links.entryLink(repoName, currentRef, entry.path, isDir);
      void navigate({
        to: link.to,
        params: link.params
      });
    },
    [navigate, repoName, currentRef, links]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <FileSearchCard
        activePath={currentPath}
        defaultEntries={defaultEntries}
        entries={allFiles}
        onSelect={handleSelect}
        placeholder="Search files..."
      />

      <div className="flex-1 overflow-y-auto py-1">
        {entries.map((entry) => (
          <TreeNode
            key={entry.name}
            currentRef={currentRef}
            depth={0}
            entry={entry}
            parentPath=""
            repoName={repoName}
          />
        ))}
      </div>
    </div>
  );
});

const TreeNode = memo(function TreeNode({
  currentRef,
  depth,
  entry,
  parentPath,
  repoName
}: {
  currentRef: string;
  depth: number;
  entry: GitHubRepoTreeEntry;
  parentPath: string;
  repoName: string;
}) {
  const entryPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
  const isDir = entry.type === "dir";

  if (isDir) {
    return (
      <DirectoryNode
        currentRef={currentRef}
        depth={depth}
        entry={entry}
        entryPath={entryPath}
        repoName={repoName}
      />
    );
  }

  return (
    <FileNode
      currentRef={currentRef}
      depth={depth}
      entry={entry}
      entryPath={entryPath}
      repoName={repoName}
    />
  );
});

const DirectoryNode = memo(function DirectoryNode({
  currentRef,
  depth,
  entry,
  entryPath,
  repoName
}: {
  currentRef: string;
  depth: number;
  entry: GitHubRepoTreeEntry;
  entryPath: string;
  repoName: string;
}) {
  const isActive = useIsActivePath(entryPath);
  const isAncestor = useIsAncestorPath(entryPath);
  const [isOpen, setIsOpen] = useState(isAncestor || isActive);
  const hasMounted = useIsClient();
  const { user } = useAuth();
  const links = useRepoRouteLinks();
  const profileName = links.profileName ?? "";
  const sessionProfileName =
    typeof (user as { profileName?: string } | null)?.profileName === "string"
      ? (user as { profileName: string }).profileName
      : null;
  const isPrivate = Boolean(user && sessionProfileName === profileName);

  const treeQuery = useQuery({
    ...getGithubRepoTreeQueryOptions(
      repoName,
      currentRef,
      entryPath,
      isPrivate,
      profileName || undefined
    ),
    enabled: hasMounted && isOpen
  });

  return (
    <div>
      <div
        className={cn(
          "flex w-full items-center text-[13px] transition-colors hover:bg-surface-1",
          isActive && "bg-surface-1"
        )}
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="shrink-0 py-1.5 pl-3 text-muted-foreground"
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          <ChevronRight
            size={12}
            className={cn("shrink-0 transition-transform", isOpen && "rotate-90")}
          />
        </button>
        <Link
          to={links.treeTo}
          params={links.treeParams(repoName, `${currentRef}/${entryPath}`)}
          onClick={(e) => {
            if (isActive) {
              e.preventDefault();
              setIsOpen((prev) => !prev);
              return;
            }
            if (!isOpen) setIsOpen(true);
          }}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-3 pl-1.5"
        >
          <Folder size={15} strokeWidth={1.8} className="shrink-0 text-accent-foreground" />
          <span className="truncate text-foreground">{entry.name}</span>
        </Link>
      </div>

      {isOpen && (
        <div>
          {treeQuery.isLoading && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground"
              style={{ paddingLeft: `${(depth + 1) * 12 + 12}px` }}
            >
              <Spinner className="size-3" />
              <span>Loading...</span>
            </div>
          )}
          {treeQuery.data?.map((child) => (
            <TreeNode
              key={child.name}
              currentRef={currentRef}
              depth={depth + 1}
              entry={child}
              parentPath={entryPath}
              repoName={repoName}
            />
          ))}
        </div>
      )}
    </div>
  );
});

const FileNode = memo(function FileNode({
  currentRef,
  depth,
  entry,
  entryPath,
  repoName
}: {
  currentRef: string;
  depth: number;
  entry: GitHubRepoTreeEntry;
  entryPath: string;
  repoName: string;
}) {
  const isActive = useIsActivePath(entryPath);
  const links = useRepoRouteLinks();

  return (
    <Link
      to={links.blobTo}
      params={links.blobParams(repoName, `${currentRef}/${entryPath}`)}
      onClick={(e) => {
        if (isActive) e.preventDefault();
      }}
      className={cn(
        "flex w-full items-center gap-1.5 px-3 py-1.5 text-[13px] transition-colors hover:bg-surface-1",
        isActive && "bg-surface-1"
      )}
      style={{ paddingLeft: `${depth * 12 + 26}px` }}
    >
      <File size={15} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
      <span className={cn("truncate", isActive ? "text-foreground" : "text-muted-foreground")}>
        {entry.name}
      </span>
    </Link>
  );
});
