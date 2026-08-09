import {
  parseGithubRepoUrl,
  type ProjectGithubRepoPublic,
  type ProjectPublicOutput
} from "@tsu-stack/core";
import {
  createGitHubOctokit,
  getPrivateProfileRepos,
  getProfileRepos,
  resolvePublicGitHubSourceForUser,
  type GitHubUserRepoSummary
} from "@tsu-stack/github";

import { type OrpcContext } from "#@/lib/context/types";

/**
 * Attach tenant-owned GitHub repo metadata (name, fullName, isPrivate) to public projects.
 * Fail closed: unresolvable URLs / no GitHub config → empty githubRepos for that project.
 */
export async function enrichProjectsWithGithubRepos(
  projects: ProjectPublicOutput[],
  userId: string,
  context: OrpcContext
): Promise<ProjectPublicOutput[]> {
  if (projects.length === 0) return projects;

  const source = await resolvePublicGitHubSourceForUser(userId);
  if (!source.isConfigured) {
    return projects.map((p) => {
      return { ...p, githubRepos: [] };
    });
  }

  const octokit = createGitHubOctokit(source);
  const scoped: OrpcContext = {
    ...context,
    github: {
      ...context.github,
      source,
      publicOctokit: octokit,
      privateOctokit: octokit
    }
  };

  let repoSummaries: GitHubUserRepoSummary[] = [];
  try {
    repoSummaries = await getPrivateProfileRepos(scoped);
  } catch {
    try {
      repoSummaries = await getProfileRepos(scoped);
    } catch {
      repoSummaries = [];
    }
  }

  const byFullName = new Map<string, GitHubUserRepoSummary>(
    repoSummaries.map((r) => [r.fullName.toLowerCase(), r])
  );
  const ownerLower = source.owner.toLowerCase();

  return projects.map((project) => {
    return {
      ...project,
      githubRepos: resolveGithubReposForProject(project.repos, ownerLower, source.owner, byFullName)
    };
  });
}

function resolveGithubReposForProject(
  repos: string[],
  ownerLower: string,
  ownerDisplay: string,
  byFullName: Map<string, GitHubUserRepoSummary>
): ProjectGithubRepoPublic[] {
  const seen = new Set<string>();
  const out: ProjectGithubRepoPublic[] = [];

  for (const url of repos) {
    const parsed = parseGithubRepoUrl(url);
    if (!parsed) continue;
    if (parsed.owner.toLowerCase() !== ownerLower) continue;

    const key = `${parsed.owner}/${parsed.name}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const hit = byFullName.get(key);
    if (hit) {
      out.push({
        name: hit.name,
        fullName: hit.fullName,
        isPrivate: hit.isPrivate
      });
      continue;
    }

    // Tenant-owned URL not in the list: treat as private so guests never see a dead public link.
    out.push({
      name: parsed.name,
      fullName: `${ownerDisplay}/${parsed.name}`,
      isPrivate: true
    });
  }

  return out;
}

export async function enrichExperienceProjectsGithubRepos<
  T extends { projects: ProjectPublicOutput[] }
>(experiences: T[], userId: string, context: OrpcContext): Promise<T[]> {
  const allProjects = experiences.flatMap((e) => e.projects);
  if (allProjects.length === 0) return experiences;

  const enriched = await enrichProjectsWithGithubRepos(allProjects, userId, context);
  const byId = new Map(enriched.map((p) => [p.id, p]));

  return experiences.map((exp) => {
    return {
      ...exp,
      projects: exp.projects.map((p) => byId.get(p.id) ?? { ...p, githubRepos: [] })
    };
  });
}
