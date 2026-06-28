export const githubCachePolicy = {
  viewer: {
    staleTimeMs: 5 * 60 * 1000,
    gcTimeMs: 24 * 60 * 60 * 1000
  },
  reposList: {
    // Temporary 5-second stale window so we can iterate on the GitHub
    // token-scope / cache / fetcher changes without waiting out a long
    // window. Once the project form is verified to list private repos
    // end-to-end, this should be raised back to a few minutes.
    staleTimeMs: 5 * 1000,
    gcTimeMs: 12 * 60 * 60 * 1000
  },
  list: {
    staleTimeMs: 30 * 1000,
    gcTimeMs: 60 * 60 * 1000
  },
  /** User-scoped "My pulls/issues/reviews" aggregates */
  mine: {
    staleTimeMs: 10 * 1000,
    gcTimeMs: 15 * 60 * 1000
  },
  detail: {
    staleTimeMs: 5 * 1000,
    gcTimeMs: 10 * 60 * 1000
  },
  activity: {
    staleTimeMs: 5 * 1000,
    gcTimeMs: 10 * 60 * 1000
  },
  userActivity: {
    staleTimeMs: 60 * 1000,
    gcTimeMs: 30 * 60 * 1000
  },
  status: {
    staleTimeMs: 5 * 1000,
    gcTimeMs: 5 * 60 * 1000
  },
  workflowRun: {
    staleTimeMs: 5 * 1000,
    gcTimeMs: 5 * 60 * 1000
  },
  contributions: {
    staleTimeMs: 15 * 60 * 1000,
    gcTimeMs: 24 * 60 * 60 * 1000
  },
  repoMeta: {
    staleTimeMs: 60 * 60 * 1000,
    gcTimeMs: 24 * 60 * 60 * 1000
  },
  repoParticipation: {
    staleTimeMs: 15 * 60 * 1000,
    gcTimeMs: 24 * 60 * 60 * 1000
  },
  installationAccess: {
    staleTimeMs: 5 * 60 * 1000,
    gcTimeMs: 24 * 60 * 60 * 1000
  },
  repoProtection: {
    staleTimeMs: 5 * 60 * 1000,
    gcTimeMs: 24 * 60 * 60 * 1000
  }
} as const;
