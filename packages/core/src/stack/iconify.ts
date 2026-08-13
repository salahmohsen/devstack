import { sanitizeSvg } from "#@/stack/sanitize-svg";

const ICONIFY_API_BASE = "https://api.iconify.design";

/** Prefer brand / logo sets so stack icons look intentional. */
const PREFERRED_PREFIXES = [
  "simple-icons",
  "logos",
  "skill-icons",
  "devicon",
  "vscode-icons",
  "mdi",
  "tabler",
  "hugeicons"
] as const;

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
 * Build ordered search queries from a stack / package name.
 * Tries full name first, then compact and shorter variants.
 */
function buildSearchQueries(name: string): string[] {
  const cleaned = sanitizeQuery(name);
  if (!cleaned) return [];

  const queries: string[] = [cleaned];
  const compact = cleaned.replace(/\s+/g, "");
  if (compact !== cleaned) queries.push(compact);

  // Drop common noise words for better brand matches
  const withoutNoise = cleaned
    .replace(/\b(js|ts|css|orm|sdk|api|client|server|core|react|vue|angular)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (withoutNoise && withoutNoise !== cleaned && withoutNoise.length >= 2) {
    queries.push(withoutNoise);
  }

  const firstWord = cleaned.split(" ")[0];
  if (firstWord && firstWord !== cleaned && firstWord.length >= 3) {
    queries.push(firstWord);
  }

  return [...new Set(queries)];
}

function scoreIconId(iconId: string, query: string): number {
  const colonIdx = iconId.indexOf(":");
  if (colonIdx === -1) return 0;

  const prefix = iconId.slice(0, colonIdx);
  const iconName = iconId.slice(colonIdx + 1);

  let score = 0;
  const prefIdx = PREFERRED_PREFIXES.indexOf(prefix as (typeof PREFERRED_PREFIXES)[number]);
  if (prefIdx !== -1) {
    score += (PREFERRED_PREFIXES.length - prefIdx) * 15;
  }

  const q = query.toLowerCase().replace(/[\s-_/]/g, "");
  const n = iconName.toLowerCase().replace(/[\s-_/]/g, "");

  if (n === q) score += 100;
  else if (n.startsWith(q) || q.startsWith(n)) score += 70;
  else if (n.includes(q) || q.includes(n)) score += 40;

  // Penalize generic / unrelated UI icons when a brand match is likely
  if (
    prefix === "mdi" &&
    (iconName.includes("help") || iconName.includes("help-circle") || iconName === "package")
  ) {
    score -= 30;
  }

  return score;
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
  if (!sanitized) return effectiveLimit === 1 ? null : [];

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
 * Pick the best icon ID from a list of candidates for a given query.
 */
export function pickBestIconId(iconIds: string[], query: string): string | null {
  if (iconIds.length === 0) return null;

  const ranked = iconIds
    .map((id) => {
      return { id, score: scoreIconId(id, query) };
    })
    .toSorted((a, b) => b.score - a.score);

  // Prefer a scored preferred-prefix match
  const preferred = ranked.find(
    (r) => r.score >= 40 && PREFERRED_PREFIXES.some((p) => r.id.startsWith(`${p}:`))
  );
  if (preferred) return preferred.id;

  // Any solid name match
  const good = ranked.find((r) => r.score >= 40);
  if (good) return good.id;

  // Fall back to first preferred-prefix result even with lower score
  const anyPreferred = ranked.find((r) => PREFERRED_PREFIXES.some((p) => r.id.startsWith(`${p}:`)));
  if (anyPreferred) return anyPreferred.id;

  return ranked[0]?.id ?? null;
}

/**
 * Direct Iconify IDs for brands that search misses (empty results or poor ranking).
 * Keys are lowercase sanitized labels (spaces stripped of punctuation).
 */
const KNOWN_ICON_IDS: Readonly<Record<string, string>> = {
  // Editors / RPC brands often missing from Iconify search
  tiptap: "lucide:text-select",
  orpc: "simple-icons:trpc",
  // Product labels that search under-ranks
  tanstackquery: "simple-icons:reactquery",
  tanstackrouter: "simple-icons:reactrouter",
  tanstackform: "simple-icons:react",
  tanstackstart: "simple-icons:react",
  tanstacktable: "simple-icons:react",
  betterauth: "simple-icons:betterauth",
  radixui: "simple-icons:radixui",
  nextjs: "simple-icons:nextdotjs",
  "next.js": "simple-icons:nextdotjs"
};

function knownIconKey(name: string): string {
  return name.toLowerCase().replace(/[\W_]+/g, "");
}

/**
 * Resolve an icon for a stack or npm package name.
 * Tries known aliases, then multiple query variants, preferring brand icon sets.
 */
export async function resolveIconForPackage(npmPackage: string): Promise<string | null> {
  const knownId = KNOWN_ICON_IDS[knownIconKey(npmPackage)];
  if (knownId) {
    const knownSvg = await fetchIconSvg(knownId);
    if (knownSvg) return knownSvg;
  }

  // For scoped packages, also try product segment + full scope path as queries.
  const extraQueries: string[] = [];
  if (npmPackage.includes("/")) {
    const bare = npmPackage.split("/").pop();
    if (bare) extraQueries.push(bare.replace(/-/g, " "));
    extraQueries.push(npmPackage.replace("@", "").replace("/", " "));
  }

  const queries = [...buildSearchQueries(npmPackage), ...extraQueries];

  for (const query of queries) {
    const icons = await searchIcon(query, 32);
    if (icons.length === 0) continue;

    const bestId = pickBestIconId(icons, query);
    if (!bestId) continue;

    const svg = await fetchIconSvg(bestId);
    if (svg) return svg;

    // Try next-best preferred icons if the top pick failed to fetch
    const ranked = icons
      .map((id) => {
        return { id, score: scoreIconId(id, query) };
      })
      .toSorted((a, b) => b.score - a.score);

    for (const candidate of ranked.slice(0, 5)) {
      if (candidate.id === bestId) continue;
      const fallback = await fetchIconSvg(candidate.id);
      if (fallback) return fallback;
    }
  }

  return null;
}

/**
 * Resolve an icon trying several candidate labels (display name, npm package, family primary).
 * First successful SVG wins.
 */
export async function resolveIconForCandidates(candidates: string[]): Promise<string | null> {
  const seen = new Set<string>();
  for (const raw of candidates) {
    const key = raw.trim();
    if (!key || seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());
    const svg = await resolveIconForPackage(key);
    if (svg) return svg;
  }
  return null;
}
