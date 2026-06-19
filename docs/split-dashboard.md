# Plan: Split `apps/web` into `apps/web` (public) + `apps/dashboard`

> Status: draft v2 — corrected after code-evidence critique. No code moves yet.

## 0. Context

`apps/web` currently ships both the public GitHub-themed portfolio site and the authenticated dashboard. The two surfaces share a single Cloudflare Worker (`portfolio-web`), one root `__protected` auth guard, and a shared `Route` tree under `{-$locale}/__protected/dashboard/`. The user wants:

- A dedicated `apps/dashboard` app, deployed to a separate subdomain.
- A `github-layout` (was `root-layout`) in `apps/web`, and a `dashboard-layout` in `apps/dashboard`.
- Shared components — especially the form pattern — extracted into a shared package so both apps use the same primitives.
- Auth removed from `apps/web` entirely. Auth lives in `apps/dashboard` only, for now.

## 1. Goals And Non-Goals

### Goals

1. Two independent TanStack Start apps: `apps/web` (public) and `apps/dashboard` (authed).
2. Each app has its own `wrangler.jsonc`, `vite.config.ts`, `tsconfig.json`, `__root.tsx`, `routeTree.gen.ts`, `components.json`, `public/`, `global.d.ts`.
3. Each app has its own scoped env objects (`ENV_DASHBOARD_ISOMORPHIC`, `ENV_DASHBOARD_SERVER`) — see §6.
4. A new shared package `@tsu-stack/forms` owns the form context, fields, `createFormHook` factory, and `createZodFormValidator`.
5. Small shared primitives (`DefaultLoader`, `useMediaQuery`) move to `packages/ui` where they already belong per `.agents/ui.md`.
6. Shared providers (`LoggerProvider`, `ProgressProvider`, `QueryClient` factory) move to a minimal `@tsu-stack/app` package — providers only, no UI.
7. Both apps keep the `{-$locale}` i18n route prefix and paraglide integration. See §3.1 for why.
8. Standardize the dashboard route files to the thin-route pattern from `.agents/tanstack-patterns.md` during the move. See §4.
9. Document the new layout naming, form package, and multi-app structure in `.agents/`.

### Non-Goals

- No auth changes beyond "remove from web, own in dashboard". Cross-app SSO, shared cookies, and migration of existing sessions are out of scope.
- No new feature work. Structural move plus standardization only.
- No changes to `packages/db`, `packages/api`, `packages/auth` server config.
- No visual or copy changes to the dashboard pages.

## 2. Critique Of v1 Plan — What Was Wrong

