import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryState } from "nuqs";
import { createElement, useEffect, useMemo, useRef } from "react";

import { ChevronDownIcon, FilterIcon, LockIcon, ViewIcon } from "@tsu-stack/icons";
import { Button } from "@tsu-stack/ui/components/button";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { generateAppSeo } from "@/shared/lib/seo";

import { getGithubSetupStatusQueryOptions, useGetGithubSetupStatusQuery } from "@/features/github";

import {
  type FilterableItem,
  FilterBar,
  type FilterDefinition,
  getFilterCookie,
  githubReposHubQueryOptions,
  REPO_LIST_PAGE_SIZE,
  repoListHasNextPage,
  repoListPageQueryParser,
  type ReposHubInput,
  RepositoryRow,
  safeRepoListPage,
  type SortOption,
  useDebouncedValue,
  useListFilters,
  type UserRepoSummary
} from "@/pages/github-repos";
import { buildReposHubPrefetchInput } from "@/pages/github-repos/lib/repos-hub-filter";

export const Route = createFileRoute("/{-$locale}/(layout)/repos/")({
  validateSearch: (raw: Record<string, unknown>): { page?: number } => {
    const pageRaw = raw.page;
    if (typeof pageRaw === "number" && Number.isFinite(pageRaw) && pageRaw > 0) {
      return { page: Math.floor(pageRaw) };
    }
    if (typeof pageRaw === "string" && pageRaw.length > 0) {
      const n = Number.parseInt(pageRaw, 10);
      if (Number.isFinite(n) && n > 0) return { page: n };
    }
    return {};
  },
  ssr: false,
  loader: async ({ context, location }) => {
    const filterStore = await getFilterCookie();
    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions()
    );
    const search = location.search as { page?: number };
    const urlPage = typeof search.page === "number" && search.page > 0 ? search.page : 1;
    const hubPrefetchInput = buildReposHubPrefetchInput(filterStore, urlPage);

    if (setupStatus.isConfigured && setupStatus.owner) {
      await context.queryClient.prefetchQuery(
        githubReposHubQueryOptions(setupStatus.owner, hubPrefetchInput)
      );
    }

    return { filterStore };
  },
  pendingComponent: DashboardContentLoading,
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/repos",
        locale: params.locale
      },
      title: "Repositories",
      description: "Browse and filter GitHub repositories.",
      robots: {
        follow: false,
        index: false
      }
    }),
  component: RepositoriesPage
});

type RepositoryFilterItem = FilterableItem & {
  repo: UserRepoSummary;
  isPrivate: boolean;
};

const repositoryFilterDefs: FilterDefinition[] = [
  {
    id: "visibility",
    label: "Visibility",
    icon: FilterIcon,
    extractOptions: () => [
      {
        value: "public",
        label: "Public",
        icon: createElement(ViewIcon, {
          size: 14,
          className: "text-muted-foreground"
        })
      },
      {
        value: "private",
        label: "Private",
        icon: createElement(LockIcon, {
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

function RepositoriesPage() {
  const { filterStore } = Route.useLoaderData();
  const setupStatusQuery = useGetGithubSetupStatusQuery();
  const owner = setupStatusQuery.data?.owner ?? "";
  const scope = useMemo(() => {
    return { userId: owner };
  }, [owner]);
  const [page, setPage] = useQueryState("page", repoListPageQueryParser);

  const filterState = useListFilters({
    pageId: "repos",
    items: EMPTY_REPO_ITEMS,
    filterDefs: repositoryFilterDefs,
    sortOptions: repositorySortOptions,
    defaultSortId: "updated",
    initialStore: filterStore
  });

  const debouncedSearch = useDebouncedValue(filterState.searchQuery, 300);

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

  const hubQuery = useQuery({
    ...githubReposHubQueryOptions(owner, hubInput),
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

  if (
    (setupStatusQuery.isLoading && !setupStatusQuery.data) ||
    (!hubQuery.data && hubQuery.isPending)
  ) {
    return <DashboardContentLoading />;
  }

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
                    <RepositoryRow repo={repo} scope={scope} />
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
                  <ChevronDownIcon size={14} strokeWidth={2} />
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

function DashboardContentLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}

function asRepo(item: FilterableItem) {
  return item as RepositoryFilterItem;
}

function getTime(value: unknown) {
  return typeof value === "string" ? Date.parse(value) || 0 : 0;
}
