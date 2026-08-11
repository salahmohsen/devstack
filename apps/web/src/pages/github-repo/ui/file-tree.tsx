import { Link } from "@tanstack/react-router";
import { FileCode, Folder } from "lucide-react";
import { useMemo } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { formatRelativeTime } from "@/shared/lib/format-relative-time";
import { useRepoRouteLinks } from "@/shared/lib/use-repo-route-links";

import { useGetGithubTreeEntryCommitsQuery } from "@/pages/github-repo/api/get-github-tree-entry-commits.query";

type FileTreeProps = {
  directoryPath?: string;
  entries: Array<{
    name: string;
    path: string;
    type: "dir" | "file" | "submodule";
  }>;
  username: string;
  refName: string;
  repo: string;
};

export function FileTree({ directoryPath, entries, username, refName, repo }: FileTreeProps) {
  const entryNames = useMemo(() => entries.map((entry) => entry.name), [entries]);
  const commitsQuery = useGetGithubTreeEntryCommitsQuery(
    repo,
    refName,
    directoryPath ?? "",
    entryNames,
    username
  );

  return (
    <div className="overflow-hidden rounded-b-2xl border border-t-0 border-border">
      {entries.map((entry, index) => (
        <FileTreeRow
          key={entry.path}
          entry={entry}
          repo={repo}
          refName={refName}
          commit={commitsQuery.data?.[entry.name] ?? null}
          isCommitLoading={commitsQuery.isLoading}
          isLast={index === entries.length - 1}
        />
      ))}
    </div>
  );
}

function FileTreeRow({
  entry,
  repo,
  refName,
  commit,
  isCommitLoading,
  isLast
}: {
  entry: FileTreeProps["entries"][number];
  repo: string;
  refName: string;
  commit: { message: string | null; date: string | null } | null;
  isCommitLoading: boolean;
  isLast: boolean;
}) {
  const isDir = entry.type === "dir";
  const { entryLink } = useRepoRouteLinks();
  const link = entryLink(repo, refName, entry.path, isDir);

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(12rem,26%)_minmax(0,1fr)_7rem] items-center gap-4 px-4 py-2.5 text-sm",
        !isLast && "border-b border-border"
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {isDir ? (
          <Folder className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <FileCode className="size-4 shrink-0 text-base-500" />
        )}
        <Link
          to={link.to}
          params={link.params}
          className="truncate text-accent-foreground hover:underline"
        >
          {entry.name}
        </Link>
      </div>
      <span className="truncate text-muted-foreground">
        {commit?.message ? commit.message.split("\n")[0] : isCommitLoading ? "Loading..." : null}
      </span>
      <span className="text-right text-xs text-base-500">
        {commit ? formatRelativeTime(commit.date) : null}
      </span>
    </div>
  );
}