| #   | v1 flaw                                                              | Evidence                                                                                                                                                                                                                                                                                                                                                                                                 | Fix                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **"No `{-$locale}` prefix in dashboard"**                            | The i18n `Link` (`packages/i18n/src/tanstack-start/components/link.tsx:49`) ALWAYS prepends `/{-$locale}` to every `to`. `useNavigate` does the same (`hooks/use-navigate.ts:27`). The dashboard has **16 i18n imports** across its route files. Removing the prefix means rewriting every `Link`, `useNavigate`, `useLocation`, and the auth guard's `validateNavigateTo`/`getRouteTreePathsLocalized`. | Dashboard keeps `{-$locale}` prefix and paraglide plugin. The move becomes near-copy-paste instead of a rewrite.                                                                                                           |
| 2   | **`@tsu-stack/app` for `Container`, `DefaultLoader`, `ErrorLayout`** | `Container` is already in `packages/ui/components/container.tsx` — the app-local `shared/ui/container.tsx` is a 1-line re-export. `DefaultLoader` is 5 lines wrapping `DotmSquare18` from `@tsu-stack/ui`. `ErrorLayout` is 13 lines but references `--navbar-height` (app CSS var).                                                                                                                     | `DefaultLoader` → `packages/ui/components/`. `Container` → already there, just standardize imports. `ErrorLayout` → stays per-app (CSS var dep). `@tsu-stack/app` shrinks to providers + config only.                      |
| 3   | **`@tsu-stack/forms` framed as current need**                        | After the split, forms are used ONLY in `apps/dashboard` (auth + dashboard pages). The web app has zero forms. The sign-in form (`sign-in-form.tsx`) does NOT use `useAppForm` — it uses `authClient.signIn.social`/`passkey`.                                                                                                                                                                           | Be honest: `@tsu-stack/forms` is future-proofing so the web app can add forms (e.g., contact form) without duplicating the pattern. Still worth doing, but state the real motivation.                                      |
| 4   | **Didn't call out that dashboard routes are NOT thin**               | `projects/index.tsx` (138 lines), `projects/new.tsx` (221 lines), `projects/$projectId.tsx` (310 lines), `experiences/new.tsx`, `experiences/$experienceId.tsx`, `stacks/route.tsx` (101 lines) all have full page UI inline in route files. This violates `.agents/tanstack-patterns.md` §"Route Files Stay Thin". The public web pages follow the pattern (UI in `pages/`).                            | The move is the natural moment to standardize. Move inline UI to `pages/dashboard/<feature>/ui/` and keep routes thin. This is real work — size it.                                                                        |
| 5   | **Cross-app navigation not addressed**                               | The command palette has "Go to Dashboard" (`registry.ts:49`). The dashboard sidebar has "Overview" pointing to `/dashboard` (`app-sidebar.tsx:38`). After the split, these are cross-origin links (`<a href="https://dashboard.salahmohsen.com">`), not router `<Link>`.                                                                                                                                 | Use plain `<a>` for cross-app links. Document in `.agents/tanstack-patterns.md`.                                                                                                                                           |
| 6   | **Sign-in form callback URL**                                        | `sign-in-form.tsx:20` uses `ENV_WEB_ISOMORPHIC.VITE_WEB_URL` for the OAuth callback. In the dashboard, this must be `ENV_DASHBOARD_ISOMORPHIC.VITE_DASHBOARD_URL`.                                                                                                                                                                                                                                       | Update the callback URL helper to use the dashboard env.                                                                                                                                                                   |
| 7   | **Sign-in form links to `/terms-of-service` and `/privacy-policy`**  | `sign-in-form.tsx:116-122` links to web app routes. In the dashboard, these become cross-app links to the web app's URLs.                                                                                                                                                                                                                                                                                | Replace with `<a>` tags pointing to the web app's canonical URLs.                                                                                                                                                          |
| 8   | **`SortableList` classified as shared**                              | Only used in `projects/index.tsx` and `experiences/index.tsx` — both dashboard.                                                                                                                                                                                                                                                                                                                          | Moves to `apps/dashboard/src/shared/ui/sortable-list.tsx`. Not shared.                                                                                                                                                     |
| 9   | **`Logo` classified as shared**                                      | Only used in `create-an-account-form.tsx` — auth, which moves to dashboard.                                                                                                                                                                                                                                                                                                                              | Moves to `apps/dashboard/src/shared/ui/logo.tsx`. Not shared.                                                                                                                                                              |
| 10  | **`Markdown` not mentioned**                                         | Only used in `github-repo/ui/repo-markdown-files.tsx`. Stays in web.                                                                                                                                                                                                                                                                                                                                     | Explicitly mark as web-only.                                                                                                                                                                                               |
| 11  | **`Image` not mentioned**                                            | Only used in `playground/ui/playground-page.tsx`. Stays in web.                                                                                                                                                                                                                                                                                                                                          | Explicitly mark as web-only.                                                                                                                                                                                               |
| 12  | **Two `lib/` dirs not addressed**                                    | `src/lib/` (command-palette-icons, debug, github.query) and `src/shared/lib/` (everything else). Inconsistent with FSD.                                                                                                                                                                                                                                                                                  | Standardize: everything goes to `src/shared/lib/` in both apps.                                                                                                                                                            |
| 13  | **Empty dirs not addressed**                                         | `shared/api/`, `shared/query/`, `shared/types/` are all empty.                                                                                                                                                                                                                                                                                                                                           | Remove during the move.                                                                                                                                                                                                    |
| 14  | **`dashboard-bottombar` and `dashboard-side-panel` are misnamed**    | Both are used by the GITHUB layout (`root-layout.tsx:10,17,68`), not the dashboard layout.                                                                                                                                                                                                                                                                                                               | Rename to `github-bottombar.tsx` and `github-side-panel.tsx` in `apps/web`. The `dashboard-breadcrumbs` IS dashboard-only and moves.                                                                                       |
| 15  | **Command palette split was vague**                                  | `shared/lib/command-palette/` has generic infrastructure (registry, types, hooks) AND web-specific commands (Go to Pulls, Go to Issues, Open on GitHub).                                                                                                                                                                                                                                                 | Infrastructure (registry core, types, use-command-items, use-command-palette) → `packages/ui/lib/command-palette/`. Web-specific command registrations + icons → stay in `apps/web`. Dashboard gets its own registrations. |
| 16  | **`apps/web/components.json` vs `packages/ui/components.json`**      | Web has its own `components.json` pointing `components` alias to `@/shared/ui` — meaning shadcn can add components locally to the app. `packages/ui/components.json` points to `@tsu-stack/ui/components`. Per `.agents/ui.md`, shared shadcn components go in `packages/ui`.                                                                                                                            | Dashboard gets its own `components.json` mirroring web's pattern. Both apps' `components` alias should point to `@tsu-stack/ui/components` to enforce extraction per `.agents/ui.md`.                                      |
| 17  | **Health check, sitemap, robots not addressed**                      | `[_]api/health/live.ts`, `sitemap[.]xml.ts`, `robots[.]txt.ts` exist in web.                                                                                                                                                                                                                                                                                                                             | Dashboard gets its own `[_]api/health/live.ts`. Dashboard `robots.txt` → `Disallow: /` (no index). No sitemap for dashboard.                                                                                               |
| 18  | **`global.d.ts` and `.tanstack/` not addressed**                     | Each TanStack Start app needs its own generated `routeTree.gen.ts`, `.tanstack/` config, and `global.d.ts`.                                                                                                                                                                                                                                                                                              | Created automatically when the dashboard app is scaffolded with the tanstackStart plugin. Note it in the plan.                                                                                                             |
| 19  | **Docker/CI not fully addressed**                                    | `docker-compose.yaml`, `docker-compose.coolify.yaml`, `.github/` workflows need a dashboard service.                                                                                                                                                                                                                                                                                                     | Add dashboard service to both docker-compose files. Check CI workflows for app-specific steps.                                                                                                                             |

