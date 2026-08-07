---
name: shadcn-registries
description: Search and discover components across all open-source shadcn registries (official directory index + Shoogle meta-search + project-configured namespaces). Use when looking for UI blocks/components outside the local stack, comparing community registries, finding installable @namespace/item packages, or when the user mentions shadcn registries, registry search, shoogle, or "search all registries".
---

# shadcn registries (full index search)

This skill unlocks search across the **official open-source registry directory** (~267 namespaces), not only the registries listed in `components.json`.

## Why this exists

| Surface                                   | Coverage                                           | Notes                                                                    |
| ----------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| shadcn MCP (`search_items_in_registries`) | **Only** namespaces in the local `components.json` | Fast for project defaults (`@coss`, `@hextaui`, …)                       |
| Official index                            | All public directory namespaces                    | https://ui.shadcn.com/r/registries.json                                  |
| Shoogle                                   | Cross-registry meta-search                         | Fast discovery; install args usually point at the real `@namespace/item` |

Prefer **coss** for primitives in this monorepo (see `coss` / `coss-particles` skills). Use this skill when exploring community blocks, alternate kits, or non-coss patterns.

## Source of truth

- Directory docs: https://ui.shadcn.com/docs/registry/registry-index
- Index JSON: https://ui.shadcn.com/r/registries.json
- Project configs: `packages/ui/components.json`, `apps/web/components.json`
- Search script: `./scripts/search.mjs`

## Workflow

### 1. Prefer project / coss first

```bash
node .agents/skills/shadcn-registries/scripts/search.mjs search "<query>" --mode project --limit 20
```

Or use the shadcn MCP against configured registries.

### 2. Fast cross-registry discovery (default)

```bash
node .agents/skills/shadcn-registries/scripts/search.mjs search "<query>" --mode shoogle --limit 40
```

### 3. Exhaustive search across the full official index

Slower (parallel CLI fan-out; skips dead registries):

```bash
node .agents/skills/shadcn-registries/scripts/search.mjs search "<query>" --mode all --limit 40 --concurrency 8
```

Target known namespaces:

```bash
node .agents/skills/shadcn-registries/scripts/search.mjs search "calendar" --registries @coss,@aceternity,@animate-ui --limit 30
```

### 4. List / inspect registries

```bash
node .agents/skills/shadcn-registries/scripts/search.mjs list --query motion --limit 20
node .agents/skills/shadcn-registries/scripts/search.mjs info @aceternity
```

### 5. Install

```bash
# from packages/ui (preferred for shared UI) or apps/web
pnpm dlx shadcn@latest add <addCommandArgument> -c packages/ui
```

Add a registry to the project permanently only when you will reuse it:

```bash
pnpm dlx shadcn@latest registry add @aceternity -c packages/ui
```

Namespaces from the official directory resolve automatically for one-off `add` / `search` without pre-configuring `components.json`.

## Agent rules

1. **Do not dump all ~267 registries into `components.json`.** Use the script / CLI instead.
2. For this repo’s product UI, **prefer `@coss`** before community kits.
3. After finding an item, verify with:
   - `pnpm dlx shadcn@latest view <addCommandArgument> -c packages/ui`
   - or shadcn MCP `view_items_in_registries` once the namespace is resolvable
4. Filter noise with `--type ui` or `--type block` when the query is broad.
5. Treat Shoogle rate limits (HTTP 429) as transient; retry or fall back to `--mode all --registries …`.
6. Never invent `@namespace/item` names — only use results from the script, MCP, or CLI.

## Modes cheat sheet

| Mode           | Command flag         | When                                    |
| -------------- | -------------------- | --------------------------------------- |
| Project only   | `--mode project`     | Stay inside configured registries       |
| Meta (default) | `--mode shoogle`     | Fast search across community catalogs   |
| Full index     | `--mode all`         | Exhaustive scan of directory namespaces |
| Explicit set   | `--registries @a,@b` | Known shortlist                         |
