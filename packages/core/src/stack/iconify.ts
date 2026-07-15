import { sanitizeSvg } from "#@/stack/sanitize-svg";

const ICONIFY_API_BASE = "https://api.iconify.design";

type IconifySearchResult = {
  icons: string[];
  total: number;
};

type IconifyIconData = {
  prefix: string;
  icons: Record<string, { body: string }>;
  width?: number;
  height?: number;
};

/**
 * Remove special characters from a search query string.
 */
function sanitizeQuery(query: string): string {
  return query.replace(/[\W_]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Search Iconify for an icon matching a query string.
 * Returns the first matching icon ID (e.g., "mdi:react") or null when limit is 1 or unset.
 * Returns an array of icon IDs when limit is greater than 1.
 */
export async function searchIcon(query: string, limit?: 1): Promise<string | null>;
export async function searchIcon(query: string, limit: number): Promise<string[]>;
export async function searchIcon(query: string, limit?: number): Promise<string | null | string[]> {
  const sanitized = sanitizeQuery(query);
  const effectiveLimit = limit ?? 1;
  const url = `${ICONIFY_API_BASE}/search?query=${encodeURIComponent(sanitized)}&limit=${effectiveLimit}`;
  const res = await fetch(url);
  if (!res.ok) return effectiveLimit === 1 ? null : [];

  const data = (await res.json()) as IconifySearchResult;
  if (effectiveLimit === 1) return data.icons[0] ?? null;
  return data.icons;
}

/**
 * Fetch SVG body for a given icon ID (e.g., "mdi:react").
 * Returns a full <svg> string or null on failure.
 */
export async function fetchIconSvg(iconId: string): Promise<string | null> {
  const colonIdx = iconId.indexOf(":");
  if (colonIdx === -1) return null;

  const prefix = iconId.slice(0, colonIdx);
  const name = iconId.slice(colonIdx + 1);

  const url = `${ICONIFY_API_BASE}/${prefix}.json?icons=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as IconifyIconData;
  const iconData = data.icons[name];
  if (!iconData) return null;

  const width = data.width ?? 24;
  const height = data.height ?? 24;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">${sanitizeSvg(iconData.body)}</svg>`;
}

/**
 * Resolve an icon for a given npm package name.
 * Searches Iconify, fetches the SVG, returns full SVG string or null.
 */
export async function resolveIconForPackage(npmPackage: string): Promise<string | null> {
  const iconId = await searchIcon(npmPackage);
  if (!iconId) return null;
  return fetchIconSvg(iconId);
}
