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
 * Search Iconify for an icon matching a query string.
 * Returns the first matching icon ID (e.g., "mdi:react") or null.
 */
export async function searchIcon(query: string, limit?: number): Promise<string | null> {
  const url = `${ICONIFY_API_BASE}/search?query=${encodeURIComponent(query)}&limit=${limit ?? 1}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as IconifySearchResult;
  return data.icons[0] ?? null;
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
