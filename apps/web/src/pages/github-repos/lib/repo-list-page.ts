import { parseAsInteger } from "nuqs";

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

export function repoListHasNextPage(page: number, itemCount: number): boolean {
  const safe = safeRepoListPage(page, itemCount);
  return safe * REPO_LIST_PAGE_SIZE < itemCount;
}