## 3. Corrected Architecture

### 3.1 i18n — Both Apps Keep `{-$locale}`

**Why:** The i18n `Link`, `useNavigate`, `useLocation`, `validateNavigateTo`, `getRouteTreePathsLocalized`, and `stripLocalePrefix` are all hard-wired to inject `LOCALE_ROUTE_PREFIX` (`{-$locale}`) into every path. The dashboard has 16 imports from `@tsu-stack/i18n/tanstack-start/*`. Removing the prefix would require rewriting every navigation call and the auth guard — high risk, zero benefit.

**Decision:** The dashboard keeps `{-$locale}` as its route prefix, configures the paraglide vite plugin (same locales or a single locale), and copies the locale validation/redirect logic from `apps/web/src/routes/{-$locale}/route.tsx`.

**What this means for the move:** Dashboard route files can be copied near-verbatim. Only import paths change (`@/pages/dashboard/...` stays the same pattern; `@tsu-stack/i18n/...` stays the same).

### 3.2 New package: `@tsu-stack/forms`

Path: `packages/forms/`.

**Honest motivation:** After the split, forms are used only in `apps/dashboard`. The web app has no forms today. We extract to a shared package so that when the web app adds forms (contact, newsletter, etc.), it uses the same pattern. This is future-proofing, not current-need.

**Files (moved from `apps/web/src/shared/form/` and `apps/web/src/shared/lib/zod-form-validator.ts`):**

```
packages/forms/
  package.json
  tsconfig.json
  src/
    index.ts                    // barrel
    form-contexts.ts            // createFormHookContexts()
    form.ts                     // createFormHook({ fieldComponents, formComponents })
    input-field.tsx
    password-input-field.tsx
    rich-text-field.tsx
    date-picker-field.tsx
    submit-button.tsx
    zod-form-validator.ts
```

**Dependencies:** `@tanstack/react-form` (catalog), `zod` (catalog). Peer: `react`, `react-dom`. Imports from `@tsu-stack/ui/components/{field,input,password-input,button,date-picker,rich-text-editor}` and `@tsu-stack/ui/lib/utils`.

**Public API** (matches current `apps/web/src/shared/form/index.ts`):

```ts
export { useAppForm, withForm, withFieldGroup } from "./form";
export { useFieldContext, useFormContext, fieldContext, formContext } from "./form-contexts";
export { InputField } from "./input-field";
export { PasswordInputField } from "./password-input-field";
export { RichTextField } from "./rich-text-field";
export { DatePickerField } from "./date-picker-field";
export { SubmitButton } from "./submit-button";
export { createZodFormValidator } from "./zod-form-validator";
```

### 3.3 Minimal `@tsu-stack/app` — Providers Only

Path: `packages/app/`. Contains ONLY shared providers and the QueryClient factory. No UI components.

```
packages/app/
  package.json
  src/
    index.ts
    providers/
      logger-provider.tsx         // from apps/web/src/shared/providers/logger-provider.tsx
      progress.provider.tsx       // from apps/web/src/shared/providers/progress.provider.tsx
      query-client.provider.tsx   // factory + provider ONLY; no GitHub persistence
```

