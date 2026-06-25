import { githubConfigRepository } from "@tsu-stack/db/repositories";

export type PublicGitHubSource =
  | {
      isConfigured: false;
      reason: "missing_github_configuration";
    }
  | {
      isConfigured: true;
      owner: string;
      token: string;
    };

export async function resolvePublicGitHubSource(): Promise<PublicGitHubSource> {
  const settings = await githubConfigRepository.findPublicGithubSourceSettings();
  const owner = settings?.githubUsername?.trim();
  const token = settings?.githubToken?.trim();

  if (!owner || !token) {
    return {
      isConfigured: false,
      reason: "missing_github_configuration"
    };
  }

  return {
    isConfigured: true,
    owner,
    token
  };
}
