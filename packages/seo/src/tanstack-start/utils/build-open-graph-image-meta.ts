import { isDefined, resolveRelativePathToAbsoluteUrl } from "@tsu-stack/core";

import { type TanStackStartSeoImage, type TanStackStartSeoMetaTag } from "#@/tanstack-start/types";

export function buildOpenGraphImageMeta({
  baseUrl,
  images
}: {
  baseUrl: string;
  images?: TanStackStartSeoImage[];
}): TanStackStartSeoMetaTag[] {
  if (!images?.length) {
    return [];
  }

  return images.flatMap((image) => {
    const absoluteUrl = resolveRelativePathToAbsoluteUrl(image.url, { baseUrl });

    return [
      {
        content: absoluteUrl,
        property: "og:image"
      },
      image.alt
        ? {
            content: image.alt,
            property: "og:image:alt"
          }
        : undefined,
      image.width
        ? {
            content: `${image.width}`,
            property: "og:image:width"
          }
        : undefined,
      image.height
        ? {
            content: `${image.height}`,
            property: "og:image:height"
          }
        : undefined,
      image.type
        ? {
            content: image.type,
            property: "og:image:type"
          }
        : undefined
    ].filter(isDefined);
  });
}
