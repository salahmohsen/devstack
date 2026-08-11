export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** @deprecated Use USERNAME_MIN */
export const PROFILE_NAME_MIN = USERNAME_MIN;
/** @deprecated Use USERNAME_MAX */
export const PROFILE_NAME_MAX = USERNAME_MAX;
/** @deprecated Use USERNAME_REGEX */
export const PROFILE_NAME_REGEX = USERNAME_REGEX;

/** First path segment reserved — never a public username handle */
export const RESERVED_USERNAME_PATHS = [
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
  "profile",
  "media"
] as const;

/** @deprecated Use RESERVED_USERNAME_PATHS */
export const RESERVED_PROFILE_PATHS = RESERVED_USERNAME_PATHS;

export const RESERVED_USERNAME_PATH_SET = new Set<string>(RESERVED_USERNAME_PATHS);

/** @deprecated Use RESERVED_USERNAME_PATH_SET */
export const RESERVED_PROFILE_PATH_SET = RESERVED_USERNAME_PATH_SET;
