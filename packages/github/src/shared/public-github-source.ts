import { appSettingsRepository } from "@tsu-stack/db/repositories";

export type PublicGitHubSource =
  | {
      isConfigured: false;
      reason: "missing_github_settings";
    }
  | {
      isConfigured: true;
      owner: string;
      token: string;
    };

export async function resolvePublicGitHubSource(): Promise<PublicGitHubSource> {
  const settings = await appSettingsRepository.findPublicGithubSourceSettings();
  const owner = settings?.githubUsername?.trim();
  const token = settings?.githubToken?.trim();

  if (!owner || !token) {
    return {
      isConfigured: false,
      reason: "missing_github_settings"
    };
  }

  return {
    isConfigured: true,
    owner,
    token
  };
}
