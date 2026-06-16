import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { type RepoOverview } from "@tsu-stack/github/repo/shared.types.js";
import { type GitHubRepoTreeEntry, type GitHubTreeEntryCommit } from "@tsu-stack/github/types";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { FileIcon, FolderIcon } from "@tsu-stack/icons";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import { cn } from "@tsu-stack/ui/lib/utils";

import { formatRelativeTime } from "@/shared/lib/format-relative-time";

import { getGithubTreeEntryCommitsQueryOptions } from "@/pages/github-repo/api/get-github-tree-entry-commits.query";

import { LatestCommitBar } from "./latest-commit-bar";
import { RepoMarkdownFiles } from "./repo-markdown-files";

export function FolderView({
  currentPath,
  currentRef,
  entries,
  repo,
  repoName
}: {
  currentPath: string;
  currentRef: string;
  entries: GitHubRepoTreeEntry[];
  repo: RepoOverview;
  repoName: string;
}) {
  const entryNames = useMemo(() => entries.map((e) => e.name), [entries]);

  const commitsQuery = useQuery(
    getGithubTreeEntryCommitsQueryOptions(repoName, currentRef, currentPath, entryNames)
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <LatestCommitBar
          branchRef={currentRef}
          defaultBranch={repo.defaultBranch ?? "main"}
          defaultBranchTip={repo.latestCommit}
          repoName={repoName}
        />
        <div className="overflow-hidden rounded-b-lg border">
          {entries.map((entry, index) => (
            <FolderViewRow
              key={entry.sha}
              commit={commitsQuery.data?.[entry.name] ?? null}
              currentPath={currentPath}
              currentRef={currentRef}
              entry={entry}
              isCommitLoading={commitsQuery.isLoading}
              isLast={index === entries.length - 1}
              repoName={repoName}
            />
          ))}
        </div>
      </div>

      <RepoMarkdownFiles currentRef={currentRef} entries={entries} repo={repoName} />
    </div>
  );
}

function FolderViewRow({
  commit,
  currentPath,
  currentRef,
  entry,
  isCommitLoading,
  isLast,
  repoName
}: {
  commit: GitHubTreeEntryCommit | null;
  currentPath: string;
  currentRef: string;
  entry: GitHubRepoTreeEntry;
  isCommitLoading: boolean;
  isLast: boolean;
  repoName: string;
}) {
  const Icon = entry.type === "dir" ? FolderIcon : FileIcon;
  const isDir = entry.type === "dir";
  const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_80px] items-center gap-4 px-4 py-2 text-sm hover:bg-surface-1",
        !isLast && "border-b"
      )}
    >
      <Link
        to={isDir ? "/$repo/tree/$" : "/$repo/blob/$"}
        params={{
          repo: repoName,
          _splat: `${currentRef}/${entryPath}`
        }}
        className="flex min-w-0 items-center gap-2.5"
      >
        <Icon
          size={15}
          strokeWidth={1.8}
          className={cn("shrink-0", isDir ? "text-accent-foreground" : "text-muted-foreground")}
        />
        <span
          className={cn(
            "truncate",
            isDir ? "font-medium text-accent-foreground" : "text-foreground"
          )}
        >
          {entry.name}
        </span>
      </Link>
      <div className="min-w-0">
        {commit?.sha ? (
          <a
            href={`https://github.com/${repoName}/commit/${commit.sha}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-muted-foreground transition-colors hover:text-foreground hover:underline"
          >
            {commit.message?.split("\n")[0]}
          </a>
        ) : isCommitLoading ? (
          <Skeleton className="h-3.5 w-48 rounded" />
        ) : null}
      </div>
      <span className="text-right text-xs text-muted-foreground">
        {commit?.date ? (
          formatRelativeTime(commit.date)
        ) : isCommitLoading ? (
          <Skeleton className="ml-auto h-3.5 w-12 rounded" />
        ) : null}
      </span>
    </div>
  );
}

export function FolderViewSkeleton() {
  const rows = Array.from({ length: 8 }, (_, i) => i);
  return (
    <div className="overflow-hidden rounded-lg border">
      {rows.map((key) => (
        <div key={key} className="flex items-center gap-4 border-b px-4 py-2.5 last:border-b-0">
          <div className="size-4 shrink-0 animate-pulse rounded bg-surface-1" />
          <div className="h-4 w-32 animate-pulse rounded-md bg-surface-1" />
          <div className="h-4 flex-1 animate-pulse rounded-md bg-surface-1" />
          <div className="h-4 w-12 shrink-0 animate-pulse rounded-md bg-surface-1" />
        </div>
      ))}
    </div>
  );
}
