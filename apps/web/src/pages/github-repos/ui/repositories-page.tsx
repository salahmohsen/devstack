import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown, Eye, Filter, Lock } from "lucide-react";
import { useQueryState } from "nuqs";
import { createElement, useEffect, useMemo, useRef } from "react";

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { type GitHubUserRepoSummary } from "@tsu-stack/github/types";
import { Button } from "@tsu-stack/ui/components/button";
import { Card } from "@tsu-stack/ui/components/card.js";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FrameTitle
} from "@tsu-stack/ui/components/frame.js";
import { Skeleton } from "@tsu-stack/ui/components/skeleton.js";

import { surfaceFromRouteMode, type PublicSurfaceMode } from "@/shared/lib/public-surface";
import {
  REPO_LIST_PAGE_SIZE,
  repoListHasNextPage,
  repoListPageQueryParser,
  safeRepoListPage
} from "@/shared/lib/repo-list-utils";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { DefaultLoader } from "@/shared/ui/default-loader";
import { RepositoryRow } from "@/shared/ui/repository-row";

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

export function RepositoriesPage({
  filterStore,
  username,
  surfaceMode = "path"
}: {
  filterStore: SerializedFilterStore;
  /** Portfolio profile that owns this public/private repos list */
  username: string;
  /** custom_domain → row links use `/repos/$repo` (no profile segment). */
  surfaceMode?: PublicSurfaceMode;
}) {
  const surface = surfaceFromRouteMode(username, surfaceMode);
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
  const sessionUsername =
    typeof (user as { username?: string } | null)?.username === "string"
      ? (user as { username: string }).username
      : null;
  const isOwnProfile = Boolean(user && sessionUsername === username);
  const isAdmin = isOwnProfile;

  const hubQuery = useQuery({
    ...githubReposHubQueryOptions(hubInput, isOwnProfile, username),
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

  const hub = hubQuery.data;
  const totals = hub?.totals ?? { all: 0, public: 0, private: 0 };
  const displayedRepos = hub?.repos ?? [];

  if (hubQuery.isLoading) <DefaultLoader />;

  return (
    <Frame className="mx-auto h-full w-full max-w-7xl gap-5 bg-background p-5 px-3 md:px-6">
      <FrameHeader className="m-0 max-h-fit p-0 pt-5 pb-0">
        <FrameTitle>Repositories</FrameTitle>
        <FrameDescription>Repositories for @{username}.</FrameDescription>
      </FrameHeader>
      <div className="flex flex-col gap-3">
        <FilterBar state={filterState} searchPlaceholder="Search by title..." />

        {hubQuery.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card
              key={i}
              render={
                <div className="flex min-h-18 w-full flex-col items-center justify-between gap-x-4 p-3 md:flex-row md:gap-y-1">
                  <Skeleton className="h-5 w-1/4" />
                  <div className="flex w-1/3 flex-col gap-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-full w-1/6 self-end rounded-lg" />
                </div>
              }
            />
          ))
        ) : totals.all === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No repositories found.</p>
        ) : matchingCount === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No repositories match these filters.
          </p>
        ) : (
          <>
            {displayedRepos.map((repo) => (
              <RepositoryRow
                key={repo.id}
                style={{
                  contentVisibility: "auto",
                  containIntrinsicSize: "auto 72px"
                }}
                repo={repo}
                isAdmin={isAdmin}
                username={username}
                surface={surface}
              />
            ))}
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
    </Frame>
  );
}

function asRepo(item: FilterableItem) {
  return item as RepositoryFilterItem;
}

function getTime(value: unknown) {
  return typeof value === "string" ? Date.parse(value) || 0 : 0;
}
