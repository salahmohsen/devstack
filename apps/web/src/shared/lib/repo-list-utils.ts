import { parseAsInteger } from "nuqs";

const PAGE_SIZE = 12;

export function parseRepoListPage(page: string | null) {
  if (!page) {
    return 1;
  }

  const parsed = Number.parseInt(page, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function getRepoListPageCount(totalItems: number) {
  return Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
}

export function clampRepoListPage(page: number, totalItems: number) {
  return Math.min(Math.max(1, page), getRepoListPageCount(totalItems));
}

export function sliceReposForPage<TItem>(repos: TItem[], page: number) {
  const start = (page - 1) * PAGE_SIZE;
  return repos.slice(start, start + PAGE_SIZE);
}

export function repoListHasNextPage(page: number, totalItems: number) {
  return page < getRepoListPageCount(totalItems);
}

export { PAGE_SIZE as githubRepoListPageSize };

export const REPO_LIST_PAGE_SIZE = 30;

export const repoListPageQueryParser = parseAsInteger
  .withDefault(1)
  .withOptions({ history: "push" });

export function maxRepoListPage(itemCount: number): number {
  return Math.max(1, Math.ceil(itemCount / REPO_LIST_PAGE_SIZE));
}

export function safeRepoListPage(page: number, itemCount: number): number {
  const max = maxRepoListPage(itemCount);
  return Math.min(Math.max(1, page), max);
}