**What stays app-local:**

- `apps/web/src/shared/lib/github-query-persistence.tsx` — wraps the shared `AppQueryClientProvider` locally in `apps/web/src/router.tsx`. Web-only concern (GitHub tab cache).
- `apps/dashboard` — uses the shared provider directly, no persistence wrapper for v1.

**What does NOT go in `@tsu-stack/app`:**

- `Container` — already in `packages/ui/components/container.tsx`. Standardize imports to `@tsu-stack/ui/components/container` directly. Delete the 1-line re-export.
- `DefaultLoader` — 5-line wrapper around `DotmSquare18`. Move to `packages/ui/components/default-loader.tsx`.
- `ErrorLayout` — 13 lines, depends on `--navbar-height` CSS var (app-specific). Stays per-app.
- `Logo` — only used in auth form. Moves to `apps/dashboard/src/shared/ui/logo.tsx`.
- `useMediaQuery` — move to `packages/ui/hooks/use-media-query.ts`.
- `seo.ts` — parameterized per-app, no shared package needed. Each app has its own `shared/lib/seo.ts` wrapping `@tsu-stack/seo`.
- `app.config.ts` — per-app. Each app has its own.

### 3.4 Command Palette Split

**Infrastructure (generic) → `packages/ui/lib/command-palette/`:**

- `registry.ts` (core functions: `registerCommands`, `getRegisteredCommands`, `subscribeCommands` — WITHOUT the web-specific command registrations at the bottom)
- `types.ts` (generic `CommandItem`, `CommandAction` types)
- `use-command-items.ts` (generic hook)
- `use-command-palette.ts` (generic hook)

**Web-specific → stays in `apps/web/src/shared/lib/command-palette/`:**

- `registry.ts` web command registrations (Go to Repos, Pulls, Issues, Reviews, Settings, Open on GitHub)
- `use-refresh-github-data.ts`
- `apps/web/src/lib/command-palette-icons.tsx` → move to `apps/web/src/shared/lib/command-palette-icons.tsx` (fix the dual-lib-dir issue)

**Dashboard-specific → `apps/dashboard/src/shared/lib/command-palette/`:**

- `registry.ts` dashboard command registrations (Go to Overview, Projects, Experiences, Stacks, Settings)
- Dashboard-specific icons

**Shell component → `packages/ui/components/command-palette.tsx`:**

- The `CommandPalette` component (currently `apps/web/src/widgets/layout/ui/command-palette.tsx`) minus the static command registrations. Each app renders the shell and registers its own commands at module scope.

### 3.5 CSS And Styles

- `apps/web/src/shared/styles/{app.css,fonts.css,theme.css}` — stay per-app. The dashboard copies these files. Both apps import from their own `shared/styles/app.css`.
- `packages/ui/styles/globals.css` — already shared, no change.
- `--navbar-height` CSS var — used by `ErrorLayout` and `RootDocument`. Both apps define it in their own `app.css` or `theme.css`.

## 4. Standardization: Thin Routes For Dashboard

The current dashboard route files violate `.agents/tanstack-patterns.md` §"Route Files Stay Thin". During the move, refactor each inline-page route to the thin pattern:

| Current route file (inline UI)                              | After move: route file (thin)                                                   | After move: page file                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `__protected/dashboard/projects/index.tsx` (138 lines)      | `routes/{-$locale}/(dashboard-layout)/dashboard/projects/index.tsx` (~20 lines) | `pages/dashboard/projects/ui/projects-list-page.tsx`         |
| `__protected/dashboard/projects/new.tsx` (221 lines)        | `routes/.../projects/new.tsx` (~15 lines)                                       | `pages/dashboard/projects/ui/new-project-page.tsx`           |
| `__protected/dashboard/projects/$projectId.tsx` (310 lines) | `routes/.../projects/$projectId.tsx` (~15 lines)                                | `pages/dashboard/projects/ui/edit-project-page.tsx`          |
| `__protected/dashboard/experiences/index.tsx`               | `routes/.../experiences/index.tsx` (~20 lines)                                  | `pages/dashboard/experiences/ui/experiences-list-page.tsx`   |
| `__protected/dashboard/experiences/new.tsx`                 | `routes/.../experiences/new.tsx` (~15 lines)                                    | `pages/dashboard/experiences/ui/new-experience-page.tsx`     |
| `__protected/dashboard/experiences/$experienceId.tsx`       | `routes/.../experiences/$experienceId.tsx` (~15 lines)                          | `pages/dashboard/experiences/ui/edit-experience-page.tsx`    |
| `__protected/dashboard/stacks/route.tsx` (101 lines)        | `routes/.../stacks/index.tsx` (~20 lines)                                       | `pages/dashboard/stacks/ui/stacks-list-page.tsx`             |
| `__protected/dashboard/index.tsx` (already thin)            | `routes/.../dashboard/index.tsx` (no change)                                    | `pages/dashboard/ui/dashboard-page.tsx` (already exists)     |
| `__protected/dashboard/github-config/route.tsx`             | `routes/.../github-config/index.tsx` (~15 lines)                                | `pages/dashboard/ui/github-config-form.tsx` (already exists) |

