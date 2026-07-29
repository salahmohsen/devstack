# Foundation 01 — Upgrade evlog + pin `@evlog/cli` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bump monorepo `evlog` to latest stable, pin `@evlog/cli` for map/doctor, add root scripts, document monorepo `--cwd` usage — without apps importing `evlog` directly.

**Architecture:** `evlog` stays a **catalog** dependency consumed only by `@tsu-stack/logger`. `@evlog/cli` is a **root (or logger package) devDependency** so agents run `vp run log:map` / `log:doctor` with explicit `--cwd` per app (CLI scans one package at a time; bare workspace root is wrong).

**Tech Stack:** pnpm workspace catalog, Vite Plus (`vp` / `vpx`), `@tsu-stack/logger`, `@evlog/cli`, TanStack Start web app for map target.

**Ticket:** `.scratch/career-inbox-ai-platform/issues/01-upgrade-evlog-and-cli.md`  
**Spec:** `docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md` (foundation epic 0; observability appendix)  
**Conventions:** `.agents/logging.md`, `.agents/vite-plus.md` (use `vp` not raw pnpm for package ops)  
**Docs:** Context7 `/websites/evlog_dev` or `/hugorcd/evlog` before inventing CLI flags.

---

## File structure

| Action    | Path                  | Responsibility                                                                              |
| --------- | --------------------- | ------------------------------------------------------------------------------------------- |
| Modify    | `pnpm-workspace.yaml` | Catalog: `evlog` latest, add `@evlog/cli` pin                                               |
| Modify    | `package.json` (root) | `devDependencies`: `@evlog/cli`: `catalog:`; scripts `log:map`, `log:doctor`                |
| Modify    | `.agents/logging.md`  | Exact script names + monorepo `--cwd` examples                                              |
| Touch     | `pnpm-lock.yaml`      | Via `vp install` / lock update after catalog change                                         |
| Unchanged | `packages/logger/**`  | Still sole runtime importer of `evlog` (unless types break after bump — fix only if needed) |

---

## Versions (verify at implement time)

At plan authoring (2026-07-29 npm):

| Package      | Catalog was | Latest npm                   |
| ------------ | ----------- | ---------------------------- |
| `evlog`      | `^2.19.2`   | `2.22.4` → catalog `^2.22.4` |
| `@evlog/cli` | (none)      | `0.3.0` → catalog `^0.3.0`   |

Re-check: `npm view evlog version` and `npm view @evlog/cli version` before writing catalog.

---

### Task 1: Bump catalog versions

**Files:**

- Modify: `pnpm-workspace.yaml` (catalog `evlog` line; add `@evlog/cli` alphabetically near other `@` packages or near `evlog`)

- [ ] **Step 1: Confirm latest versions**

```bash
npm view evlog version
npm view @evlog/cli version
```

Record the numbers; if higher than 2.22.4 / 0.3.0, use those.

- [ ] **Step 2: Edit catalog**

In `pnpm-workspace.yaml` under `catalog:`:

```yaml
"@evlog/cli": ^0.3.0 # use confirmed latest
# ...
evlog: ^2.22.4 # use confirmed latest
```

- [ ] **Step 3: Install**

```bash
vp install
```

Expected: lockfile updates; no peer dependency war that fails install. If install fails, read error and fix (do not force legacy peers without documenting).

