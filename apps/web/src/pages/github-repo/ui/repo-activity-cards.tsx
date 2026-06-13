import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { GitPullRequestIcon, PlayCircleIcon, ShieldAlertIcon } from "@tsu-stack/icons";

import { formatRelativeTime } from "@/shared/lib/format-relative-time";

import { useGetGithubRepoActivityCardsQuery } from "@/pages/github-repo/api/get-github-repo-activity-cards.query";

export function RepoActivityCards({ owner, repo }: { owner: string; repo: string }) {
  const query = useGetGithubRepoActivityCardsQuery(owner, repo);
  const data = query.data;

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ActivityCard
        title="Pull Requests"
        icon={<GitPullRequestIcon className="size-4 text-base-400" />}
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
        icon={<ShieldAlertIcon className="size-4 text-base-400" />}
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
        icon={<PlayCircleIcon className="size-4 text-base-400" />}
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
    <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-base-200">{title}</h3>
      </div>
      <div className="mt-3 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <Link key={`${title}-${item.title}`} href={item.href} className="block">
              <p className="text-sm text-white">{item.title}</p>
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
