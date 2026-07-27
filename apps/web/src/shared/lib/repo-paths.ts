/**
 * Canonical in-app paths for profile-scoped GitHub repo routes.
 *
 * - Primary host: `/{profileName}/repos/...`
 * - Custom domain Host: `/repos/...` (profile comes from Host; pass profileName=null)
 */

/** Base path for a user's repos list. */
export function reposListPath(profileName: string | null): string {
  return profileName ? `/${profileName}/repos` : `/repos`;
}

export function repoOverviewPath(profileName: string | null, repo: string): string {
  return `${reposListPath(profileName)}/${repo}`;
}

export function repoTreePath(
  profileName: string | null,
  repo: string,
  ref: string,
  path = ""
): string {
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  const base = `${reposListPath(profileName)}/${repo}/tree/${ref}`;
  if (!cleanPath) return base;
  return `${base}/${cleanPath}`;
}

export function repoBlobPath(
  profileName: string | null,
  repo: string,
  ref: string,
  path: string
): string {
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  return `${reposListPath(profileName)}/${repo}/blob/${ref}/${cleanPath}`;
}

export function buildRepoTabUrl(input: {
  profileName: string | null;
  repo: string;
  view: "repo" | "tree" | "blob";
  ref?: string;
  path?: string;
}): string {
  const { profileName, repo, view, ref = "main", path = "" } = input;
  if (view === "blob") {
    return repoBlobPath(profileName, repo, ref, path);
  }
  if (view === "tree") {
    return repoTreePath(profileName, repo, ref, path);
  }
  return repoOverviewPath(profileName, repo);
}

type ProfileRepoParams = { profileName: string; repo: string };
type ProfileRepoSplatParams = { profileName: string; repo: string; _splat: string };
type CustomRepoParams = { repo: string };
type CustomRepoSplatParams = { repo: string; _splat: string };

/**
 * Map a stored tab url back to a typed TanStack route `to` + `params`.
 */
export function parseRepoTabLocation(
  url: string
):
  | { to: "/$profileName/repos/$repo"; params: ProfileRepoParams }
  | { to: "/$profileName/repos/$repo/tree/$"; params: ProfileRepoSplatParams }
  | { to: "/$profileName/repos/$repo/blob/$"; params: ProfileRepoSplatParams }
  | { to: "/repos/$repo"; params: CustomRepoParams }
  | { to: "/repos/$repo/tree/$"; params: CustomRepoSplatParams }
  | { to: "/repos/$repo/blob/$"; params: CustomRepoSplatParams }
  | null {
  const path = url.split("?")[0] ?? url;

  // Profile-scoped: /{profileName}/repos/...
  const profileBlob = path.match(/^\/([^/]+)\/repos\/([^/]+)\/blob\/(.+)$/);
  if (profileBlob && profileBlob[1] !== "repos") {
    return {
      to: "/$profileName/repos/$repo/blob/$",
      params: { profileName: profileBlob[1], repo: profileBlob[2], _splat: profileBlob[3] }
    };
  }

  const profileTree = path.match(/^\/([^/]+)\/repos\/([^/]+)\/tree\/(.+)$/);
  if (profileTree && profileTree[1] !== "repos") {
    return {
      to: "/$profileName/repos/$repo/tree/$",
      params: { profileName: profileTree[1], repo: profileTree[2], _splat: profileTree[3] }
    };
  }

  const profileOverview = path.match(/^\/([^/]+)\/repos\/([^/]+)\/?$/);
  if (profileOverview && profileOverview[1] !== "repos") {
    return {
      to: "/$profileName/repos/$repo",
      params: { profileName: profileOverview[1], repo: profileOverview[2] }
    };
  }

  // Custom-domain root: /repos/...
  const blob = path.match(/^\/repos\/([^/]+)\/blob\/(.+)$/);
  if (blob) {
    return {
      to: "/repos/$repo/blob/$",
      params: { repo: blob[1], _splat: blob[2] }
    };
  }

  const tree = path.match(/^\/repos\/([^/]+)\/tree\/(.+)$/);
  if (tree) {
    return {
      to: "/repos/$repo/tree/$",
      params: { repo: tree[1], _splat: tree[2] }
    };
  }

  const overview = path.match(/^\/repos\/([^/]+)\/?$/);
  if (overview) {
    return {
      to: "/repos/$repo",
      params: { repo: overview[1] }
    };
  }

  return null;
}
