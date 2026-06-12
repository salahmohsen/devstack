import { type AuthSession } from "@tsu-stack/auth/index";
import { type GitHubRuntimeBindings } from "@tsu-stack/github";
import { type RequestLogger } from "@tsu-stack/logger/server";

export type OrpcContext = {
  github: GitHubRuntimeBindings;
  session: AuthSession | null;
  logger: RequestLogger;
};
