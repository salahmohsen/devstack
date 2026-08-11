import { useParams } from "@tanstack/react-router";

/**
 * Portfolio profile segment for the current public page.
 * - Path routes: `/$username/...` → params.username
 * - Custom-domain `/repos/...`: params.username is absent; pass via route context instead.
 *
 * Prefer route params; callers on custom-domain routes must receive username as a prop
 * from the route loader.
 */
export function usePortfolioUsernameParam(): string | undefined {
  const params = useParams({ strict: false }) as { username?: string };
  return params.username;
}
