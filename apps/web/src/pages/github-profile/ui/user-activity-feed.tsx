import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import {
  CircleIcon,
  GitBranchIcon,
  GitCommitIcon,
  GitForkIcon,
  GitPullRequestIcon,
  MessageSquareIcon,
  StarIcon
} from "@tsu-stack/icons";

import { type GithubActivityQueryResult } from "@/pages/github-profile/api/get-github-activity.query";

type UserActivityFeedProps = {
  events: GithubActivityQueryResult;
};

export function UserActivityFeed({ events }: UserActivityFeedProps) {
  if (events.length === 0) {
    return <p className="py-6 text-center text-sm text-base-400">No recent activity.</p>;
  }

  const groups = buildMonthGroups(events);

  return (
    <div className="relative flex flex-col px-3 before:absolute before:top-0 before:left-5.25 before:h-full before:w-px before:bg-linear-to-b before:from-white/15 before:to-transparent">
      {groups.map((group, groupIndex) => (
        <div key={group.label}>
          <div
            className={
              groupIndex === 0 ? "relative z-10 pt-4 pb-2 pl-5" : "relative z-10 pt-5 pb-2 pl-5"
            }
          >
            <span className="inline-block rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-base-400">
              {group.label}
            </span>
          </div>
          {group.events.map((event) => (
            <ActivityEventRow event={event} key={event.id} />
          ))}
        </div>
      ))}
    </div>
  );
}

function buildMonthGroups(events: GithubActivityQueryResult) {
  const groups = new Map<string, GithubActivityQueryResult>();
  const sortedEvents = Array.from(events);
  sortedEvents.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  for (const event of sortedEvents) {
    const label = new Date(event.createdAt).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });

    const existing = groups.get(label);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(label, [event]);
    }
  }

  return Array.from(groups.entries()).map(([label, groupedEvents]) => {
    return {
      events: groupedEvents,
      label
    };
  });
}

function ActivityEventRow({ event }: { event: GithubActivityQueryResult[number] }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#0d1117]">
        {getEventIcon(event)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-px">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] text-base-400">{getEventDescription(event)}</span>
          <span className="shrink-0 text-xs text-base-500">
            {formatRelativeTime(event.createdAt)}
          </span>
        </div>
        {event.prDetail ? (
          <Link
            href={event.prDetail.url}
            className="rounded-xl border border-white/8 bg-white/4 p-3"
          >
            <p className="text-xs font-medium text-white">{event.prDetail.title}</p>
            <p className="mt-1 text-[11px] text-base-400">
              PR #{event.prDetail.number} · {event.prDetail.state}
            </p>
          </Link>
        ) : null}
        {event.issueDetail ? (
          <a
            href={event.issueDetail.url}
            className="rounded-xl border border-white/8 bg-white/4 p-3"
          >
            <p className="text-xs font-medium text-white">{event.issueDetail.title}</p>
            <p className="mt-1 text-[11px] text-base-400">
              Issue #{event.issueDetail.number} · {event.issueDetail.state}
            </p>
          </a>
        ) : null}
        {!event.prDetail && !event.issueDetail && event.commentBody ? (
          <p className="line-clamp-2 text-xs text-base-500">{event.commentBody}</p>
        ) : null}
      </div>
    </div>
  );
}

function getEventIcon(event: GithubActivityQueryResult[number]) {
  const className = "text-base-400 size-3";

  switch (event.type) {
    case "PushEvent":
      return <GitCommitIcon className={className} />;
    case "CreateEvent":
    case "DeleteEvent":
      return <GitBranchIcon className={className} />;
    case "PullRequestEvent":
    case "PullRequestReviewEvent":
      return <GitPullRequestIcon className={className} />;
    case "IssueCommentEvent":
    case "IssuesEvent":
      return <MessageSquareIcon className={className} />;
    case "WatchEvent":
      return <StarIcon className={className} />;
    case "ForkEvent":
      return <GitForkIcon className={className} />;
    default:
      return <CircleIcon className={className} />;
  }
}

function getEventDescription(event: GithubActivityQueryResult[number]) {
  const repo = (
    <Link href={event.repo.url} className="font-medium text-white hover:underline">
      {event.repo.name}
    </Link>
  );

  switch (event.type) {
    case "CreateEvent":
      return (
        <>
          Created {event.refType ?? "resource"}{" "}
          {event.ref ? <span className="text-white">{event.ref}</span> : null} in {repo}
        </>
      );
    case "DeleteEvent":
      return (
        <>
          Deleted {event.refType ?? "resource"}{" "}
          {event.ref ? <span className="text-white">{event.ref}</span> : null} in {repo}
        </>
      );
    case "PullRequestEvent":
      return (
        <>
          {capitalize(event.action)} PR <span className="text-white">{event.title}</span> in {repo}
        </>
      );
    case "IssuesEvent":
      return (
        <>
          {capitalize(event.action)} issue <span className="text-white">{event.title}</span> in{" "}
          {repo}
        </>
      );
    case "IssueCommentEvent":
      return (
        <>
          Commented on <span className="text-white">{event.title}</span> in {repo}
        </>
      );
    case "WatchEvent":
      return <>Starred {repo}</>;
    case "ForkEvent":
      return <>Forked {repo}</>;
    case "PushEvent":
      return (
        <>
          Pushed {(event.commits?.length ?? 0) || 1} commit
          {(event.commits?.length ?? 0) === 1 ? "" : "s"} to {repo}
        </>
      );
    default:
      return (
        <>
          {event.type.replace("Event", "")} in {repo}
        </>
      );
  }
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));

  if (diffDays >= 365) {
    return `${Math.round(diffDays / 365)}y`;
  }
  if (diffDays >= 30) {
    return `${Math.round(diffDays / 30)}mo`;
  }
  if (diffDays >= 7) {
    return `${Math.round(diffDays / 7)}w`;
  }

  return `${diffDays}d`;
}

function capitalize(value: string | null) {
  if (!value) {
    return "Updated";
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
