import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useMemo, useState } from "react";

import { type GitHubRepoTreeEntry } from "@tsu-stack/github";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";
import { ChevronRightIcon, FileIcon, FolderIcon } from "@tsu-stack/icons";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useHasMounted } from "@/shared/lib/use-has-mounted";
import { FileSearchCard } from "@/shared/ui/file-search-card";

import {
  getGithubRepoTreeQueryOptions,
  githubRepoTreeQueryKeys
} from "@/pages/github-repo/api/get-github-repo-tree.query";
import {
  useExplorerPath,
  useIsActivePath,
  useIsAncestorPath
} from "@/pages/github-repo/lib/explorer-path-store";
import {
  type FileSearchEntry,
  type FileSearchResult
} from "@/pages/github-repo/lib/fuzzy-file-search";

function useAllCachedFiles(owner: string, repo: string, ref: string): FileSearchEntry[] {
  const queryClient = useQueryClient();

  const keyPrefix = githubRepoTreeQueryKeys.byPath(owner, repo, ref, "");
  const allFiles: FileSearchEntry[] = [];

  const cache = queryClient.getQueriesData<GitHubRepoTreeEntry[]>({
    queryKey: keyPrefix.slice(0, 4) as readonly string[]
  });

  for (const [, data] of cache) {
    if (!data) continue;
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
  owner,
  repoName
}: {
  currentRef: string;
  entries: GitHubRepoTreeEntry[];
  owner: string;
  repoName: string;
}) {
  const navigate = useNavigate();
  const currentPath = useExplorerPath();
  const allFiles = useAllCachedFiles(owner, repoName, currentRef);

  const defaultEntries = useMemo(
    () => allFiles.filter((f) => f.type === "file" && f.path.includes("/")),
    [allFiles]
  );

  const handleSelect = useCallback(
    (entry: FileSearchResult) => {
      const isDir = entry.type === "dir";
      void navigate({
        params: {
          owner,
          repo: repoName,
          _splat: `${currentRef}/${entry.path}`
        },
        to: isDir ? "/$owner/$repo/tree/$" : "/$owner/$repo/blob/$"
      });
    },
    [navigate, owner, repoName, currentRef]
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
            owner={owner}
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
  owner,
  parentPath,
  repoName
}: {
  currentRef: string;
  depth: number;
  entry: GitHubRepoTreeEntry;
  owner: string;
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
        owner={owner}
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
      owner={owner}
      repoName={repoName}
    />
  );
});

const DirectoryNode = memo(function DirectoryNode({
  currentRef,
  depth,
  entry,
  entryPath,
  owner,
  repoName
}: {
  currentRef: string;
  depth: number;
  entry: GitHubRepoTreeEntry;
  entryPath: string;
  owner: string;
  repoName: string;
}) {
  const isActive = useIsActivePath(entryPath);
  const isAncestor = useIsAncestorPath(entryPath);
  const [isOpen, setIsOpen] = useState(isAncestor || isActive);
  const hasMounted = useHasMounted();

  const treeQuery = useQuery({
    ...getGithubRepoTreeQueryOptions(owner, repoName, currentRef, entryPath),
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
          <ChevronRightIcon
            size={12}
            className={cn("shrink-0 transition-transform", isOpen && "rotate-90")}
          />
        </button>
        <Link
          to="/$owner/$repo/tree/$"
          params={{
            owner,
            repo: repoName,
            _splat: `${currentRef}/${entryPath}`
          }}
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
          <FolderIcon size={15} strokeWidth={1.8} className="shrink-0 text-accent-foreground" />
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
              owner={owner}
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
  owner,
  repoName
}: {
  currentRef: string;
  depth: number;
  entry: GitHubRepoTreeEntry;
  entryPath: string;
  owner: string;
  repoName: string;
}) {
  const isActive = useIsActivePath(entryPath);

  return (
    <Link
      to="/$owner/$repo/blob/$"
      params={{
        owner,
        repo: repoName,
        _splat: `${currentRef}/${entryPath}`
      }}
      onClick={(e) => {
        if (isActive) e.preventDefault();
      }}
      className={cn(
        "flex w-full items-center gap-1.5 px-3 py-1.5 text-[13px] transition-colors hover:bg-surface-1",
        isActive && "bg-surface-1"
      )}
      style={{ paddingLeft: `${depth * 12 + 26}px` }}
    >
      <FileIcon size={15} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
      <span className={cn("truncate", isActive ? "text-foreground" : "text-muted-foreground")}>
        {entry.name}
      </span>
    </Link>
  );
});
