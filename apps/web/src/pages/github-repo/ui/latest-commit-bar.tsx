import { useQuery } from "@tanstack/react-query";

import { type GitHubRepoLatestCommit } from "@tsu-stack/github";
import { GitCommitIcon } from "@tsu-stack/icons";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@tsu-stack/ui/components/tooltip";

import { formatRelativeTime } from "@/shared/lib/format-relative-time";

import { getGithubRepoRefCommitQueryOptions } from "@/pages/github-repo/api/get-github-repo-ref-commit.query";

type RepoOverviewLatestCommit = {
  author: {
    avatarUrl: string;
    login: string;
    url: string;
    type: string;
  } | null;
  date: string;
  message: string;
  sha: string;
};

function normalizeCommit(
  commit: GitHubRepoLatestCommit | RepoOverviewLatestCommit | null | undefined
): GitHubRepoLatestCommit | null {
  if (!commit) {
    return null;
  }

  if ("committedAt" in commit) {
    return commit;
  }

  return {
    authorAvatarUrl: commit.author?.avatarUrl ?? null,
    authorLogin: commit.author?.login ?? null,
    committedAt: commit.date,
    message: commit.message,
    sha: commit.sha,
    url: commit.author?.url ?? null
  };
}

export function LatestCommitBar({
  owner,
  repoName,
  branchRef,
  defaultBranch,
  defaultBranchTip
}: {
  owner: string;
  repoName: string;
  branchRef: string;
  defaultBranch: string;
  defaultBranchTip: GitHubRepoLatestCommit | RepoOverviewLatestCommit | null;
}) {
  const placeholderData = normalizeCommit(defaultBranchTip) ?? undefined;
  const tipQuery = useQuery({
    ...getGithubRepoRefCommitQueryOptions(owner, repoName, branchRef),
    placeholderData: branchRef === defaultBranch ? placeholderData : undefined
  });

  const commit = tipQuery.data;

  if (tipQuery.isPending && commit == null) {
    return (
      <div className="flex items-center gap-3 rounded-t-2xl border border-b-0 border-white/8 bg-white/3 px-4 py-2.5 text-sm">
        <Skeleton className="size-5 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-20 shrink-0 rounded" />
        <Skeleton className="h-4 min-w-0 flex-1 rounded" />
        <Skeleton className="h-4 w-24 shrink-0 rounded" />
      </div>
    );
  }

  if (!commit) return null;

  const shortSha = commit.sha?.slice(0, 7) ?? "";
  const firstLine = commit.message?.split("\n")[0] ?? "No commit message";

  return (
    <div className="flex items-center gap-3 rounded-t-2xl border border-b-0 border-white/8 bg-white/3 px-4 py-2.5 text-sm">
      {commit.authorAvatarUrl && (
        <img
          src={commit.authorAvatarUrl}
          alt={commit.authorLogin ?? "Author"}
          className="size-5 shrink-0 rounded-full"
        />
      )}
      <span className="font-medium text-base-200">{commit.authorLogin ?? "Unknown"}</span>
      <a
        href={commit.url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 truncate text-left text-base-400 transition-colors hover:text-white hover:underline"
      >
        {firstLine}
      </a>
      <div className="flex shrink-0 items-center gap-3 text-xs text-base-500">
        <Tooltip>
          <TooltipTrigger render={<span className="flex gap-1" />}>
            <GitCommitIcon className="size-3.5" />
            <code className="font-mono">{shortSha}</code>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <code className="font-mono">{commit.sha}</code>
          </TooltipContent>
        </Tooltip>
        <span>{formatRelativeTime(commit.committedAt)}</span>
      </div>
    </div>
  );
}
