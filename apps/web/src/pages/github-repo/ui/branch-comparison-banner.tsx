import { GitCompare, GitPullRequest } from "lucide-react";

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { Callout, CalloutAction, CalloutContent } from "@tsu-stack/ui/components/callout";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";

import { useGetGithubRepoBranchComparisonQuery } from "@/pages/github-repo/api/get-github-repo-branch-comparison.query";

export function BranchComparisonBanner({
  currentBranch,
  defaultBranch,
  repo
}: {
  currentBranch: string;
  defaultBranch: string;
  repo: string;
}) {
  const isSameBranch = currentBranch === defaultBranch;
  const comparisonQuery = useGetGithubRepoBranchComparisonQuery(repo, defaultBranch, currentBranch);
  const isAdmin = !!useAuth().user?.id;

  if (isSameBranch || !isAdmin) return null;

  if (comparisonQuery.isPending) {
    return (
      <Callout variant="default">
        <CalloutContent>
          <Skeleton className="h-4 w-64 rounded" />
        </CalloutContent>
      </Callout>
    );
  }

  const comparison = comparisonQuery.data;
  if (!comparison) return null;

  const { aheadBy, behindBy } = comparison;
  if (aheadBy === 0 && behindBy === 0) return null;

  const compareUrl = `https://github.com/${repo}/compare/${defaultBranch}...${currentBranch}`;
  const createPrUrl = `${compareUrl}?expand=1`;

  return (
    <Callout variant="default">
      <CalloutContent className="flex-wrap text-muted-foreground">
        <span>This branch is</span>
        {aheadBy > 0 && (
          <a
            href={compareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {aheadBy} {aheadBy === 1 ? "commit" : "commits"} ahead
          </a>
        )}
        {aheadBy > 0 && behindBy > 0 && <span>of and</span>}
        {aheadBy === 0 && behindBy > 0 && <span>of</span>}
        {behindBy > 0 && (
          <a
            href={compareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {behindBy} {behindBy === 1 ? "commit" : "commits"} behind
          </a>
        )}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
          {defaultBranch}
        </code>
        <span>.</span>
      </CalloutContent>
      <CalloutAction className="flex items-center gap-3">
        <a
          href={compareUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open compare view"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <GitCompare size={14} />
        </a>
        {aheadBy > 0 && (
          <a
            href={createPrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background transition-opacity hover:opacity-90"
          >
            <GitPullRequest size={13} />
            Create pull request
          </a>
        )}
      </CalloutAction>
    </Callout>
  );
}
