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
  /** Tenant profile for GitHub API queries (Host-resolved on custom domain; not the URL segment). */
  profileName,
  repoName
}: {
  currentRef: string;
  entries: GitHubRepoTreeEntry[];
  profileName: string;
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
            profileName={profileName}
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
  profileName,
  repoName
}: {
  currentRef: string;
  depth: number;
  entry: GitHubRepoTreeEntry;
  parentPath: string;
  profileName: string;
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
        profileName={profileName}
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

/** Tree depth indent (px) past the base row padding. */
const TREE_INDENT = 12;
/** Space for the chevron column so files align with folder names. */
const CHEVRON_COL = 16;
/** Horizontal inset from the sidebar edge — hover fills this padded box. */
const ROW_INSET = 4;

function treeRowClassName(isActive: boolean) {
  return cn(
    // Full-width fill of the inset box (not content-sized)
    "flex w-full min-w-0 items-center gap-1.5 rounded-md py-1.5 text-[13px] transition-colors",
    "hover:bg-surface-1",
    isActive && "bg-surface-1"
  );
}

function treeRowPaddingLeft(depth: number, includeChevronGutter: boolean) {
  const base = 8; // inner pad inside the inset box
  const indent = depth * TREE_INDENT;
  return base + indent + (includeChevronGutter ? CHEVRON_COL : 0);
}

const DirectoryNode = memo(function DirectoryNode({
  currentRef,
  depth,
  entry,
  entryPath,
  profileName,
  repoName
}: {
  currentRef: string;
  depth: number;
  entry: GitHubRepoTreeEntry;
  entryPath: string;
  /** Tenant profile for API (from layout), not URL path segment. */
  profileName: string;
  repoName: string;
}) {
  const isActive = useIsActivePath(entryPath);
  const isAncestor = useIsAncestorPath(entryPath);
  const [isOpen, setIsOpen] = useState(isAncestor || isActive);
  const hasMounted = useIsClient();
  const { user } = useAuth();
  // URL links only — custom domain has no /$profileName segment.
  const links = useRepoRouteLinks();
  const sessionProfileName =
    typeof (user as { profileName?: string } | null)?.profileName === "string"
      ? (user as { profileName: string }).profileName
      : null;
  // Must use tenant profileName prop (Host-resolved on custom domain), not URL params.
  const isPrivate = Boolean(user && sessionProfileName === profileName);

  const treeQuery = useQuery({
    ...getGithubRepoTreeQueryOptions(repoName, currentRef, entryPath, isPrivate, profileName),
    enabled: hasMounted && isOpen
  });

  return (
    <div>
      {/* Outer inset so hover/active bg has padding from the sidebar edges */}
      <div style={{ paddingInline: ROW_INSET }}>
        <div
          className={treeRowClassName(isActive)}
          style={{ paddingLeft: treeRowPaddingLeft(depth, false), paddingRight: 8 }}
        >
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
            aria-label={isOpen ? `Collapse ${entry.name}` : `Expand ${entry.name}`}
          >
            <ChevronRight
              size={12}
              className={cn("shrink-0 transition-transform", isOpen && "rotate-90")}
            />
          </button>
          <Link
            to={links.treeTo}
            params={links.treeParams(repoName, `${currentRef}/${entryPath}`)}
            activeOptions={{ exact: true }}
            onClick={(e) => {
              if (isActive) {
                e.preventDefault();
                setIsOpen((prev) => !prev);
                return;
              }
              if (!isOpen) setIsOpen(true);
            }}
            className="flex min-w-0 flex-1 items-center gap-1.5"
          >
            <Folder size={15} strokeWidth={1.8} className="shrink-0 text-accent-foreground" />
            <span className="truncate text-foreground">{entry.name}</span>
          </Link>
        </div>
      </div>

      {isOpen ? (
        <div>
          {treeQuery.isLoading ? (
            <div
              className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground"
              style={{
                paddingLeft: ROW_INSET + treeRowPaddingLeft(depth + 1, true),
                paddingRight: ROW_INSET + 8
              }}
            >
              <Spinner className="size-3" />
              <span>Loading...</span>
            </div>
          ) : null}
          {treeQuery.data?.map((child) => (
            <TreeNode
              key={child.name}
              currentRef={currentRef}
              depth={depth + 1}
              entry={child}
              parentPath={entryPath}
              profileName={profileName}
              repoName={repoName}
            />
          ))}
        </div>
      ) : null}
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
    // Outer inset: hover fill is the rounded box, not edge-to-edge flush
    <div style={{ paddingInline: ROW_INSET }}>
      <Link
        to={links.blobTo}
        params={links.blobParams(repoName, `${currentRef}/${entryPath}`)}
        activeOptions={{ exact: true }}
        onClick={(e) => {
          if (isActive) e.preventDefault();
        }}
        className={treeRowClassName(isActive)}
        style={{
          paddingLeft: treeRowPaddingLeft(depth, true),
          paddingRight: 8
        }}
      >
        <File size={15} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
        <span className={cn("truncate", isActive ? "text-foreground" : "text-muted-foreground")}>
          {entry.name}
        </span>
      </Link>
    </div>
  );
});
