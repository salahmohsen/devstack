import { useMemo } from "react";

import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { FileCodeIcon, FolderIcon } from "@tsu-stack/icons";
import { cn } from "@tsu-stack/ui/lib/utils";

import { formatRelativeTime } from "@/shared/lib/format-relative-time";

import { useGetGithubTreeEntryCommitsQuery } from "@/pages/github-repo/api/get-github-tree-entry-commits.query";

type FileTreeProps = {
  directoryPath?: string;
  entries: Array<{
    name: string;
    path: string;
    type: "dir" | "file" | "submodule";
  }>;
  refName: string;
  repo: string;
};

export function FileTree({ directoryPath, entries, refName, repo }: FileTreeProps) {
  const entryNames = useMemo(() => entries.map((entry) => entry.name), [entries]);
  const commitsQuery = useGetGithubTreeEntryCommitsQuery(
    repo,
    refName,
    directoryPath ?? "",
    entryNames
  );

  return (
    <div className="overflow-hidden rounded-b-2xl border border-t-0 border-white/8">
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

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(12rem,26%)_minmax(0,1fr)_7rem] items-center gap-4 px-4 py-2.5 text-sm",
        !isLast && "border-b border-white/8"
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {isDir ? (
          <FolderIcon className="size-4 shrink-0 text-base-400" />
        ) : (
          <FileCodeIcon className="size-4 shrink-0 text-base-500" />
        )}
        <Link
          to={isDir ? "/$repo/tree/$" : "/$repo/blob/$"}
          params={{ repo, _splat: `${refName}/${entry.path}` }}
          className="truncate text-base-200 hover:underline"
        >
          {entry.name}
        </Link>
      </div>
      <span className="truncate text-base-400">
        {commit?.message ? commit.message.split("\n")[0] : isCommitLoading ? "Loading..." : null}
      </span>
      <span className="text-right text-xs text-base-500">
        {commit ? formatRelativeTime(commit.date) : null}
      </span>
    </div>
  );
}
