import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CircleDot,
  Code,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  RefreshCw,
  UserCircle
} from "lucide-react";
import { useSyncExternalStore } from "react";

import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import {
  type IssueSummary,
  type MyIssuesResult,
  type MyPullsResult,
  type PullSummary
} from "@tsu-stack/github";
import { type GitHubUserRepoSummary } from "@tsu-stack/github/types";

import { sessionUsernameFromUser } from "@/shared/lib/session-username";

import { githubQueryKeys } from "@/lib/github.query";

import { getRegisteredCommands, subscribeCommands } from "./registry";
import { type CommandItem } from "./types";
import { useRefreshGitHubData } from "./use-refresh-github-data";

function sessionUsername(user: unknown): string | undefined {
  return sessionUsernameFromUser(user) ?? undefined;
}

function getPrIcon(pr: PullSummary) {
  if (pr.isDraft) {
    return {
      icon: GitPullRequestDraft,
      iconClassName: "text-muted-foreground"
    };
  }
  if (pr.mergedAt) {
    return { icon: GitMerge, iconClassName: "text-purple-500" };
  }
  if (pr.state === "closed") {
    return { icon: GitPullRequestClosed, iconClassName: "text-red-500" };
  }
  return { icon: GitPullRequest, iconClassName: "text-green-500" };
}

function getIssueIcon(issue: IssueSummary) {
  if (issue.state === "closed") {
    if (issue.stateReason === "not_planned") {
      return { icon: CircleDot, iconClassName: "text-muted-foreground" };
    }
    return { icon: CircleDot, iconClassName: "text-purple-500" };
  }
  return { icon: CircleDot, iconClassName: "text-green-500" };
}

export function useCommandItems(): CommandItem[] {
  const { data: user } = useQuery(getAuthUserQueryOptions());
  const isSignedIn = !!user;
  const scope = { userId: user?.id ?? "" };
  const queryClient = useQueryClient();
  const refreshGitHubData = useRefreshGitHubData();

  const staticCommands = useSyncExternalStore(
    subscribeCommands,
    getRegisteredCommands,
    getRegisteredCommands
  );

  const repos = queryClient.getQueryData<GitHubUserRepoSummary[]>(
    githubQueryKeys.repos.list(scope)
  );
  const pulls = queryClient.getQueryData<MyPullsResult>(githubQueryKeys.pulls.mine(scope));
  const issues = queryClient.getQueryData<MyIssuesResult>(githubQueryKeys.issues.mine(scope));
  const viewer = queryClient.getQueryData<{ login: string } | null>(githubQueryKeys.viewer(scope));

  const username = sessionUsername(user) ?? viewer?.login;

  const visibleStatic = staticCommands.filter((cmd) => {
    if (cmd.authRequired && !isSignedIn) return false;
    return true;
  });

  const dynamicItems: CommandItem[] = [];

  if (username) {
    dynamicItems.push({
      id: "nav:profile",
      label: "Go to Profile",
      group: "Pages",
      icon: UserCircle,
      keywords: ["user", "me", "profile", username],
      // P taken by Projects → proFile
      shortcut: ["D", "F"],
      action: {
        type: "navigate",
        to: `/${username}`
      }
    });
    dynamicItems.push({
      id: "nav:repos",
      label: "Go to Repositories",
      group: "Pages",
      icon: Archive,
      keywords: ["repos", "code", "github", "repositories", username],
      shortcut: ["D", "R"],
      action: {
        type: "navigate",
        to: `/${username}/repos`
      }
    });
  } else if (!isSignedIn) {
    // Guest without a resolved profile — still expose path-mode repos list if on primary host root.
    dynamicItems.push({
      id: "nav:repos",
      label: "Go to Repositories",
      group: "Pages",
      icon: Archive,
      keywords: ["repos", "code", "github", "repositories"],
      shortcut: ["D", "R"],
      action: {
        type: "navigate",
        to: "/repos"
      }
    });
  }

  if (isSignedIn) {
    dynamicItems.push({
      id: "action:refresh-data",
      label: "Refresh data",
      group: "Actions",
      icon: RefreshCw,
      keywords: ["refresh", "reload", "clear cache", "stale", "sync"],
      action: {
        type: "execute",
        fn: () => {
          void refreshGitHubData();
        }
      }
    });
  }

  if (repos) {
    for (const repo of repos) {
      dynamicItems.push({
        id: `repo:${repo.id}`,
        label: repo.fullName,
        group: "Repositories",
        icon: Code,
        keywords: [repo.name, repo.owner, repo.language ?? ""].filter(Boolean),
        action: {
          type: "navigate",
          to: `/${repo.owner}/repos/${repo.name}`
        },
        meta: {
          language: repo.language ?? undefined,
          stars: repo.stars,
          updatedAt: repo.updatedAt ?? undefined
        }
      });
    }
  }

  if (pulls) {
    const seen = new Set<number>();
    const allPulls = [
      ...pulls.authored,
      ...pulls.assigned,
      ...pulls.reviewRequested,
      ...pulls.mentioned,
      ...pulls.involved
    ];
    for (const pr of allPulls) {
      if (seen.has(pr.id)) continue;
      seen.add(pr.id);
      const prState = getPrIcon(pr);
      dynamicItems.push({
        id: `pull:${pr.id}`,
        label: `#${pr.number} ${pr.title}`,
        group: "Pull Requests",
        icon: prState.icon,
        iconClassName: prState.iconClassName,
        keywords: [
          pr.repository.name,
          pr.repository.owner,
          pr.author?.login ?? "",
          String(pr.number)
        ].filter(Boolean),
        action: {
          type: "navigate",
          to: `/${pr.repository.owner}/${pr.repository.name}/pull/${pr.number}`
        },
        meta: {
          repo: pr.repository.fullName,
          comments: pr.comments,
          updatedAt: pr.updatedAt
        }
      });
    }
  }

  if (issues) {
    const seen = new Set<number>();
    const allIssues = [...issues.authored, ...issues.assigned, ...issues.mentioned];
    for (const issue of allIssues) {
      if (seen.has(issue.id)) continue;
      seen.add(issue.id);
      const issueState = getIssueIcon(issue);
      dynamicItems.push({
        id: `issue:${issue.id}`,
        label: `#${issue.number} ${issue.title}`,
        group: "Issues",
        icon: issueState.icon,
        iconClassName: issueState.iconClassName,
        keywords: [
          issue.repository.name,
          issue.repository.owner,
          issue.author?.login ?? "",
          String(issue.number)
        ].filter(Boolean),
        action: {
          type: "navigate",
          to: `/${issue.repository.owner}/${issue.repository.name}/issues/${issue.number}`
        },
        meta: {
          repo: issue.repository.fullName,
          comments: issue.comments,
          updatedAt: issue.updatedAt
        }
      });
    }
  }

  dynamicItems.sort((a, b) => {
    // Keep Pages ahead of data groups; within data, newest first.
    const groupOrder = (g: string) => {
      if (g === "Pages") return 0;
      if (g === "Actions") return 1;
      return 2;
    };
    const groupCmp = groupOrder(a.group) - groupOrder(b.group);
    if (groupCmp !== 0) return groupCmp;
    const aTime = a.meta?.updatedAt ?? "";
    const bTime = b.meta?.updatedAt ?? "";
    return bTime.localeCompare(aTime);
  });

  return [...visibleStatic, ...dynamicItems];
}
