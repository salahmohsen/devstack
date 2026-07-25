/**
 * Canonical in-app paths for public GitHub repo routes.
 * Tab URLs, Link targets, and window navigations must use these —
 * bare `repo` or `owner/repo` strings do not match the router.
 */

export function repoOverviewPath(repo: string): string {
  return `/repos/${repo}`;
}

export function repoTreePath(repo: string, ref: string, path = ""): string {
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  if (!cleanPath) {
    return `/repos/${repo}/tree/${ref}`;
  }
  return `/repos/${repo}/tree/${ref}/${cleanPath}`;
}

export function repoBlobPath(repo: string, ref: string, path: string): string {
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  return `/repos/${repo}/blob/${ref}/${cleanPath}`;
}

export function buildRepoTabUrl(input: {
  repo: string;
  view: "repo" | "tree" | "blob";
  ref?: string;
  path?: string;
}): string {
  const { repo, view, ref = "main", path = "" } = input;
  if (view === "blob") {
    return repoBlobPath(repo, ref, path);
  }
  if (view === "tree") {
    return repoTreePath(repo, ref, path);
  }
  return repoOverviewPath(repo);
}

/**
 * Map a stored tab url back to a typed TanStack route `to` + `params`.
 * Link `to="/repos/foo"` does not match the file route `/repos/$repo` —
 * we must pass the route id and params.
 */
export function parseRepoTabLocation(url: string):
  | { to: "/repos/$repo"; params: { repo: string } }
  | { to: "/repos/$repo/tree/$"; params: { repo: string; _splat: string } }
  | { to: "/repos/$repo/blob/$"; params: { repo: string; _splat: string } }
  | null {
  const path = url.split("?")[0] ?? url;

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
