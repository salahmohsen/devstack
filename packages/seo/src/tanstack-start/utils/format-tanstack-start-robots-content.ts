import { isDefined } from "@tsu-stack/core";

import { type TanStackStartSeoRobots } from "#@/tanstack-start/types";

export function formatTanStackStartRobotsContent({
  follow = true,
  index = true,
  maxImagePreview,
  noarchive = false,
  noimageindex = false,
  nosnippet = false
}: TanStackStartSeoRobots): string {
  return [
    index ? "index" : "noindex",
    follow ? "follow" : "nofollow",
    noarchive ? "noarchive" : undefined,
    noimageindex ? "noimageindex" : undefined,
    nosnippet ? "nosnippet" : undefined,
    maxImagePreview ? `max-image-preview:${maxImagePreview}` : undefined
  ]
    .filter(isDefined)
    .join(", ");
}
