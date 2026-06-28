export const githubCachePolicy = {
  viewer: {
    staleTimeMs: 5 * 60 * 1000,
    gcTimeMs: 24 * 60 * 60 * 1000
  },
  reposList: {
    // Short stale window so a fresh OAuth token (new `repo` scope) or a
    // code fix to the fetcher takes effect quickly without waiting out
    // the full 2-minute window. Once the project form is verified to
    // list private repos end-to-end, this can be raised back up.
    staleTimeMs: 15 * 1000,
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
