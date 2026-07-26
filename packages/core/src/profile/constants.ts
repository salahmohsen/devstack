export const PROFILE_NAME_MIN = 3;
export const PROFILE_NAME_MAX = 30;
export const PROFILE_NAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** First path segment reserved — never a profileName */
export const RESERVED_PROFILE_PATHS = [
  "app",
  "api",
  "dashboard",
  "settings",
  "login",
  "sign-in",
  "signup",
  "create-an-account",
  "admin",
  "jobs",
  "applications",
  "resumes",
  "stacks",
  "projects",
  "experiences",
  "onboarding",
  "health",
  "assets",
  "static",
  "www",
  "mail",
  "support",
  "help",
  "privacy-policy",
  "terms-of-service",
  "repos",
  "playground",
  "invite",
  "account",
  "profile"
] as const;

export const RESERVED_PROFILE_PATH_SET = new Set<string>(RESERVED_PROFILE_PATHS);
