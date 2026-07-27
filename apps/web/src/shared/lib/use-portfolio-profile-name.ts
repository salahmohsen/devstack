import { useParams } from "@tanstack/react-router";

/**
 * Portfolio profile segment for the current public page.
 * - Path routes: `/$profileName/...` → params.profileName
 * - Custom-domain `/repos/...`: params.profileName is absent; pass via route context instead.
 *
 * Prefer route params; callers on custom-domain routes must receive profileName as a prop
 * from the route loader.
 */
export function usePortfolioProfileNameParam(): string | undefined {
  const params = useParams({ strict: false }) as { profileName?: string };
  return params.profileName;
}
