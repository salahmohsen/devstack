import { parseGithubRepoUrl, type ProjectPublicOutput } from "@tsu-stack/core";

type RepoIdentity = {
  name: string;
  fullName: string;
};

type ProjectRepoFields = Pick<ProjectPublicOutput, "repos" | "githubRepos">;

function addKey(keys: Set<string>, value: string) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed) keys.add(trimmed);
}

/** Name + owner/name keys a project can match a GitHub repo on. */
export function projectRepoKeys(project: ProjectRepoFields): Set<string> {
  const keys = new Set<string>();

  for (const url of project.repos) {
    const parsed = parseGithubRepoUrl(url);
    if (!parsed) continue;
    addKey(keys, parsed.name);
    addKey(keys, `${parsed.owner}/${parsed.name}`);
  }

  for (const repo of project.githubRepos ?? []) {
    addKey(keys, repo.name);
    addKey(keys, repo.fullName);
  }

  return keys;
}

export function repoMatchKeys(repo: RepoIdentity): string[] {
  return [repo.name.toLowerCase(), repo.fullName.toLowerCase()];
}

export function indexProjectsByRepo<T extends ProjectRepoFields>(projects: T[]): Map<string, T[]> {
  const index = new Map<string, T[]>();

  for (const project of projects) {
    for (const key of projectRepoKeys(project)) {
      const existing = index.get(key);
      if (existing) {
        if (!existing.includes(project)) existing.push(project);
      } else {
        index.set(key, [project]);
      }
    }
  }

  return index;
}

export function projectsForRepo<T extends ProjectRepoFields>(
  index: Map<string, T[]>,
  repo: RepoIdentity
): T[] {
  const seen = new Set<T>();
  const matched: T[] = [];

  for (const key of repoMatchKeys(repo)) {
    for (const project of index.get(key) ?? []) {
      if (seen.has(project)) continue;
      seen.add(project);
      matched.push(project);
    }
  }

  return matched;
}
