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
import { Button } from "@tsu-stack/ui/components/button";
import { Skeleton } from "@tsu-stack/ui/components/skeleton.js";
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
  username,
  repo,
  repoData
}: {
  owner: string;
  username: string;
  repo: string;
  repoData: RepoOverview;
}) {
  const pullsQuery = useGetGithubRepoPullsQuery(
    {
      repo,
      perPage: REPO_ACTIVITY_CARDS_PER_PAGE,
      sort: "updated",
      state: "open"
    },
    username
  );

  const issuesQuery = useGetGithubRepoIssuesQuery(
    {
      repo,
      perPage: REPO_ACTIVITY_CARDS_PER_PAGE,
      sort: "updated",
      state: "open"
    },
    username
  );

  const runsQuery = useGetGithubRepoWorkflowRunsQuery(
    {
      repo,
      perPage: REPO_ACTIVITY_CARDS_PER_PAGE
    },
    username
  );

  const discussionsQuery = useGetGithubRepoDiscussionsQuery(
    {
      first: REPO_ACTIVITY_CARDS_PER_PAGE,
      repo
    },
    username
  );

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
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto">
      <ActivityCard
        title="Pull requests"
        emptyLabel="No open pull requests"
        icon={GitPullRequestIcon}
        items={pullsQuery.data}
        viewAllHref={`/${owner}/${repo}/pulls`}
        renderItem={(pr) => <PullItem key={pr.id} pr={pr} />}
      />
      <ActivityCard
        title="Issues"
        emptyLabel="No open issues"
        icon={AlertCircle}
        items={issuesQuery.data}
        viewAllHref={`/${owner}/${repo}/issues`}
        actionHref={`/${owner}/${repo}/issues/new`}
        actionLabel="New issue"
        renderItem={(issue) => <IssueItem key={issue.id} issue={issue} />}
      />
      <ActivityCard
        title="Actions"
        emptyLabel="No workflow runs"
        icon={PlayCircle}
        items={runsQuery.data}
        viewAllHref={`/${owner}/${repo}/actions`}
        renderItem={(run) => <RunItem key={run.id} run={run} owner={owner} repo={repo} />}
      />
      {repoData.hasDiscussions ? (
        <ActivityCard
          title="Discussions"
          emptyLabel="No discussions"
          icon={MessageSquare}
          items={discussions}
          count={discussionCount}
          viewAllHref={`${repoData.url}/discussions`}
          viewAllExternal
          renderItem={(d) => <DiscussionItem key={d.number} discussion={d} />}
        />
      ) : null}
    </div>
  );
}

function ActivityCard<T>({
  title,
  emptyLabel,
  icon: Icon,
  items,
  count,
  viewAllHref,
  viewAllExternal,
  actionHref,
  actionLabel,
  renderItem
}: {
  title: string;
  emptyLabel: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  items: T[] | undefined;
  count?: number;
  viewAllHref: string;
  viewAllExternal?: boolean;
  actionHref?: string;
  actionLabel?: string;
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <section className="w-full min-w-0 border-b border-border last:border-b-0">
      <header className="flex items-center gap-2 px-3.5 pt-3 pb-1.5">
        <Icon className="shrink-0 text-muted-foreground" size={15} strokeWidth={1.75} />
        <h3 className="min-w-0 flex-1 text-sm font-medium tracking-tight">{title}</h3>
        {count != null ? (
          <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
        ) : null}
        {actionHref ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={actionLabel ?? `New ${title}`}
            render={<Link to={actionHref} />}
          >
            <PlusIcon strokeWidth={2} />
          </Button>
        ) : null}
      </header>
      <div className="flex flex-col pb-2">
        {!items ? (
          <ActivityCardSkeleton />
        ) : items.length === 0 ? (
          <p className="px-3.5 py-2 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="flex flex-col">{items.map(renderItem)}</ul>
        )}
        {items ? (
          <div className="px-3.5 pt-1">
            <ViewAllLink href={viewAllHref} external={viewAllExternal} label={title} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ViewAllLink({
  href,
  external,
  label
}: {
  href: string;
  external?: boolean;
  label: string;
}) {
  const className =
    "inline-flex h-8 items-center text-sm font-medium text-foreground/80 transition-colors hover:text-foreground";
  const text = `View all ${label.toLowerCase()}`;
  if (external) {
    return (
      <a className={className} href={href} rel="noopener noreferrer" target="_blank">
        {text}
      </a>
    );
  }
  return (
    <Link className={className} to={href}>
      {text}
    </Link>
  );
}

/** Shared list row — same inline inset as the header, hover fills the card. */
const activityRowClassName =
  "flex w-full min-w-0 items-start gap-2.5 px-3.5 py-1.5 transition-colors hover:bg-muted/50";

function PullItem({ pr }: { pr: PullSummary }) {
  const { icon: StateIcon, color } = getPrStateConfig(pr);
  const href = `/${pr.repository.owner}/${pr.repository.name}/pull/${pr.number}`;

  return (
    <li>
      <Link className={activityRowClassName} to={href}>
        <span className={cn("mt-0.5 shrink-0", color)}>
          <StateIcon size={14} strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm leading-snug">{pr.title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
            #{pr.number} · {formatRelativeTime(pr.updatedAt)}
          </span>
        </span>
      </Link>
    </li>
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
    <li>
      <Link className={activityRowClassName} to={href}>
        <span className={cn("mt-0.5 shrink-0", color)}>
          <AlertCircle size={14} strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm leading-snug">{issue.title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
            #{issue.number} · {formatRelativeTime(issue.updatedAt)}
          </span>
        </span>
      </Link>
    </li>
  );
}

function RunItem({ run, owner, repo }: { run: WorkflowRun; owner: string; repo: string }) {
  const state = getCheckState(run);
  const href = `/${owner}/${repo}/actions/runs/${run.id}`;
  return (
    <li>
      <Link className={activityRowClassName} to={href}>
        <span className="mt-0.5 shrink-0">
          <CheckStateIcon state={state} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm leading-snug">{run.displayTitle}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
            #{run.runNumber} · {formatRelativeTime(run.updatedAt)}
          </span>
        </span>
      </Link>
    </li>
  );
}

function DiscussionItem({ discussion }: { discussion: DiscussionSummary }) {
  return (
    <li>
      <a
        className={activityRowClassName}
        href={discussion.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          <ChevronRight size={14} strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm leading-snug">{discussion.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
            {discussion.category ? (
              <>
                <span>{discussion.category}</span>
                <span aria-hidden>·</span>
              </>
            ) : null}
            {discussion.isAnswered ? (
              <>
                <span className="text-green-500">Answered</span>
                <span aria-hidden>·</span>
              </>
            ) : null}
            <span>{formatRelativeTime(discussion.updatedAt)}</span>
          </span>
        </span>
      </a>
    </li>
  );
}

function ActivityCardSkeleton() {
  return (
    <div className="flex flex-col">
      {[0, 1, 2].map((i) => (
        <div className="flex items-start gap-2.5 px-3.5 py-1.5" key={i}>
          <Skeleton className="mt-0.5 size-3.5 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="mt-1.5 h-3 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
