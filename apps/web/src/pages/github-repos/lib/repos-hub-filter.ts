import { type GitHubUserRepoSummary } from "@tsu-stack/github/types";

import { REPO_LIST_PAGE_SIZE } from "@/shared/lib/repo-list-utils";

import { type SerializedFilterStore } from "@/pages/github-repos/ui/filter-cookie";

const REPOS_FILTER_PAGE_ID = "repos";
const DEFAULT_REPOS_SORT = "updated";
const VALID_REPOS_SORT_IDS = new Set(["updated", "created", "created-asc", "title"]);

export type ReposHubResult = {
  totals: { all: number; public: number; private: number };
  matchingCount: number;
  repos: GitHubUserRepoSummary[];
};

export type ReposHubInput = {
  searchQuery: string;
  visibility: string[];
  sortId: string;
  limit: number;
};

export function buildReposHubPrefetchInput(
  filterStore: SerializedFilterStore,
  urlPage: number
): ReposHubInput {
  const raw = filterStore[REPOS_FILTER_PAGE_ID];
  const searchQuery = raw && typeof raw === "object" ? raw.searchQuery : "";
  let sortId = raw && typeof raw === "object" ? raw.sortId : DEFAULT_REPOS_SORT;
  if (!VALID_REPOS_SORT_IDS.has(sortId)) sortId = DEFAULT_REPOS_SORT;

  const visibility: string[] = [];
  if (raw && typeof raw === "object" && Array.isArray(raw.activeFilters)) {
    for (const filter of raw.activeFilters) {
      if (
        typeof filter === "object" &&
        filter !== null &&
        filter.fieldId === "visibility" &&
        Array.isArray(filter.values)
      ) {
        for (const value of filter.values) {
          if (typeof value === "string") visibility.push(value);
        }
      }
    }
  }
  visibility.sort();

  const page = Number.isFinite(urlPage) && urlPage > 0 ? Math.min(Math.floor(urlPage), 10_000) : 1;

  return {
    searchQuery,
    visibility,
    sortId,
    limit: page * REPO_LIST_PAGE_SIZE
  };
}

export function buildReposHubResult(
  repos: GitHubUserRepoSummary[],
  input: ReposHubInput
): ReposHubResult {
  const totals = {
    all: repos.length,
    public: repos.filter((repo) => !repo.isPrivate).length,
    private: repos.filter((repo) => repo.isPrivate).length
  };
  const filteredRepos = filterUserRepoSummaries(repos, input);

  return {
    totals,
    matchingCount: filteredRepos.length,
    repos: filteredRepos.slice(0, input.limit)
  };
}

function getTime(value: string | null): number {
  return value ? Date.parse(value) || 0 : 0;
}

const sortCompare: Record<string, (a: GitHubUserRepoSummary, b: GitHubUserRepoSummary) => number> =
  {
    updated: (a, b) => getTime(b.updatedAt) - getTime(a.updatedAt),
    created: (a, b) => getTime(b.createdAt) - getTime(a.createdAt),
    "created-asc": (a, b) => getTime(a.createdAt) - getTime(b.createdAt),
    title: (a, b) => a.name.localeCompare(b.name)
  };

export function filterUserRepoSummaries(
  repos: GitHubUserRepoSummary[],
  input: Omit<ReposHubInput, "limit">
): GitHubUserRepoSummary[] {
  let result = repos;
  const query = input.searchQuery.toLowerCase().trim();
  if (query) {
    result = result.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        repo.fullName.toLowerCase().includes(query) ||
        repo.owner.toLowerCase().includes(query) ||
        (repo.description?.toLowerCase().includes(query) ?? false)
    );
  }
  if (input.visibility.length > 0) {
    const visibility = new Set(input.visibility);
    result = result.filter((repo) => visibility.has(repo.isPrivate ? "private" : "public"));
  }
  const sortFn = sortCompare[input.sortId] ?? sortCompare.updated;
  return [...result].toSorted(sortFn);
}
