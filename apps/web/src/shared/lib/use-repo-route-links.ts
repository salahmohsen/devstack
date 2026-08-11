import { useParams } from "@tanstack/react-router";

/**
 * Link targets for repo explorer UI.
 *
 * - Primary host: routes include `/$username` from URL params
 * - Custom domain: path is `/repos/...` (no username segment; Host identifies the user)
 *
 * Prefer this over hand-rolled conditionals in each Link.
 */
export function useRepoRouteLinks() {
  const params = useParams({ strict: false }) as { username?: string };
  const username = params.username;

  const hasProfileSegment = Boolean(username);

  return {
    /** Present on primary-host profile routes; undefined on custom-domain `/repos`. */
    username,
    hasProfileSegment,
    overviewTo: hasProfileSegment ? ("/$username/repos/$repo" as const) : ("/repos/$repo" as const),
    treeTo: hasProfileSegment
      ? ("/$username/repos/$repo/tree/$" as const)
      : ("/repos/$repo/tree/$" as const),
    blobTo: hasProfileSegment
      ? ("/$username/repos/$repo/blob/$" as const)
      : ("/repos/$repo/blob/$" as const),
    overviewParams: (repo: string) =>
      hasProfileSegment ? { username: username!, repo } : { repo },
    treeParams: (repo: string, splat: string) =>
      hasProfileSegment ? { username: username!, repo, _splat: splat } : { repo, _splat: splat },
    blobParams: (repo: string, splat: string) =>
      hasProfileSegment ? { username: username!, repo, _splat: splat } : { repo, _splat: splat },
    /** Tree vs blob in one call (e.g. FileTreeRow). */
    entryLink: (repo: string, refName: string, entryPath: string, isDir: boolean) => {
      const splat = `${refName}/${entryPath}`;
      if (isDir) {
        return {
          to: hasProfileSegment
            ? ("/$username/repos/$repo/tree/$" as const)
            : ("/repos/$repo/tree/$" as const),
          params: hasProfileSegment
            ? { username: username!, repo, _splat: splat }
            : { repo, _splat: splat }
        };
      }
      return {
        to: hasProfileSegment
          ? ("/$username/repos/$repo/blob/$" as const)
          : ("/repos/$repo/blob/$" as const),
        params: hasProfileSegment
          ? { username: username!, repo, _splat: splat }
          : { repo, _splat: splat }
      };
    }
  };
}