**Also standardize mutations:** `projects/new.tsx`, `projects/$projectId.tsx`, `experiences/new.tsx`, `experiences/$experienceId.tsx` all have inline `useMutation(orpc...)`. Extract to:

- `pages/dashboard/projects/api/create-project.mutation.ts`
- `pages/dashboard/projects/api/update-project.mutation.ts`
- `pages/dashboard/projects/api/delete-project.mutation.ts`
- `pages/dashboard/projects/api/reorder-projects.mutation.ts`
- `pages/dashboard/experiences/api/*.mutation.ts` (same pattern)

This matches the existing `pages/dashboard/api/update-app-settings.mutation.ts` pattern.

## 5. File Move Map (Corrected)

### 5.1 Dashboard-bound (move to `apps/dashboard`)

| Source                                                 | Destination                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| `routes/{-$locale}/__protected/dashboard/**`           | `routes/{-$locale}/(dashboard-layout)/dashboard/**`             |
| `routes/{-$locale}/__protected/route.tsx` (auth guard) | Logic moves to `routes/{-$locale}/(dashboard-layout)/route.tsx` |
| `pages/dashboard/**`                                   | `pages/dashboard/**` (same structure, refactored per §4)        |
| `features/auth/**`                                     | `features/auth/**`                                              |
| `widgets/layout/ui/dashboard-layout.tsx`               | `widgets/layout/ui/dashboard-layout.tsx`                        |
| `widgets/layout/ui/dashboard-breadcrumbs.tsx`          | `widgets/layout/ui/dashboard-breadcrumbs.tsx`                   |
| `widgets/layout/ui/command-palette.tsx`                | `widgets/layout/ui/command-palette.tsx` (dashboard commands)    |
| `shared/ui/app-sidebar.tsx`                            | `shared/ui/app-sidebar.tsx`                                     |
| `shared/ui/nav-main.tsx`                               | `shared/ui/nav-main.tsx`                                        |
| `shared/ui/nav-user.tsx`                               | `shared/ui/nav-user.tsx`                                        |
| `shared/ui/team-switcher.tsx`                          | `shared/ui/team-switcher.tsx`                                   |
| `shared/ui/sortable-list.tsx`                          | `shared/ui/sortable-list.tsx`                                   |
| `shared/ui/logo.tsx`                                   | `shared/ui/logo.tsx`                                            |
| `shared/lib/warning-store.ts`                          | `shared/lib/warning-store.tsx` (if dashboard needs warnings)    |
| `pages/default-error/**`                               | `pages/default-error/**` (copy — both apps need error pages)    |
| `pages/default-not-found/**`                           | `pages/default-not-found/**` (copy)                             |
| `shared/styles/{app.css,fonts.css,theme.css}`          | `shared/styles/` (copy)                                         |

### 5.2 Shared (move to packages)

| Source                                                                 | Destination                                              |
| ---------------------------------------------------------------------- | -------------------------------------------------------- |
| `shared/form/**`                                                       | `packages/forms/src/**`                                  |
| `shared/lib/zod-form-validator.ts`                                     | `packages/forms/src/zod-form-validator.ts`               |
| `shared/providers/logger-provider.tsx`                                 | `packages/app/src/providers/logger-provider.tsx`         |
| `shared/providers/progress.provider.tsx`                               | `packages/app/src/providers/progress.provider.tsx`       |
| `shared/providers/query-client.provider.tsx` (factory + provider only) | `packages/app/src/providers/query-client.provider.tsx`   |
| `shared/ui/default-loader.tsx`                                         | `packages/ui/components/default-loader.tsx`              |
| `shared/lib/use-media-query.ts`                                        | `packages/ui/hooks/use-media-query.ts`                   |
| `shared/lib/command-palette/registry.ts` (core only)                   | `packages/ui/lib/command-palette/registry.ts`            |
| `shared/lib/command-palette/types.ts`                                  | `packages/ui/lib/command-palette/types.ts`               |
| `shared/lib/command-palette/use-command-items.ts`                      | `packages/ui/lib/command-palette/use-command-items.ts`   |
| `shared/lib/command-palette/use-command-palette.ts`                    | `packages/ui/lib/command-palette/use-command-palette.ts` |
| `widgets/layout/ui/command-palette.tsx` (shell only)                   | `packages/ui/components/command-palette.tsx`             |

