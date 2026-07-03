import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ChevronRight,
  GitPullRequestIcon,
  MessageSquare,
  PlayCircle,
  PlusIcon
} from "lucide-react";
import { useMemo } from "react";

import {
  type DiscussionSummary,
  type IssueSummary,
  type PullSummary,
  type WorkflowRun
} from "@tsu-stack/github";
import { githubRevalidationSignalKeys } from "@tsu-stack/github/cache/github-revalidation";
import { type RepoOverview } from "@tsu-stack/github/schemas";
import { cn } from "@tsu-stack/ui/lib/utils";

import { formatRelativeTime } from "@/shared/lib/format-relative-time";
import { getPrStateConfig } from "@/shared/lib/pr-state";
import { useGitHubSignalStream } from "@/shared/lib/use-github-signal-stream";
import { CheckStateIcon, getCheckState } from "@/shared/ui/check-state-icon";

import { useGetGithubRepoDiscussionsQuery } from "@/pages/github-repo/api/get-github-repo-discussions.query";
import {
  getGithubRepoIssuesQueryOptions,
  useGetGithubRepoIssuesQuery
} from "@/pages/github-repo/api/get-github-repo-issues.query";
import {
  getGithubRepoPullsQueryOptions,
  useGetGithubRepoPullsQuery
} from "@/pages/github-repo/api/get-github-repo-pulls.query";
import {
  getGithubRepoWorkflowRunsQueryOptions,
  useGetGithubRepoWorkflowRunsQuery
} from "@/pages/github-repo/api/get-github-repo-workflow-runs.query";
import { REPO_ACTIVITY_CARDS_PER_PAGE } from "@/pages/github-repo/api/repo-activity-cards.constants";

export function RepoActivityCards({
  owner,
  repo,
  repoData
}: {
  owner: string;
  repo: string;
  repoData: RepoOverview;
}) {
  const pullsQuery = useGetGithubRepoPullsQuery({
    repo,
    perPage: REPO_ACTIVITY_CARDS_PER_PAGE,
    sort: "updated",
    state: "open"
  });

  const issuesQuery = useGetGithubRepoIssuesQuery({
    repo,
    perPage: REPO_ACTIVITY_CARDS_PER_PAGE,
    sort: "updated",
    state: "open"
  });

  const runsQuery = useGetGithubRepoWorkflowRunsQuery({
    repo,
    perPage: REPO_ACTIVITY_CARDS_PER_PAGE
  });

  const discussionsQuery = useGetGithubRepoDiscussionsQuery({
    first: REPO_ACTIVITY_CARDS_PER_PAGE,
    repo
  });

  const discussions = discussionsQuery.data?.discussions;
  const discussionCount = discussionsQuery.data?.totalCount;

  const webhookRefreshTargets = useMemo(() => {
    const repoInput = { owner, repo };
    const pullSignalKeys = new Set<string>([githubRevalidationSignalKeys.repoMeta(repoInput)]);
    const issueSignalKeys = new Set<string>([githubRevalidationSignalKeys.repoMeta(repoInput)]);
    const runSignalKeys = new Set<string>([githubRevalidationSignalKeys.actionsRepo(repoInput)]);

    for (const pull of pullsQuery.data ?? []) {
      pullSignalKeys.add(
        githubRevalidationSignalKeys.pullEntity({
          owner: pull.repository.owner,
          repo: pull.repository.name,
          pullNumber: pull.number
        })
      );
    }

    for (const issue of issuesQuery.data ?? []) {
      issueSignalKeys.add(
        githubRevalidationSignalKeys.issueEntity({
          owner: issue.repository.owner,
          repo: issue.repository.name,
          issueNumber: issue.number
        })
      );
    }

    for (const run of runsQuery.data ?? []) {
      runSignalKeys.add(
        githubRevalidationSignalKeys.workflowRunEntity({
          owner,
          repo,
          runId: run.id
        })
      );
    }

    return [
      {
        queryKey: getGithubRepoPullsQueryOptions({
          repo,
          perPage: REPO_ACTIVITY_CARDS_PER_PAGE,
          sort: "updated",
          state: "open"
        }).queryKey,
        signalKeys: Array.from(pullSignalKeys)
      },
      {
        queryKey: getGithubRepoIssuesQueryOptions({
          repo,
          perPage: REPO_ACTIVITY_CARDS_PER_PAGE,
          sort: "updated",
          state: "open"
        }).queryKey,
        signalKeys: Array.from(issueSignalKeys)
      },
      {
        queryKey: getGithubRepoWorkflowRunsQueryOptions({
          repo,
          perPage: REPO_ACTIVITY_CARDS_PER_PAGE
        }).queryKey,
        signalKeys: Array.from(runSignalKeys)
      }
    ];
  }, [issuesQuery.data, owner, pullsQuery.data, repo, runsQuery.data]);
  useGitHubSignalStream(webhookRefreshTargets);

  return (
    <div className="flex w-72 flex-col gap-3">
      <ActivityCard
        title="Pull Requests"
        icon={GitPullRequestIcon}
        items={pullsQuery.data}
        viewAllHref={`/${owner}/${repo}/pulls`}
        renderItem={(pr) => <PullItem key={pr.id} pr={pr} />}
      />
      <ActivityCard
        title="Issues"
        icon={AlertCircle}
        items={issuesQuery.data}
        viewAllHref={`/${owner}/${repo}/issues`}
        actionHref={`/${owner}/${repo}/issues/new`}
        renderItem={(issue) => <IssueItem key={issue.id} issue={issue} />}
      />
      <ActivityCard
        title="Actions"
        icon={PlayCircle}
        items={runsQuery.data}
        viewAllHref={`/${owner}/${repo}/actions`}
        renderItem={(run) => <RunItem key={run.id} run={run} owner={owner} repo={repo} />}
      />
      {repoData.hasDiscussions && (
        <ActivityCard
          title="Discussions"
          icon={MessageSquare}
          items={discussions}
          count={discussionCount}
          viewAllHref={`${repoData.url}/discussions`}
          renderItem={(d) => <DiscussionItem key={d.number} discussion={d} />}
        />
      )}
    </div>
  );
}

