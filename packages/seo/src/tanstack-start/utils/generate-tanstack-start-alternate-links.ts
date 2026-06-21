import {
  type TanStackStartSeoAlternates,
  type TanStackStartSeoLinkTag
} from "#@/tanstack-start/types";
import { getLocalizedCanonicalPath } from "#@/tanstack-start/utils/get-localized-canonical-path";
import { resolveRelativePathToAbsoluteUrl } from "#@/tanstack-start/utils/resolve-relative-path-to-absolute-url";

export function generateTanStackStartAlternateLinks({
  baseUrl,
  canonicalPath
}: TanStackStartSeoAlternates & {
  baseUrl: string;
}): TanStackStartSeoLinkTag[] {
  return [
    {
      href: resolveRelativePathToAbsoluteUrl(getLocalizedCanonicalPath({ canonicalPath }), {
        baseUrl
      }),
      rel: "canonical"
    }
  ];
}
