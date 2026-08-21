/**
 * Closed hiring-region slugs + $0 synonym dictionary for two-axis matching.
 * Ancestor edges expand upward (egypt → mena → emea).
 */

/** Region ancestors: child → parent (walk until no parent). */
const REGION_PARENT: Readonly<Record<string, string>> = {
  egypt: "mena",
  saudi_arabia: "mena",
  mena: "emea",
  eu: "emea",
  uk: "emea"
};

/**
 * Raw phrase → slug. Keys are lowercase, punctuation-normalized.
 */
export const HIRING_REGION_SYNONYM_TO_SLUG: Readonly<Record<string, string>> = {
  worldwide: "worldwide",
  anywhere: "worldwide",
  global: "worldwide",
  "remote worldwide": "worldwide",
  latam: "latam",
  "latin america": "latam",
  "lat am": "latam",
  "lat-am": "latam",
  mena: "mena",
  "middle east": "mena",
  gcc: "mena",
  egypt: "egypt",
  eg: "egypt",
  cairo: "egypt",
  saudi: "saudi_arabia",
  "saudi arabia": "saudi_arabia",
  ksa: "saudi_arabia",
  riyadh: "saudi_arabia",
  emea: "emea",
  eu: "eu",
  europe: "eu",
  "remote eu": "eu",
  "remote - eu": "eu",
  uk: "uk",
  "united kingdom": "uk",
  us: "us",
  usa: "us",
  "united states": "us",
  "us only": "us",
  "remote us": "us",
  africa: "africa",
  apac: "apac",
  "asia pacific": "apac",
  de: "de",
  germany: "de",
  br: "br",
  brazil: "br",
  india: "india",
  canada: "canada",
  ireland: "ireland",
  poland: "poland",
  australia: "apac",
  singapore: "apac",
  malaysia: "apac",
  taiwan: "apac",
  "hong kong": "apac",
  colombia: "latam",
  peru: "latam",
  uruguay: "latam",
  dubai: "mena",
  uae: "mena"
};

const CLOSED_SLUGS = new Set<string>([
  "worldwide",
  "mena",
  "emea",
  "eu",
  "uk",
  "us",
  "latam",
  "africa",
  "apac",
  "egypt",
  "saudi_arabia",
  "de",
  "br",
  ...Object.values(HIRING_REGION_SYNONYM_TO_SLUG)
]);

/** Closed remote-region chips. Empty selection still means worldwide listings. */
export const REMOTE_REGION_SLUGS = [
  "egypt",
  "saudi_arabia",
  "mena",
  "emea",
  "eu",
  "uk",
  "us",
  "de",
  "br",
  "latam",
  "africa",
  "apac"
] as const;

export type RemoteRegionSlug = (typeof REMOTE_REGION_SLUGS)[number];

export const REMOTE_REGION_LABELS: Record<RemoteRegionSlug, string> = {
  egypt: "Egypt",
  saudi_arabia: "Saudi Arabia",
  mena: "MENA",
  emea: "EMEA",
  eu: "EU",
  uk: "United Kingdom",
  us: "United States",
  de: "Germany",
  br: "Brazil",
  latam: "LatAm",
  africa: "Africa",
  apac: "APAC"
};

export function remoteRegionSelectOptions(): Array<{ value: RemoteRegionSlug; label: string }> {
  return REMOTE_REGION_SLUGS.map((value) => {
    return { value, label: REMOTE_REGION_LABELS[value] };
  });
}

/** Multi-word / longer phrases first for containment matching. */
const SYNONYM_PHRASES: readonly { phrase: string; slug: string }[] = Object.entries(
  HIRING_REGION_SYNONYM_TO_SLUG
)
  .map(([phrase, slug]) => {
    return { phrase, slug };
  })
  .toSorted((a, b) => b.phrase.length - a.phrase.length);

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[—–]/g, "-")
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapse hyphen/space variants for exact lookup (`lat-am` / `lat am`). */
function compactKey(key: string): string {
  return key.replace(/[-\s]+/g, " ").trim();
}

/**
 * Map free-text location / ATS region to a closed slug, or null if unknown.
 */
export function normalizeHiringRegion(raw: string | null): string | null {
  if (raw == null) return null;
  const key = normalizeKey(raw);
  if (key.length === 0) return null;

  const exact =
    HIRING_REGION_SYNONYM_TO_SLUG[key] ?? HIRING_REGION_SYNONYM_TO_SLUG[compactKey(key)];
  if (exact) return exact;

  // Already-closed slug (`saudi_arabia`, `latam`)
  const underscored = key.replace(/\s+/g, "_");
  if (CLOSED_SLUGS.has(underscored)) return underscored;

  // Multi-word / long phrase containment only (avoid "us"/"de" false hits)
  for (const { phrase, slug } of SYNONYM_PHRASES) {
    if (phrase.length < 4 && !phrase.includes(" ")) continue;
    if (key.includes(phrase)) return slug;
  }

  return null;
}

/** Self + ancestors for overlap (egypt → mena → emea). */
export function expandRegionAncestors(slug: string): Set<string> {
  const out = new Set<string>([slug]);
  let cur: string | undefined = slug;
  const seen = new Set<string>([slug]);
  while (cur != null) {
    const parent: string | undefined = REGION_PARENT[cur];
    if (parent == null || seen.has(parent)) break;
    out.add(parent);
    seen.add(parent);
    cur = parent;
  }
  return out;
}

