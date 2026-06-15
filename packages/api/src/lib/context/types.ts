import { type AuthSession } from "@tsu-stack/auth/index";
import { type GitHubContext } from "@tsu-stack/github/infrastructure/octokit/client";
import { type RequestLogger } from "@tsu-stack/logger/server";

export type OrpcContext = {
  github: GitHubContext;
  session: AuthSession | null;
  logger: RequestLogger;
};
