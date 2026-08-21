/** Drop one search key; keep the rest (q, filter, sort, …). */
export function omitSearchKey<T extends object>(search: T, key: keyof T): T {
  const next = { ...search };
  delete next[key];
  return next;
}
