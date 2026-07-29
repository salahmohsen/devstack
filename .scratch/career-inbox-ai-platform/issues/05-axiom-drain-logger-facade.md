# 05 — Axiom drain behind `@tsu-stack/logger` (env-gated)

**Status:** done

**Branch:** `chore/upgrade-evlog-cli` (foundation wave)

- [x] Axiom drain configured only inside `@tsu-stack/logger` (`createAxiomDrain` in `initLogger`)
- [x] Gated on `AXIOM_API_KEY` + `AXIOM_DATASET` — no secrets in repo
- [x] Local/dev without Axiom still works
- [x] Optional env keys documented via `packages/env` optional fields + `.agents/logging.md`
- [x] Explicit `config.drain` from callers still wins over env auto-attach
