export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
  "skills",
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

export const RESERVED_USERNAME_PATH_SET = new Set<string>(RESERVED_USERNAME_PATHS);
