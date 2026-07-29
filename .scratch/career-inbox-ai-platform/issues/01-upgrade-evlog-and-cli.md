# 01 — Upgrade evlog and pin `@evlog/cli` with workspace scripts

**What to build:** The monorepo runs a current `evlog` from the workspace catalog and exposes documented `log:map` / `log:doctor` (or equivalent) scripts so agents can score and verify logging coverage. `evlog doctor` succeeds for the primary app package(s) that already use `@tsu-stack/logger`.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Parent:** Career Inbox + AI platform foundation (spec approved).

- [ ] Catalog `evlog` bumped to latest stable; lockfile updated; packages depending on it still typecheck
- [ ] `@evlog/cli` added as dev dependency (catalog pin); version pinned for CI stability
- [ ] Root (or package) scripts exist for map/doctor with monorepo `--cwd` guidance documented in `.agents/logging.md`
- [ ] `evlog doctor` (appropriate `--cwd`) reports evlog resolvable; no false requirement to write app code outside logger facade
- [ ] No app imports `evlog` directly — still only `@tsu-stack/logger`
