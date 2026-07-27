import { createContext, useContext } from "react";

export type GithubRepoRouteContextValue = {
  /** Portfolio identity for API scoping */
  profileName: string;
  /**
   * Path segment for Link targets:
   * - string → `/{profileName}/repos/...` (primary host)
   * - null → `/repos/...` (custom domain Host)
   */
  pathProfileName: string | null;
};

const GithubRepoRouteContext = createContext<GithubRepoRouteContextValue | null>(null);

export function GithubRepoRouteProvider({
  value,
  children
}: {
  value: GithubRepoRouteContextValue;
  children: React.ReactNode;
}) {
  return (
    <GithubRepoRouteContext.Provider value={value}>{children}</GithubRepoRouteContext.Provider>
  );
}

export function useGithubRepoRoute(): GithubRepoRouteContextValue {
  const ctx = useContext(GithubRepoRouteContext);
  if (!ctx) {
    throw new Error("useGithubRepoRoute must be used within GithubRepoRouteProvider");
  }
  return ctx;
}