function ActivityCard<T>({
  title,
  icon: Icon,
  items,
  count,
  viewAllHref,
  actionHref,
  renderItem
}: {
  title: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  items: T[] | undefined;
  count?: number;
  viewAllHref: string;
  actionHref?: string;
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 px-4 py-3">
        <Icon className="text-muted-foreground" size={14} strokeWidth={2} />
        <h3 className="flex-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </h3>
        {count != null && (
          <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
        )}
        {actionHref && (
          <Link
            className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground"
            to={actionHref}
          >
            <PlusIcon size={14} strokeWidth={2} />
          </Link>
        )}
      </div>
      <div className="flex flex-col">
        {!items ? (
          <ActivityCardSkeleton />
        ) : (
          <>
            {items.length === 0 ? (
              <p className="px-4 pt-6 pb-8 text-center text-xs text-muted-foreground">
                No open {title.toLowerCase()}
              </p>
            ) : (
              items.map(renderItem)
            )}
            <Link
              className="border-t px-4 py-2.5 text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              to={viewAllHref}
            >
              View all
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function PullItem({ pr }: { pr: PullSummary }) {
  const { icon: StateIcon, color } = getPrStateConfig(pr);
  const href = `/${pr.repository.owner}/${pr.repository.name}/pull/${pr.number}`;

  return (
    <Link
      className="flex items-start gap-2.5 px-4 py-2 transition-colors hover:bg-surface-1"
      to={href}
    >
      <div className={cn("mt-0.5 shrink-0", color)}>
        <StateIcon size={14} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{pr.title}</p>
        <p className="text-xs text-muted-foreground">
          #{pr.number} · {formatRelativeTime(pr.updatedAt)}
        </p>
      </div>
    </Link>
  );
}

function IssueItem({ issue }: { issue: IssueSummary }) {
  const color =
    issue.state === "closed"
      ? issue.stateReason === "not_planned"
        ? "text-muted-foreground"
        : "text-purple-500"
      : "text-green-500";
  const href = `/${issue.repository.owner}/${issue.repository.name}/issues/${issue.number}`;

  return (
    <Link
      className="flex items-start gap-2.5 px-4 py-2 transition-colors hover:bg-surface-1"
      to={href}
    >
      <div className={cn("mt-0.5 shrink-0", color)}>
        <AlertCircle size={14} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{issue.title}</p>
        <p className="text-xs text-muted-foreground">
          #{issue.number} · {formatRelativeTime(issue.updatedAt)}
        </p>
      </div>
    </Link>
  );
}

function RunItem({ run, owner, repo }: { run: WorkflowRun; owner: string; repo: string }) {
  const state = getCheckState(run);
  const href = `/${owner}/${repo}/actions/runs/${run.id}`;
  return (
    <Link
      className="flex items-start gap-2.5 px-4 py-2 transition-colors hover:bg-surface-1"
      to={href}
    >
      <div className="mt-0.5 shrink-0">
        <CheckStateIcon state={state} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{run.displayTitle}</p>
        <p className="truncate text-xs text-muted-foreground">
          #{run.runNumber} · {formatRelativeTime(run.updatedAt)}
        </p>
      </div>
    </Link>
  );
}

function DiscussionItem({ discussion }: { discussion: DiscussionSummary }) {
  return (
    <a
      className="flex items-start gap-2.5 px-4 py-2 transition-colors hover:bg-surface-1"
      href={discussion.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="mt-0.5 shrink-0 text-muted-foreground">
        <ChevronRight size={14} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{discussion.title}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {discussion.category && (
            <>
              <span>{discussion.category}</span>
              <span>·</span>
            </>
          )}
          {discussion.isAnswered && (
            <>
              <span className="text-green-500">Answered</span>
              <span>·</span>
            </>
          )}
          <span>{formatRelativeTime(discussion.updatedAt)}</span>
        </p>
      </div>
    </a>
  );
}

function ActivityCardSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-4 pb-3">
      {[0, 1, 2].map((i) => (
        <div className="flex items-start gap-2.5 py-2" key={i}>
          <div className="mt-0.5 size-3.5 shrink-0 animate-pulse rounded-full bg-surface-1" />
          <div className="flex-1">
            <div className="h-4 w-full animate-pulse rounded bg-surface-1" />
            <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-surface-1" />
          </div>
        </div>
      ))}
    </div>
  );
}
