export const githubProfileTabs = {
  overview: "overview",
  repositories: "repositories"
} as const;

export type GithubProfileTab = (typeof githubProfileTabs)[keyof typeof githubProfileTabs];

export function resolveGithubProfileTab(tab: string | null): GithubProfileTab {
  return tab === githubProfileTabs.repositories
    ? githubProfileTabs.repositories
    : githubProfileTabs.overview;
}