### 5.3 Web-only (stays in `apps/web`, renamed)

| Source                                           | Change                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `widgets/layout/ui/root-layout.tsx`              | Rename file → `github-layout.tsx`, export → `GithubLayout`                            |
| `widgets/layout/ui/dashboard-bottombar.tsx`      | Rename → `github-bottombar.tsx` (used by github layout, not dashboard)                |
| `widgets/layout/ui/dashboard-side-panel.tsx`     | Rename → `github-side-panel.tsx` (used by github layout, not dashboard)               |
| `widgets/layout/ui/github-public-topbar.tsx`     | No change                                                                             |
| `widgets/layout/ui/github-public-mobile-nav.tsx` | No change                                                                             |
| `widgets/layout/ui/github-public-tabs.tsx`       | No change                                                                             |
| `widgets/layout/ui/github-access-dialog.tsx`     | No change                                                                             |
| `widgets/layout/ui/extension-install-prompt.tsx` | No change                                                                             |
| `shared/ui/container.tsx`                        | DELETE (1-line re-export — import from `@tsu-stack/ui/components/container` directly) |
| `shared/ui/error-layout.tsx`                     | Stays (CSS var dep)                                                                   |
| `shared/ui/markdown.tsx`                         | Stays (web-only)                                                                      |
| `shared/ui/image.tsx`                            | Stays (web-only, playground)                                                          |
| `shared/ui/repository-row.tsx`                   | Stays (web-only)                                                                      |
| `shared/ui/file-search-card.tsx`                 | Stays (web-only)                                                                      |
| `shared/ui/repo-commit-sparkline*.tsx`           | Stays (web-only)                                                                      |
| `shared/lib/**` (github-specific)                | Stays                                                                                 |
| `src/lib/**`                                     | Move to `src/shared/lib/` (fix dual-lib-dir issue)                                    |
| `shared/api/`, `shared/query/`, `shared/types/`  | DELETE (empty)                                                                        |
| `routes/{-$locale}/(github-layout)/(guest)/**`   | DELETE (auth removed from web)                                                        |
| `routes/{-$locale}/__protected/**`               | DELETE (moved to dashboard)                                                           |
| `features/github/**`                             | Stays                                                                                 |

## 6. Env, Tooling, Deploy

### 6.1 Env

New scoped objects in `packages/env/src/dashboard/`:

- `ENV_DASHBOARD_ISOMORPHIC`: `VITE_DASHBOARD_URL`, `VITE_SERVER_URL`, `VITE_IMGPROXY_URL?`
- `ENV_DASHBOARD_SERVER`: `NODE_ENV`, `SOURCE_COMMIT`, `IS_BUILD`

Update in six places per `.agents/environment-variables.md`:

1. `packages/env/src/dashboard/` — new Zod validation
2. `docker-compose.yaml` + `docker-compose.coolify.yaml` — add dashboard service
3. `apps/dashboard/Dockerfile` — `ARG` + `ENV` for dashboard vars
4. `packages/env/.env.example` — add dashboard placeholders
5. `.github/README.md` — document new vars
6. `apps/dashboard/vite.config.ts` — `define` for build-time injection

### 6.2 Workspace scripts

Update root `package.json`:

- `deploy:dashboard` → `vp run --filter @tsu-stack/dashboard deploy`
- `logs:dashboard` → `vp run --filter @tsu-stack/dashboard logs`
- `dev` stays `pnpm -r --parallel dev` (workspace glob picks up the new app)
- `deploy` → `pnpm run deploy:server && pnpm run deploy:web && pnpm run deploy:dashboard`

### 6.3 Wrangler

`apps/dashboard/wrangler.jsonc`:

- `name`: `portfolio-dashboard`
- `routes`: `[{ "pattern": "dashboard.salahmohsen.com/*", "zone_name": "salahmohsen.com" }]`
- `vars`: `VITE_SERVER_URL`, `VITE_DASHBOARD_URL`
- Same `compatibility_flags` as web (`nodejs_compat`)
- Same `observability` config

