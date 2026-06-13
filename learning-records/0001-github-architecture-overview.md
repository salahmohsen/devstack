# Learning Record: GitHub Wrapper Architecture Overview

## Date

2026-06-10

## Context

First session studying the portfolio-v2 GitHub integration. Needed a high-level mental model of the system before diving into specific layers.

## Insight

The GitHub integration follows a strict 4-layer architecture with a clear data flow:

```
GitHub API (REST + GraphQL)
        ↓
@tsu-stack/github  (core package: Octokit client, cache engine, typed functions)
        ↓
@tsu-stack/api     (oRPC procedures: public + private routers)
        ↓
apps/server        (Hono routes + webhook endpoint + WebSocket signal relay DO)
        ↓
apps/web           (TanStack Start routes + React Query hooks + signal stream WS client)
```

Key architectural decisions:

1. **Local-first caching**: Every API call goes through `getGitHubResourceLocalFirst()` which checks DB cache first, uses ETag/304 for conditional requests, falls back on rate limits
2. **Runtime-agnostic core**: `GitHubRuntimeBindings` abstracts Cloudflare-specific features so the core package is portable to Node.js
3. **Public-only proxy**: The GitHub token is configured per-app (not per-user); all requests proxy through the server
4. **Real-time invalidation**: Webhooks signal cache invalidation via Durable Objects → WebSocket → React Query, plus a polling fallback
5. **Tab-based navigation**: Frontend GitHub pages use a VS Code-like tab system with per-tab invalidation scopes

## Consequences

- Future lessons should dig into specific layers one at a time
- The cache layer is the most important (and complex) part of the system
- To add a new GitHub feature, work needs to happen at all 4 layers (types → cache → oRPC → UI)
- The real-time invalidation system has 3 code paths: webhook → DO, polling fallback, and manual refresh

## Revision Notes

- (empty)
