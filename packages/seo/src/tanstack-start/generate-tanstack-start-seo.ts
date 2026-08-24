import { isDefined, resolveRelativePathToAbsoluteUrl } from "@tsu-stack/core";

import {
  type GenerateTanStackStartSeoParams,
  type TanStackStartSeoHead,
  type TanStackStartSeoMetaTag
} from "#@/tanstack-start/types";
import {
  buildOpenGraphImageMeta,
  formatTanStackStartRobotsContent,
  formatTanStackStartTitle,
  generateTanStackStartAlternateLinks
} from "#@/tanstack-start/utils/index";

export function generateTanStackStartSeo({
  alternates,
  description,
  images,
  includeDocumentMeta = false,
  openGraphType = "website",
  robots,
  scripts,
  site,
  title
}: GenerateTanStackStartSeoParams): TanStackStartSeoHead {
  const resolvedDescription = description ?? site.defaultDescription;
  const resolvedImages = images?.length ? images : site.defaultImages;
  // Homepage / site default: use defaultTitle as-is. Apply titleTemplate only when
  // a route passes an explicit page title (avoids "Site | Site").
  const formattedTitle =
    title === undefined
      ? site.defaultTitle
      : formatTanStackStartTitle({
          site,
          title
        });
  const links = alternates
    ? generateTanStackStartAlternateLinks({
        ...alternates,
        baseUrl: site.baseUrl
      })
    : undefined;
  const canonicalUrl = links?.find((link) => link.rel === "canonical")?.href;
  const robotsContent = robots ? formatTanStackStartRobotsContent(robots) : undefined;
  const primaryImage = resolvedImages?.[0];

  const meta: TanStackStartSeoMetaTag[] = [
    includeDocumentMeta
      ? {
          charSet: "utf-8"
        }
      : undefined,
    includeDocumentMeta
      ? {
          // viewport-fit=cover: enable env(safe-area-inset-*) on notched iPhones so
          // bottom nav / sticky chrome can clear Safari + home indicator.
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
          name: "viewport"
        }
      : undefined,
    includeDocumentMeta && site.applicationName
      ? {
          content: site.applicationName,
          name: "application-name"
        }
      : undefined,
    includeDocumentMeta
      ? {
          content: "on",
          httpEquiv: "x-dns-prefetch-control"
        }
      : undefined,
    {
      title: formattedTitle
    },
    resolvedDescription
      ? {
          content: resolvedDescription,
          name: "description"
        }
      : undefined,
    {
      content: formattedTitle,
      property: "og:title"
    },
    resolvedDescription
      ? {
          content: resolvedDescription,
          property: "og:description"
        }
      : undefined,
    site.siteName
      ? {
          content: site.siteName,
          property: "og:site_name"
        }
      : undefined,

    canonicalUrl
      ? {
          content: canonicalUrl,
          property: "og:url"
        }
      : undefined,
    {
      content: openGraphType,
      property: "og:type"
    },
    ...buildOpenGraphImageMeta({
      baseUrl: site.baseUrl,
      images: resolvedImages
    }),
    {
      content: site.defaultTwitterCard ?? "summary_large_image",
      name: "twitter:card"
    },
    {
      content: formattedTitle,
      name: "twitter:title"
    },
    resolvedDescription
      ? {
          content: resolvedDescription,
          name: "twitter:description"
        }
      : undefined,
    primaryImage
      ? {
          content: resolveRelativePathToAbsoluteUrl(primaryImage.url, { baseUrl: site.baseUrl }),
          name: "twitter:image"
        }
      : undefined,
    primaryImage?.alt
      ? {
          content: primaryImage.alt,
          name: "twitter:image:alt"
        }
      : undefined,
    site.twitterSite
      ? {
          content: site.twitterSite,
          name: "twitter:site"
        }
      : undefined,
    site.twitterCreator
      ? {
          content: site.twitterCreator,
          name: "twitter:creator"
        }
      : undefined,
    robotsContent
      ? {
          content: robotsContent,
          name: "robots"
        }
      : undefined,
    robotsContent
      ? {
          content: robotsContent,
          name: "googlebot"
        }
      : undefined
  ].filter(isDefined);

  return {
    links,
    meta,
    scripts: scripts?.filter(isDefined)
  };
}
