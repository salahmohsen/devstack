import { type OctokitContributor } from "#@/repo/repo-contributors/repo-contributors.types";
import { type RepoContributor } from "#@/schemas";

export function mapOctokitContributor(c: OctokitContributor & { login: string }): RepoContributor {
  return {
    login: c.login,
    avatarUrl: c.avatar_url ?? "",
    contributions: c.contributions ?? 0
  };
}

export function parseLinkHeaderLastPage(linkHeader: string | undefined): number | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/page=(\d+)>; rel="last"/);
  return match ? Number(match[1]) : null;
}
