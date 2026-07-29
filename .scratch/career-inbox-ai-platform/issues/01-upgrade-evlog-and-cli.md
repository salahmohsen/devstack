# 01 — Upgrade evlog and pin `@evlog/cli` with workspace scripts

**What to build:** The monorepo runs a current `evlog` from the workspace catalog and exposes documented `log:map` / `log:doctor` (or equivalent) scripts so agents can score and verify logging coverage. `evlog doctor` succeeds for the primary app package(s) that already use `@tsu-stack/logger`.

**Blocked by:** None — can start immediately.

**Status:** done

**Parent:** Career Inbox + AI platform foundation (spec approved).

**Plan:** `docs/superpowers/plans/2026-07-29-foundation-01-upgrade-evlog-cli.md`  
**Branch:** `chore/upgrade-evlog-cli`

- [x] Catalog `evlog` bumped to latest stable; lockfile updated; packages depending on it still typecheck
- [x] `@evlog/cli` added as dev dependency (catalog pin); version pinned for CI stability
- [x] Root (or package) scripts exist for map/doctor with monorepo `--cwd` guidance documented in `.agents/logging.md`
- [x] `evlog doctor` (appropriate `--cwd`) reports evlog resolvable; no false requirement to write app code outside logger facade
- [x] No app imports `evlog` directly — still only `@tsu-stack/logger`

**Verified:**

- `evlog` catalog `^2.22.4` (resolved 2.22.4); `@evlog/cli` catalog `^0.3.0` (resolved 0.3.0)
- `vp run log:doctor` → 4 ok, 1 warn (no local sink yet), exit 0
- `vp run log:map` → TanStack Start, 42 entry points, score 45 (hygiene/score improvements = ticket 06)
