import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown, Eye, Filter, Lock } from "lucide-react";
import { useQueryState } from "nuqs";
import { createElement, useEffect, useMemo, useRef } from "react";

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { type GitHubUserRepoSummary } from "@tsu-stack/github/types";
import { Button } from "@tsu-stack/ui/components/button";

import {
  REPO_LIST_PAGE_SIZE,
  repoListHasNextPage,
  repoListPageQueryParser,
  safeRepoListPage
} from "@/shared/lib/repo-list-utils";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { RepositoryRow } from "@/shared/ui/repository-row";

import { useGetGithubSetupStatusQuery } from "@/features/github";

import { githubReposHubQueryOptions } from "@/pages/github-repos/api/get-github-repos-hub.query";
import { type ReposHubInput } from "@/pages/github-repos/lib/repos-hub-filter";
import { FilterBar } from "@/pages/github-repos/ui/filter-bar";
import { type SerializedFilterStore } from "@/pages/github-repos/ui/filter-cookie";
import {
  useListFilters,
  type FilterableItem,
  type FilterDefinition,
  type SortOption
} from "@/pages/github-repos/ui/use-list-filters";

type RepositoryFilterItem = FilterableItem & {
  repo: GitHubUserRepoSummary;
  isPrivate: boolean;
};

const repositoryFilterDefs: FilterDefinition[] = [
  {
    id: "visibility",
    label: "Visibility",
    icon: Filter,
    extractOptions: () => [
      {
        value: "public",
        label: "Public",
        icon: createElement(Eye, {
          size: 14,
          className: "text-muted-foreground"
        })
      },
      {
        value: "private",
        label: "Private",
        icon: createElement(Lock, {
          size: 14,
          className: "text-muted-foreground"
        })
      }
    ],
    match: (item, values) => values.has(asRepo(item).isPrivate ? "private" : "public")
  }
];

const repositorySortOptions: SortOption[] = [
  {
    id: "updated",
    label: "Recently updated",
    compare: (a, b) => getTime(b.updatedAt) - getTime(a.updatedAt)
  },
  {
    id: "created",
    label: "Newest first",
    compare: (a, b) => getTime(b.createdAt) - getTime(a.createdAt)
  },
  {
    id: "created-asc",
    label: "Oldest first",
    compare: (a, b) => getTime(a.createdAt) - getTime(b.createdAt)
  },
  {
    id: "title",
    label: "Title A-Z",
    compare: (a, b) => a.title.localeCompare(b.title)
  }
];

const EMPTY_REPO_ITEMS: RepositoryFilterItem[] = [];

export function RepositoriesPage({ filterStore }: { filterStore: SerializedFilterStore }) {
  const setupStatusQuery = useGetGithubSetupStatusQuery();

  const [page, setPage] = useQueryState("page", repoListPageQueryParser);

  const filterState = useListFilters({
    pageId: "repos",
    items: EMPTY_REPO_ITEMS,
    filterDefs: repositoryFilterDefs,
    sortOptions: repositorySortOptions,
    defaultSortId: "updated",
    initialStore: filterStore
  });

  const [debouncedSearch] = useDebouncedValue(filterState.searchQuery, 300);

  const visibilityValues = useMemo(() => {
    const filter = filterState.activeFilters.find(
      (candidate) => candidate.fieldId === "visibility"
    );
    return filter ? [...filter.values].toSorted() : [];
  }, [filterState.activeFilters]);

  const limit = (page ?? 1) * REPO_LIST_PAGE_SIZE;

  const hubInput: ReposHubInput = useMemo(() => {
    return {
      searchQuery: debouncedSearch,
      visibility: visibilityValues,
      sortId: filterState.sortId,
      limit
    };
  }, [debouncedSearch, visibilityValues, filterState.sortId, limit]);

  const { user } = useAuth();
  const isPrivate = !!user;

  const hubQuery = useQuery({
    ...githubReposHubQueryOptions(hubInput, isPrivate),
    placeholderData: keepPreviousData
  });

  const reposFilterSignature = useMemo(() => {
    const filterParts = filterState.activeFilters
      .map((filter) => `${filter.fieldId}:${[...filter.values].toSorted().join(",")}`)
      .toSorted()
      .join("|");
    return `${debouncedSearch}\0${filterState.sortId}\0${filterParts}`;
  }, [debouncedSearch, filterState.sortId, filterState.activeFilters]);

  const prevFilterSignature = useRef(reposFilterSignature);
  useEffect(() => {
    if (prevFilterSignature.current !== reposFilterSignature) {
      prevFilterSignature.current = reposFilterSignature;
      void setPage(null);
    }
  }, [reposFilterSignature, setPage]);

  const matchingCount = hubQuery.data?.matchingCount ?? 0;
  const safePage = safeRepoListPage(page ?? 1, matchingCount);

  useEffect(() => {
    if (!hubQuery.isSuccess || hubQuery.data === undefined) return;
    const safe = safeRepoListPage(page ?? 1, hubQuery.data.matchingCount);
    if ((page ?? 1) !== safe) {
      void setPage(safe === 1 ? null : safe);
    }
  }, [hubQuery.isSuccess, hubQuery.data, page, setPage]);

  if (hubQuery.error) throw hubQuery.error;

  if (!setupStatusQuery.data?.isConfigured || !setupStatusQuery.data.owner) {
    return (
      <div className="h-full overflow-auto py-10">
        <div className="mx-auto grid max-w-7xl gap-14 px-3 md:px-6 xl:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)]">
          <aside className="flex h-fit flex-col gap-5 xl:sticky xl:top-0">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Repositories</h1>
              <p className="text-sm text-muted-foreground">
                Browse and filter the repositories you can access.
              </p>
            </div>
          </aside>
          <p className="py-12 text-center text-sm text-muted-foreground">No repositories found.</p>
        </div>
      </div>
    );
  }

  const hub = hubQuery.data;
  const totals = hub?.totals ?? { all: 0, public: 0, private: 0 };
  const displayedRepos = hub?.repos ?? [];

  return (
    <div className="h-full overflow-auto py-10">
      <div className="mx-auto grid max-w-7xl gap-14 px-3 md:px-6 xl:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)]">
        <aside className="flex h-fit flex-col gap-5 xl:sticky xl:top-0">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Repositories</h1>
            <p className="text-sm text-muted-foreground">
              Browse and filter the repositories you can access.
            </p>
          </div>
        </aside>

        <div className="flex flex-col gap-2">
          <FilterBar state={filterState} searchPlaceholder="Search by title..." />

          {totals.all === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No repositories found.
            </p>
          ) : matchingCount === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No repositories match these filters.
            </p>
          ) : (
            <>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-1">
                {displayedRepos.map((repo) => (
                  <div
                    key={repo.id}
                    style={{
                      contentVisibility: "auto",
                      containIntrinsicSize: "auto 72px"
                    }}
                  >
                    <RepositoryRow repo={repo} />
                  </div>
                ))}
              </div>
              {repoListHasNextPage(safePage, matchingCount) ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mx-auto mt-6 rounded-full"
                  onClick={() => {
                    void setPage(safePage + 1);
                  }}
                >
                  <ChevronDown size={14} strokeWidth={2} />
                  Load more
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function asRepo(item: FilterableItem) {
  return item as RepositoryFilterItem;
}

function getTime(value: unknown) {
  return typeof value === "string" ? Date.parse(value) || 0 : 0;
}