### 6.4 Per-app files to create

Each TanStack Start app needs:

- `apps/dashboard/src/global.d.ts` (copy from web, adjust)
- `apps/dashboard/.tanstack/` (auto-generated on first dev/build)
- `apps/dashboard/src/routeTree.gen.ts` (auto-generated)
- `apps/dashboard/components.json` (shadcn config, `components` alias → `@tsu-stack/ui/components`)
- `apps/dashboard/public/` (favicon, etc. — copy from web or create new)
- `apps/dashboard/src/routes/[_]api/health/live.ts` (health check)
- `apps/dashboard/src/routes/robots[.]txt.ts` (`Disallow: /`)

## 7. Cross-App Navigation

After the split, the two apps are on different origins. Router `<Link>` only works within the same app. Cross-app links use plain `<a>`:

| Link                                      | From             | To                                  | Implementation                                     |
| ----------------------------------------- | ---------------- | ----------------------------------- | -------------------------------------------------- |
| "Dashboard" in web topbar/command palette | `apps/web`       | `https://dashboard.salahmohsen.com` | `<a href={ENV_WEB_ISOMORPHIC.VITE_DASHBOARD_URL}>` |
| "Back to site" in dashboard sidebar       | `apps/dashboard` | `https://salahmohsen.com`           | `<a href={ENV_DASHBOARD_ISOMORPHIC.VITE_WEB_URL}>` |

Add `VITE_DASHBOARD_URL` to `ENV_WEB_ISOMORPHIC` and `VITE_WEB_URL` to `ENV_DASHBOARD_ISOMORPHIC` so each app knows the other's URL.

Document in `.agents/tanstack-patterns.md`: "Cross-app links use `<a>` with the env-provided URL, not router `<Link>`."

## 8. Execution Plan (in order)

1. **Scaffold `apps/dashboard`**: `package.json`, `wrangler.jsonc`, `vite.config.ts` (with paraglide plugin, tanstackStart, tailwindcss — NO shiki stub, NO oh-image), `tsconfig.json`, `Dockerfile`, `components.json`, `public/`, `global.d.ts`. Run `vp check` to verify the skeleton compiles.

2. **Create `packages/forms`**: Move form files. Update `packages/forms/package.json` with correct deps. Run `vp check` inside the package.

3. **Create `packages/app`**: Move providers (logger, progress, query-client factory). Run `vp check`.

4. **Move shared primitives to `packages/ui`**: `DefaultLoader` → `components/default-loader.tsx`. `useMediaQuery` → `hooks/use-media-query.ts`. Command palette infrastructure → `lib/command-palette/`. Run `vp check` inside `packages/ui`.

5. **Add env files**: `packages/env/src/dashboard/{env.isomorphic.ts,env.server.ts}`. Update `.env.example`, docker-compose files, Dockerfiles, `.github/README.md`.

6. **Wire `apps/dashboard` providers and config**: `router.tsx`, `server.ts`, `start.ts`, `__root.tsx`, `{-$locale}/route.tsx` (locale validation), `(dashboard-layout)/route.tsx` (auth guard + DashboardLayout). Copy from web and adjust.

7. **Move dashboard pages** (with thin-route refactoring per §4): Move each route file + extract page UI to `pages/`. Extract inline mutations to `api/` files. This is the largest step.

8. **Move dashboard widgets and shared UI**: `DashboardLayout`, `DashboardBreadcrumbs`, `AppSidebar`, `NavMain`, `NavUser`, `TeamSwitcher`, `SortableList`, `Logo`. Move command palette shell + dashboard commands.

9. **Move auth to dashboard**: `features/auth/` (sign-in-form, create-an-account-form). Update sign-in form: `VITE_WEB_URL` → `VITE_DASHBOARD_URL` for callback. Replace `/terms-of-service` and `/privacy-policy` links with cross-app `<a>` to web app URLs.

10. **Clean up `apps/web`**: Delete `__protected/**`, `(guest)/**`, `features/auth/`, `shared/form/`, `shared/providers/` (moved), `shared/ui/container.tsx` (re-export), `shared/ui/default-loader.tsx` (moved), `shared/ui/{app-sidebar,nav-main,nav-user,team-switcher,sortable-list,logo}.tsx` (moved), `shared/lib/zod-form-validator.ts` (moved), `shared/lib/use-media-query.ts` (moved), `shared/lib/command-palette/{registry,types,use-command-items,use-command-palette}.ts` (moved), empty dirs (`shared/api/`, `shared/query/`, `shared/types/`). Move `src/lib/` contents into `src/shared/lib/`.

