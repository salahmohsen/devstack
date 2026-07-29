# 05 — Axiom drain behind `@tsu-stack/logger` (env-gated)

**What to build:** Production (or configured) environments can ship logger wide events to **Axiom** without apps importing Axiom/evlog adapters. When Axiom env is unset, behavior stays safe for local/dev (console/fs or existing default). Document required env vars.

**Blocked by:** 01 — upgrade and facade still own all drains.

**Status:** ready-for-agent

**Parent:** Career Inbox + AI platform foundation. Spec appendix: Axiom primary for wide events.

- [ ] Axiom drain configured only inside `@tsu-stack/logger` (or its server bootstrap), not in feature apps
- [ ] Gated on documented env (e.g. `AXIOM_DATASET`, `AXIOM_API_KEY`) — no secrets in repo
- [ ] Local/dev without Axiom still works; no hard fail on missing keys in default local mode
- [ ] Sampling guidance remains: do not flood Axiom with trivial INFO; errors retained
- [ ] `.agents/logging.md` (or env docs) lists vars and that PostHog is separate (product/errors)
