export type GitHubQueryScope = {
  userId: string;
};

export const githubQueryKeys = {
  all: ["github"] as const,
  viewer: (scope: GitHubQueryScope) => ["github", scope.userId, "viewer"] as const,
  repos: {
    list: (scope: GitHubQueryScope) => ["github", scope.userId, "repos", "list"] as const
  },
  pulls: {
    mine: (scope: GitHubQueryScope) => ["github", scope.userId, "pulls", "mine"] as const
  },
  issues: {
    mine: (scope: GitHubQueryScope) => ["github", scope.userId, "issues", "mine"] as const
  }
};