function regionSetsForTokens(
  tokens: readonly string[],
  expandUser: boolean
): {
  hasWorldwide: boolean;
  regions: Set<string>;
} {
  const regions = new Set<string>();
  let hasWorldwide = false;
  for (const token of tokens) {
    const slug = normalizeHiringRegion(token);
    if (slug == null) continue;
    if (slug === "worldwide") {
      hasWorldwide = true;
      continue;
    }
    if (expandUser) {
      for (const r of expandRegionAncestors(slug)) {
        regions.add(r);
      }
    } else {
      regions.add(slug);
    }
  }
  return { hasWorldwide, regions };
}

const REMOTE_PLACE_FILLER =
  /\b(?:fully|remote|anywhere|worldwide|global|hybrid|only|none|distributed|telecommute|wfh)\b/g;

function locationRemainder(raw: string | null | undefined): string {
  if (raw == null) return "";
  return normalizeKey(raw)
    .replace(REMOTE_PLACE_FILLER, " ")
    .replace(/[-\s]+/g, " ")
    .trim();
}

/** Location is only a remote-anywhere label, not a country. */
export function isVagueRemotePlace(raw: string | null | undefined): boolean {
  if (raw == null) return true;
  const key = normalizeKey(raw);
  if (key.length === 0) return true;
  return locationRemainder(raw).length === 0;
}

function specificRegionSlug(slug: string | null): string | null {
  if (slug == null || slug === "worldwide") return null;
  return slug;
}

/**
 * Remote listing place: a specific hiring region or location beats worldwide.
 * Unmapped city/country text is not treated as worldwide.
 */
export function resolveRemoteListingSlug(
  hiringRegion: string | null,
  location: string | null
): { slug: string | null; specificUnknown: boolean } {
  const regionSlug =
    hiringRegion != null && hiringRegion.trim().length > 0
      ? normalizeHiringRegion(hiringRegion)
      : null;
  const remainder = locationRemainder(location);
  const locSlug =
    normalizeHiringRegion(location) ??
    (remainder.length > 0 ? normalizeHiringRegion(remainder) : null);
  const specific = specificRegionSlug(regionSlug) ?? specificRegionSlug(locSlug);
  if (specific != null) return { slug: specific, specificUnknown: false };

  if (isVagueRemotePlace(location)) {
    if (regionSlug === "worldwide") {
      return { slug: "worldwide", specificUnknown: false };
    }
    if (regionSlug == null) {
      const statedPlace = location != null && location.trim().length > 0;
      if (statedPlace) return { slug: "worldwide", specificUnknown: false };
      return { slug: null, specificUnknown: false };
    }
    return { slug: regionSlug, specificUnknown: false };
  }

  if (remainder.length > 0 && locSlug == null) {
    return { slug: null, specificUnknown: true };
  }

  if (regionSlug === "worldwide" || locSlug === "worldwide") {
    return { slug: "worldwide", specificUnknown: false };
  }
  return { slug: regionSlug ?? locSlug, specificUnknown: false };
}

function resolveListingSlug(
  listingRegion: string | null,
  listingLocation: string | null
): string | null {
  if (listingRegion != null && listingRegion.trim().length > 0) {
    const normalized = normalizeHiringRegion(listingRegion);
    if (normalized != null) return normalized;
    const raw = listingRegion.trim().toLowerCase().replace(/\s+/g, "_");
    if (CLOSED_SLUGS.has(raw)) return raw;
  }
  if (listingLocation != null && listingLocation.trim().length > 0) {
    return normalizeHiringRegion(listingLocation);
  }
  return null;
}

export type HiringRegionsOverlapOptions = {
  /** Onsite/hybrid must pass `false` so a leftover user worldwide token cannot match. */
  allowUserWorldwide?: boolean;
  /**
   * `both` (default): user and listing walk ancestors — remote egypt overlaps emea.
   * `listing`: only the listing walks up — hybrid london does not match egypt via emea.
   * `lineage`: one slug is the other or its ancestor — egypt matches MENA, not UK/US.
   */
  expand?: "both" | "listing" | "lineage";
};

/** True when the slugs are the same or one is an ancestor of the other (not siblings). */
export function regionsShareLineage(userSlug: string, listingSlug: string): boolean {
  if (userSlug === listingSlug) return true;
  if (expandRegionAncestors(userSlug).has(listingSlug)) return true;
  if (expandRegionAncestors(listingSlug).has(userSlug)) return true;
  return false;
}

/**
 * True when user location tokens share a country or ancestor region with the listing.
 * A worldwide *listing* still overlaps everyone. User worldwide only passes when allowed.
 */
export function hiringRegionsOverlap(
  userLocations: string[],
  listingRegion: string | null,
  listingLocation: string | null,
  options?: HiringRegionsOverlapOptions
): boolean {
  const resolvedListing = resolveListingSlug(listingRegion, listingLocation);
  if (resolvedListing == null) return false;
  if (resolvedListing === "worldwide") return true;

  if (options?.expand === "lineage") {
    const user = regionSetsForTokens(userLocations, false);
    if ((options.allowUserWorldwide ?? false) && user.hasWorldwide) return true;
    if (user.regions.size === 0) return false;
    for (const userSlug of user.regions) {
      if (regionsShareLineage(userSlug, resolvedListing)) return true;
    }
    return false;
  }

  const expandUser = (options?.expand ?? "both") === "both";
  const user = regionSetsForTokens(userLocations, expandUser);
  if ((options?.allowUserWorldwide ?? false) && user.hasWorldwide) return true;
  if (user.regions.size === 0) return false;

  const listingSet = expandRegionAncestors(resolvedListing);
  for (const r of listingSet) {
    if (user.regions.has(r)) return true;
  }
  return false;
}
