import { useQuery } from "@tanstack/react-query";

import { type RepoOverview } from "@tsu-stack/github/schemas";
import { GitBranchIcon, GitForkIcon, StarIcon, ViewIcon } from "@tsu-stack/icons";
import { Badge } from "@tsu-stack/ui/components/badge";
import {
  DetailSidebar,
  DetailSidebarRow,
  DetailSidebarSection
} from "@tsu-stack/ui/components/detail-sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@tsu-stack/ui/components/tooltip";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";

import {
  type GitHubQueryScope,
  githubRepoContributorsQueryOptions
} from "@/pages/github-repo/api/get-github-repo-contributors.query";

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function RepoSidebar({ repo, scope }: { repo: RepoOverview; scope?: GitHubQueryScope }) {
  return (
    <DetailSidebar>
      {/* About */}
      {repo.description && (
        <DetailSidebarSection title="About">
          <p className="text-sm text-foreground">{repo.description}</p>
        </DetailSidebarSection>
      )}

      {/* Topics */}
      {repo.topics.length > 0 && (
        <DetailSidebarSection title="Topics">
          <div className="flex flex-wrap gap-1.5">
            {repo.topics.map((topic) => (
              <Badge
                key={topic}
                variant="secondary"
                className="rounded-full px-2.5 py-0.5 text-xs font-normal"
              >
                {topic}
              </Badge>
            ))}
          </div>
        </DetailSidebarSection>
      )}

      {/* Stats */}
      <DetailSidebarSection title="Stats">
        <DetailSidebarRow icon={StarIcon} label="Stars">
          {formatCount(repo.stars)}
        </DetailSidebarRow>
        <DetailSidebarRow icon={ViewIcon} label="Watching">
          {formatCount(repo.watchers)}
        </DetailSidebarRow>
        <DetailSidebarRow icon={GitForkIcon} label="Forks">
          {formatCount(repo.forks)}
        </DetailSidebarRow>
        <DetailSidebarRow icon={GitBranchIcon} label="Branches">
          {repo.branchCount}
        </DetailSidebarRow>
      </DetailSidebarSection>

      {/* Details */}
      <DetailSidebarSection title="Details">
        {repo.language && <DetailSidebarRow label="Language">{repo.language}</DetailSidebarRow>}
        {repo.license && <DetailSidebarRow label="License">{repo.license}</DetailSidebarRow>}
      </DetailSidebarSection>

      {/* Contributors */}
      <ContributorsSection repo={repo} scope={scope} />
    </DetailSidebar>
  );
}

function ContributorsSection({ repo, scope }: { repo: RepoOverview; scope?: GitHubQueryScope }) {
  const hasMounted = useIsClient();
  const contributorsQuery = useQuery({
    ...githubRepoContributorsQueryOptions(scope ?? { userId: "" }, {
      owner: repo.owner,
      repo: repo.name
    }),
    enabled: hasMounted
  });

  const data = contributorsQuery.data;
  if (!data) return null;

  return (
    <DetailSidebarSection title="Contributors" titleRight={formatCount(data.totalCount)}>
      <div className="flex flex-col gap-1 pt-1.5">
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {data.contributors.map((c) => (
              <Tooltip key={c.login}>
                <TooltipTrigger
                  render={
                    <a
                      href={`https://github.com/${c.login}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={c.login}
                    />
                  }
                >
                  <img
                    src={c.avatarUrl}
                    alt={c.login}
                    className="size-7 rounded-full transition-opacity hover:opacity-80"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {c.login} · {formatCount(c.contributions)} commits
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        {data.totalCount > data.contributors.length && (
          <span className="text-xs text-muted-foreground">
            + {formatCount(data.totalCount - data.contributors.length)} more
          </span>
        )}
      </div>
    </DetailSidebarSection>
  );
}
