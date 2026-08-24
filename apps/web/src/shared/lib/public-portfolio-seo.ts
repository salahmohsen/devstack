import { stripHtmlToPlainText } from "@tsu-stack/core";
import { type GenerateTanStackStartSeoParams } from "@tsu-stack/seo";

import { appConfig } from "@/config/app.config";

import { generateAppSeo } from "./seo";

const DESCRIPTION_MAX = 160;

type PortfolioSeoSource = {
  name?: string | null;
  image?: string | null;
  summary?: string | null;
} | null;

export type PublicPortfolioSeoInput = {
  username: string;
  name?: string | null;
  image?: string | null;
  summary?: string | null;
  /** Path-style portfolio (`/{username}`) or custom-domain root (`/`). */
  canonicalPath: `/${string}`;
  /** Extra title segment, e.g. "Repositories" or a repo name. */
  pageLabel?: string;
  /** Override description (e.g. repo description). */
  description?: string | null;
  /** Override OG image (falls back to profile image, then site default). */
  imageUrl?: string | null;
  imageAlt?: string;
  openGraphType?: "website" | "profile" | "article";
  robots?: { index: boolean; follow: boolean };
  scripts?: GenerateTanStackStartSeoParams["scripts"];
};

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
}

/** Pull SEO fields from a portfolio.list result (or partial cache). */
export function portfolioSeoFields(portfolio: PortfolioSeoSource): {
  name: string | null;
  image: string | null;
  summary: string | null;
} {
  return {
    name: nonEmpty(portfolio?.name),
    image: nonEmpty(portfolio?.image),
    summary: nonEmpty(portfolio?.summary)
  };
}

export function plainSummaryForSeo(summaryHtml: string | null | undefined): string | null {
  const html = nonEmpty(summaryHtml);
  if (!html) return null;
  const plain = stripHtmlToPlainText(html).replace(/\s+/g, " ").trim();
  if (!plain) return null;
  if (plain.length <= DESCRIPTION_MAX) return plain;
  return `${plain.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`;
}

export function absoluteMediaUrl(url: string | null | undefined): string | undefined {
  const value = nonEmpty(url);
  if (!value) return undefined;
  try {
    return new URL(value, appConfig.site.baseUrl).href;
  } catch {
    return undefined;
  }
}

/**
 * SEO head for public portfolio surfaces: profile, repos hub, and custom-domain
 * equivalents. Prefer display name + summary + profile image when present.
 */
export function generatePublicPortfolioSeo({
  username,
  name,
  image,
  summary,
  canonicalPath,
  pageLabel,
  description,
  imageUrl,
  imageAlt,
  openGraphType = "profile",
  robots = { index: true, follow: true },
  scripts
}: PublicPortfolioSeoInput) {
  const displayName = nonEmpty(name) ?? `@${username}`;
  const title = pageLabel ? `${displayName} · ${pageLabel}` : displayName;
  const resolvedDescription =
    nonEmpty(description) ??
    plainSummaryForSeo(summary) ??
    (pageLabel
      ? `${pageLabel} for ${displayName} on ${appConfig.site.shortName}.`
      : `Public portfolio for ${displayName} on ${appConfig.site.shortName}.`);

  const ogImage = absoluteMediaUrl(imageUrl) ?? absoluteMediaUrl(image);
  const images = ogImage
    ? [
        {
          alt: imageAlt ?? displayName,
          url: ogImage
        }
      ]
    : undefined;

  const personLd =
    !pageLabel && openGraphType === "profile"
      ? [
          {
            type: "application/ld+json" as const,
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: displayName,
              url: new URL(canonicalPath, appConfig.site.baseUrl).href,
              ...(ogImage ? { image: ogImage } : {}),
              ...(resolvedDescription ? { description: resolvedDescription } : {})
            })
          }
        ]
      : undefined;

  return generateAppSeo({
    alternates: {
      canonicalPath
    },
    description: resolvedDescription,
    images,
    openGraphType: openGraphType === "profile" ? "profile" : openGraphType,
    robots,
    scripts: scripts ?? personLd,
    title
  });
}
