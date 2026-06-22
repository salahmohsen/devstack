import { type FacetKey } from "#@/identity/constants";
import { FACET_SCHEMAS, type FacetValueByKey, type IdentityFacet } from "#@/identity/types";

export function renderIdentityTemplate(facets: Partial<Record<FacetKey, IdentityFacet>>): string {
  const headline = facets.headline?.value as FacetValueByKey["headline"] | undefined;
  const bio = facets.bio?.value as FacetValueByKey["bio"] | undefined;
  const focusLog = facets.focus_log?.value as FacetValueByKey["focus_log"] | undefined;
  const narrative = facets.narrative?.value as FacetValueByKey["narrative"] | undefined;

  const headlineSection = headline
    ? `${headline.oneLiner}\n${headline.valueProps.map((v) => `- ${v}`).join("\n")}`
    : "_not set_";

  const bioSection = bio ? `${bio.short}\n\n${bio.long}` : "_not set_";

  const focusLogSection =
    focusLog && focusLog.items.length > 0
      ? focusLog.items
          .slice()
          .toSorted((a, b) => b.startedAt.localeCompare(a.startedAt))
          .map((i) => `- (${i.startedAt}) **${i.title}** — ${i.body}`)
          .join("\n")
      : "_no focus log items yet_";

  const narrativeSection = narrative?.text ?? "_not set_";

  return [
    "# Identity (Salah Mohsen)",
    "",
    "The following is the current state of the portfolio owner's self-description facets.",
    "Refer to the user in the third person. Use these to ground content suggestions, but",
    "do not invent new facts beyond what is here.",
    "",
    "## Headline",
    headlineSection,
    "",
    "## Bio",
    bioSection,
    "",
    "## Focus log (reverse chronological)",
    focusLogSection,
    "",
    "## Narrative",
    narrativeSection
  ].join("\n");
}

export function validateFacetValue(key: FacetKey, value: unknown) {
  return FACET_SCHEMAS[key].parse(value);
}