- [ ] **Step 4: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(deps): bump evlog catalog and add @evlog/cli"
```

---

### Task 2: Root devDependency + scripts

**Files:**

- Modify: `package.json` (root `devDependencies` + `scripts`)

- [ ] **Step 1: Add devDependency**

In root `package.json` `devDependencies`:

```json
"@evlog/cli": "catalog:"
```

Keep alphabetical-ish with other `@` packages if the file is sorted; otherwise place with other tooling deps.

- [ ] **Step 2: Add scripts**

In root `scripts`:

```json
"log:map": "evlog map --cwd apps/web --framework tanstack-start --no-write",
"log:map:write": "evlog map --cwd apps/web --framework tanstack-start",
"log:doctor": "evlog doctor --cwd apps/web",
"log:doctor:logger": "evlog doctor --cwd packages/logger",
"log:doctor:server": "evlog doctor --cwd apps/server"
```

Rationale:

- **map** targets **TanStack Start** web (CLI adapters: nuxt, nitro, next, tanstack-start). Default **`--no-write`** so agent/CI runs do not dirty the tree; use `log:map:write` only when intentionally refreshing `evlog.map.json`.
- Server is Hono — map adapter may not apply; do not claim map works for Hono until CLI supports it.
- **doctor** primary target is **apps/web** (app that uses `@tsu-stack/logger`). Optional `log:doctor:logger` / `log:doctor:server` for other packages.

- [ ] **Step 3: Reinstall so binary is linked**

```bash
vp install
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @evlog/cli scripts for map and doctor"
```

---

### Task 3: Verify doctor + map smoke

**Files:** none (runtime verification)

- [ ] **Step 1: Doctor on primary app (web)**

```bash
vp run log:doctor
# optional: vp run log:doctor:logger && vp run log:doctor:server
```

Expected: Node ≥ 20 OK; project resolves; `evlog` version resolvable via workspace (may warn if no local `.evlog/logs` yet — warn is OK, fail is not).

If **fail** `EVLOG_NOT_FOUND`: ensure `packages/logger` still has `"evlog": "catalog:"`, web depends on `@tsu-stack/logger`, and install completed. Prefer `vp exec` / `vpx` over raw `pnpm exec` if invoking the binary outside scripts.

- [ ] **Step 2: Map web (smoke)**

```bash
vp run log:map
```

Expected: either a score report for TanStack Start entry points, or a clear detection error.

- If framework detection fails: already pass `--framework tanstack-start` in script; confirm CLI version supports it (docs: map adapters include tanstack-start).
- If map errors on monorepo root: script must keep `--cwd apps/web`.
- Score may be low — **do not** add logging spam to raise score in this ticket (that is ticket 06).
- Default map uses `--no-write` (no `evlog.map.json` dirty).

- [ ] **Step 3: Guardrail — no app direct imports**

```bash
rg -n "from [\"']evlog" apps packages --glob '!packages/logger/**' --glob '!**/node_modules/**'
```

Expected: **no matches** outside `packages/logger`. If any appear, fix by routing through `@tsu-stack/logger` (out of scope unless introduced by this bump — then fix).

- [ ] **Step 4: Typecheck**

```bash
vp check
```

Root `"check": "vp check"` — do **not** use `--filter @tsu-stack/logger check` (logger package has no `scripts.check`). If full-repo check is too heavy mid-work, at least ensure TypeScript still typechecks logger sources after the bump.

If `evlog` 2.22 types break logger exports, fix **only** `packages/logger` adapters to match new types (Context7 / package types). Keep public API of `@tsu-stack/logger` stable if possible.

- [ ] **Step 5: Commit only if fixes were needed**

```bash
git add packages/logger
git commit -m "fix(logger): adapt to evlog API after catalog bump"
```

Skip commit if no code changes.

---

### Task 4: Document scripts and monorepo usage

**Files:**

- Modify: `.agents/logging.md` (evlog CLI section)

- [ ] **Step 1: Replace/extend CLI section** so it matches real scripts

Document (use indentation or ~~~ for nested shell — do not nest ``` fences):

```markdown
## evlog CLI (workspace)

Catalog: `evlog` (runtime via `@tsu-stack/logger` only) and `@evlog/cli` (root devDep).

From repo root:

vp run log:doctor # apps/web — primary app using @tsu-stack/logger
vp run log:doctor:logger # packages/logger
vp run log:doctor:server # apps/server
vp run log:map # apps/web TanStack Start score (--no-write)
vp run log:map:write # same, writes evlog.map.json

Monorepo: never run bare `evlog map` at workspace root without `--cwd <package>`.

evlog map --cwd apps/web --framework tanstack-start --no-write
evlog doctor --cwd apps/web

Pin CLI version in catalog so CI scores do not jump unexpectedly.
Prefer Context7 `/websites/evlog_dev` before new flags.
Do not import `evlog` from apps — only `@tsu-stack/logger`.
```

Align exact script names with Task 2.

- [ ] **Step 2: Commit**

```bash
git add .agents/logging.md
git commit -m "docs(agents): document log map and doctor workspace scripts"
```

---

### Task 5: Acceptance gate (ticket 01)

- [ ] **Step 1: Re-check ticket ACs**

| AC                                                   | How verified                                      |
| ---------------------------------------------------- | ------------------------------------------------- |
| Catalog `evlog` bumped; lockfile; packages typecheck | catalog version + `vp check`                      |
| `@evlog/cli` catalog pin                             | `pnpm-workspace.yaml` + root devDep               |
| Root scripts map/doctor + docs                       | `package.json` + `.agents/logging.md`             |
| `evlog doctor` on primary app(s)                     | `vp run log:doctor` (web); optional server/logger |
| No app direct `evlog` imports                        | Task 3 step 3                                     |

- [ ] **Step 2: Mark ticket status**

In `.scratch/career-inbox-ai-platform/issues/01-upgrade-evlog-and-cli.md`:

- Set **Status:** `done` (or keep ready and check all boxes)
- Check all acceptance checkboxes

- [ ] **Step 3: Final commit if ticket file updated**

```bash
git add .scratch/career-inbox-ai-platform/issues/01-upgrade-evlog-and-cli.md
git commit -m "docs: mark foundation ticket 01 done"
```

---

## Out of scope (this plan)

- Axiom / PostHog drains (ticket 05 / later)
- Agent logger wiring (ticket 04)
- Raising map score / fixing dark routes (ticket 06)
- Mastra upgrade (ticket 02)
- Weather removal (ticket 03)

## Plan review checklist (author)

- [x] Header present with goal/architecture/stack
- [x] Exact files and commands
- [x] Uses `vp` per vite-plus conventions
- [x] Logger facade boundary preserved
- [x] Monorepo CLI `--cwd` correct
- [x] Context7/docs for CLI flags
- [x] Matches ticket 01 ACs only

---

## Execution

After plan approval: execute tasks 1→5 with `executing-plans` or `subagent-driven-development`. Prefer a **feature branch** (e.g. `chore/upgrade-evlog-cli`) if not already on one — do not force-push main without user consent.
