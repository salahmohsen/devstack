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

/** Typed navigate target when switching branches (client-side; no full reload). */
export type RepoBranchNavLocation =
  | { to: "/$profileName/repos/$repo"; params: ProfileRepoParams }
  | { to: "/repos/$repo"; params: CustomRepoParams }
  | { to: "/$profileName/repos/$repo/tree/$"; params: ProfileRepoSplatParams }
  | { to: "/repos/$repo/tree/$"; params: CustomRepoSplatParams }
  | { to: "/$profileName/repos/$repo/blob/$"; params: ProfileRepoSplatParams }
  | { to: "/repos/$repo/blob/$"; params: CustomRepoSplatParams };

/**
 * Resolve in-app navigation for a branch switch.
 * - With path: keep tree/blob and swap ref
 * - No path + default branch: overview
 * - No path + other branch: tree at branch root
 */
export function repoBranchNavLocation(
  profileName: string | null,
  repo: string,
  branch: string,
  options?: {
    path?: string;
    view?: "tree" | "blob";
    defaultBranch?: string | null;
  }
): RepoBranchNavLocation {
  const path = (options?.path ?? "").replace(/^\/+|\/+$/g, "");
  const view = options?.view ?? "tree";
  const defaultBranch = options?.defaultBranch ?? null;

  if (path) {
    const splat = `${branch}/${path}`;
    if (view === "blob") {
      return profileName
        ? {
            to: "/$profileName/repos/$repo/blob/$",
            params: { profileName, repo, _splat: splat }
          }
        : { to: "/repos/$repo/blob/$", params: { repo, _splat: splat } };
    }
    return profileName
      ? {
          to: "/$profileName/repos/$repo/tree/$",
          params: { profileName, repo, _splat: splat }
        }
      : { to: "/repos/$repo/tree/$", params: { repo, _splat: splat } };
  }

  if (defaultBranch && branch === defaultBranch) {
    return profileName
      ? { to: "/$profileName/repos/$repo", params: { profileName, repo } }
      : { to: "/repos/$repo", params: { repo } };
  }

  return profileName
    ? {
        to: "/$profileName/repos/$repo/tree/$",
        params: { profileName, repo, _splat: branch }
      }
    : { to: "/repos/$repo/tree/$", params: { repo, _splat: branch } };
}

/**
 * Document-tab label for a repo explorer surface.
 * Root → `repo`; nested folder/file → `repo/basename` (e.g. `Obsidian/2- Tags`).
 */
export function repoExplorerTabTitle(repo: string, path = ""): string {
  const leaf = path
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)
    .at(-1);
  if (!leaf) return repo;
  return `${repo}/${leaf}`;
}

/** Icon surface for a repo document tab (overview / folder / file). */
export type RepoExplorerTabSurface = "repo" | "folder" | "file";

/**
 * Derive explorer surface from a stored tab URL.
 * - overview or tree at branch root → `repo`
 * - tree with path under ref → `folder`
 * - blob → `file`
 */
export function repoExplorerTabSurfaceFromUrl(url: string): RepoExplorerTabSurface {
  const path = (url.split("?")[0] ?? url).replace(/\/+$/, "");

  if (/\/blob\//.test(path)) return "file";

  const treeMatch = path.match(/\/tree\/(.+)$/);
  if (treeMatch?.[1]) {
    // splat is `ref` or `ref/path/to/dir`
    const afterRef = treeMatch[1].includes("/")
      ? treeMatch[1].slice(treeMatch[1].indexOf("/") + 1)
      : "";
    return afterRef.length > 0 ? "folder" : "repo";
  }

  return "repo";
}

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
