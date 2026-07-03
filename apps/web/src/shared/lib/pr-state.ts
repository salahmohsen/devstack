import {
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
  type LucideIcon
} from "lucide-react";

export type PrStateTone = "open" | "closed" | "merged" | "muted";

export type PrStateConfig = {
  icon: LucideIcon;
  color: string;
  label: string;
  tone: PrStateTone;
};

export function getPrStateConfig(pr: {
  isDraft: boolean;
  state: string;
  isMerged?: boolean;
  mergedAt?: string | null;
}): PrStateConfig {
  if (pr.isDraft) {
    return {
      color: "text-muted-foreground",
      icon: GitPullRequestDraftIcon,
      label: "Draft",
      tone: "muted"
    };
  }
  if (pr.isMerged || pr.mergedAt || pr.state === "merged") {
    return {
      color: "text-purple-500",
      icon: GitMergeIcon,
      label: "Merged",
      tone: "merged"
    };
  }
  if (pr.state === "closed") {
    return {
      color: "text-red-500",
      icon: GitPullRequestClosedIcon,
      label: "Closed",
      tone: "closed"
    };
  }
  return {
    color: "text-green-500",
    icon: GitPullRequestIcon,
    label: "Open",
    tone: "open"
  };
}
