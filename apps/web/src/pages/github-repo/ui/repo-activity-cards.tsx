import { Link } from "@tanstack/react-router";
import { GitPullRequest, PlayCircle, ShieldAlert } from "lucide-react";

import { formatRelativeTime } from "@/shared/lib/format-relative-time";

import { useGetGithubRepoActivityCardsQuery } from "@/pages/github-repo/api/get-github-repo-activity-cards.query";

export function RepoActivityCards({ repo }: { repo: string }) {
  const query = useGetGithubRepoActivityCardsQuery(repo);
  const data = query.data;

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ActivityCard
        title="Pull Requests"
        icon={<GitPullRequest className="size-4 text-muted-foreground" />}
        items={data.pullRequests.map((pr) => {
          return {
            href: pr.url,
            meta: `${pr.state} · ${formatRelativeTime(pr.updatedAt)}`,
            title: pr.title
          };
        })}
      />
      <ActivityCard
        title="Issues"
        icon={<ShieldAlert className="size-4 text-muted-foreground" />}
        items={data.issues.map((issue) => {
          return {
            href: issue.url,
            meta: `${issue.state} · ${formatRelativeTime(issue.updatedAt)}`,
            title: issue.title
          };
        })}
      />
      <ActivityCard
        title="Actions"
        icon={<PlayCircle className="size-4 text-muted-foreground" />}
        items={data.actions.map((action) => {
          return {
            href: action.url ?? "#",
            meta: `${action.status}${action.conclusion ? ` · ${action.conclusion}` : ""}`,
            title: action.name
          };
        })}
      />
    </div>
  );
}

function ActivityCard({
  icon,
  items,
  title
}: {
  icon: React.ReactNode;
  items: Array<{ href: string; meta: string; title: string }>;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-accent-foreground">{title}</h3>
      </div>
      <div className="mt-3 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <Link key={`${title}-${item.title}`} to={item.href} className="block">
              <p className="text-sm">{item.title}</p>
              <p className="mt-1 text-xs text-base-500">{item.meta}</p>
            </Link>
          ))
        ) : (
          <p className="text-sm text-base-500">No recent {title.toLowerCase()}.</p>
        )}
      </div>
    </div>
  );
}