11. **Rename in `apps/web`**: `root-layout.tsx` → `github-layout.tsx` (export `GithubLayout`). `dashboard-bottombar.tsx` → `github-bottombar.tsx`. `dashboard-side-panel.tsx` → `github-side-panel.tsx`. Update `widgets/layout/index.ts` barrel. Update `(github-layout)/route.tsx` import. Update `__root.tsx` to remove auth prefetch.

12. **Fix cross-app navigation**: Add "Dashboard" link to web topbar (plain `<a>`). Add "Back to site" link to dashboard sidebar (plain `<a>`). Add `VITE_DASHBOARD_URL` to web env, `VITE_WEB_URL` to dashboard env.

13. **Update root `package.json` scripts**: `deploy:dashboard`, `logs:dashboard`.

14. **Update `.agents/` docs**:
    - `.agents/tanstack-patterns.md` — add multi-app section, `(dashboard-layout)` convention, cross-app `<a>` links.
    - New `.agents/forms.md` — form pattern (useAppForm, AppField → field.\*Field, createZodFormValidator).
    - `.agents/ui.md` — note `DefaultLoader` and `useMediaQuery` now in `packages/ui`.
    - `.agents/auth.md` — note auth is dashboard-only, cross-app cookie gap is deferred.
    - `.agents/end-to-end-features.md` — note dashboard work is in `apps/dashboard`.

15. **Validate**: `vp check` per package → `vp run -w fix` → `vp run build` for both apps. Manual: visit web (no auth UI), visit dashboard (sign-in → dashboard → sign-out).

## 9. Validation

- `rg "__protected|\(guest\)" apps/web/src/routes` → empty (web has no auth routes)
- `rg "@/shared/form" apps/web apps/dashboard` → empty (both use `@tsu-stack/forms`)
- `rg "@/shared/providers/" apps/web apps/dashboard` → empty (both use `@tsu-stack/app`)
- `rg "ENV_WEB_ISOMORPHIC" apps/dashboard` → empty (dashboard uses its own env)
- `rg "ENV_DASHBOARD" apps/web` → only in cross-app link (`VITE_DASHBOARD_URL`)
- `vp run build` for both apps passes
- Manual: web loads without auth UI, dashboard requires sign-in, forms work in dashboard

## 10. Risks And Gotchas

- **GitHub query cache persistence** is wired into the current `createAppQueryClient`. The shared factory in `@tsu-stack/app` has no persistence. The web app wraps it locally. Forgetting the wrapper means web tabs lose their cache on reload.
- **`dashboard-bottombar` and `dashboard-side-panel` are used by the GITHUB layout**, not the dashboard. The rename to `github-*` is important to prevent confusion.
- **The i18n `Link` always prepends `{-$locale}`**. Both apps must have the prefix in their route trees. Do not try to strip it.
- **Cross-app links are `<a>`, not `<Link>`**. Router `Link` only works within the same app. Using `Link` for cross-app nav will generate `/{-$locale}/https://dashboard.salahmohsen.com` — broken.
- **Sign-in form OAuth callback** must use `VITE_DASHBOARD_URL`, not `VITE_WEB_URL`. The callback URL tells GitHub OAuth where to redirect after auth.
- **`RichTextField` pulls in TipTap** via `@tsu-stack/ui/components/rich-text-editor`. Tree-shaking handles this — apps that don't use `RichTextField` won't bundle it.
- **Cookie domain**: per user's decision, no cross-app auth for now. A user signed in to the dashboard has no session on the public site. Document this in `.agents/auth.md`.
- **Dev port**: dashboard needs its own `server.port` in `vite.config.ts` (e.g., `3001`). Web stays `3000`.
- **`routeTree.gen.ts`**: auto-generated by TanStack Start on first dev/build. Don't hand-edit. Each app has its own.

## 11. Open Questions

1. Dashboard dev port: `3001`? Document in `apps/dashboard/vite.config.ts`.
2. Dashboard branding: same favicon/logo as web, or its own? Affects `public/` and `logo.tsx`.
3. Dashboard locales: same set as web, or single-locale only? If single-locale, paraglide still works but generates fewer messages.
4. `warning-store.ts`: used by `dashboard-bottombar` (which stays in web). Does the dashboard need its own warning store? Probably not for v1.
5. CI/CD: do GitHub Actions workflows need a dashboard deploy job? Check `.github/workflows/`.
