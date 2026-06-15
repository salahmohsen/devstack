import { appSettingsRepository } from "@tsu-stack/db/repositories";

const DEBUG_TAG = "23478236498372";

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
  console.debug(`[${DEBUG_TAG}] resolvePublicGitHubSource:findPublicGithubSourceSettings:start`);
  const settings = await appSettingsRepository.findPublicGithubSourceSettings();
  console.debug(`[${DEBUG_TAG}] resolvePublicGitHubSource:findPublicGithubSourceSettings:ok`, {
    hasSettings: Boolean(settings),
    hasGithubToken: Boolean(settings?.githubToken),
    githubUsername: settings?.githubUsername ?? null
  });
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
