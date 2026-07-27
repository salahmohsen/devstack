import { useParams } from "@tanstack/react-router";

/**
 * Link targets for repo explorer UI.
 *
 * - Primary host: routes include `/$profileName` from URL params
 * - Custom domain: path is `/repos/...` (no profileName segment; Host identifies the user)
 *
 * Prefer this over hand-rolled conditionals in each Link.
 */
export function useRepoRouteLinks() {
  const params = useParams({ strict: false }) as { profileName?: string };
  const profileName = params.profileName;

  const hasProfileSegment = Boolean(profileName);

  return {
    /** Present on primary-host profile routes; undefined on custom-domain `/repos`. */
    profileName,
    hasProfileSegment,
    overviewTo: hasProfileSegment
      ? ("/$profileName/repos/$repo" as const)
      : ("/repos/$repo" as const),
    treeTo: hasProfileSegment
      ? ("/$profileName/repos/$repo/tree/$" as const)
      : ("/repos/$repo/tree/$" as const),
    blobTo: hasProfileSegment
      ? ("/$profileName/repos/$repo/blob/$" as const)
      : ("/repos/$repo/blob/$" as const),
    overviewParams: (repo: string) =>
      hasProfileSegment ? { profileName: profileName!, repo } : { repo },
    treeParams: (repo: string, splat: string) =>
      hasProfileSegment
        ? { profileName: profileName!, repo, _splat: splat }
        : { repo, _splat: splat },
    blobParams: (repo: string, splat: string) =>
      hasProfileSegment
        ? { profileName: profileName!, repo, _splat: splat }
        : { repo, _splat: splat },
    /** Tree vs blob in one call (e.g. FileTreeRow). */
    entryLink: (repo: string, refName: string, entryPath: string, isDir: boolean) => {
      const splat = `${refName}/${entryPath}`;
      if (isDir) {
        return {
          to: hasProfileSegment
            ? ("/$profileName/repos/$repo/tree/$" as const)
            : ("/repos/$repo/tree/$" as const),
          params: hasProfileSegment
            ? { profileName: profileName!, repo, _splat: splat }
            : { repo, _splat: splat }
        };
      }
      return {
        to: hasProfileSegment
          ? ("/$profileName/repos/$repo/blob/$" as const)
          : ("/repos/$repo/blob/$" as const),
        params: hasProfileSegment
          ? { profileName: profileName!, repo, _splat: splat }
          : { repo, _splat: splat }
      };
    }
  };
}
