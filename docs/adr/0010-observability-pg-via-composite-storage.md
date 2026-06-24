# 0010 — Observability uses a composite storage with a Postgres v-next backend

> **Rejected.** The local Postgres v-next observability storage requires the
> `pg` driver, which cannot open TCP sockets inside `workerd` (the Vite+ dev
> server runs in Miniflare, which emulates Cloudflare Workers). Production
> would need `pg-cloudflare` and the Vite+ Cloudflare plugin does not
> propagate the `pg-cloudflare` condition resolution in dev, so observability
> init fails on every workflow request in dev. The Mastra Cloud path
> (ADR-0008 successor) supersedes this ADR.

This ADR is preserved as a 5-line history note. See:

- `.agents/mastra.md` §5 Observability — current architecture
- `docs/dev/mastra-studio.md` — local Studio workflow
- `docs/adr/0008-replace-mastra-storage-exporter.md` — the previous decision
  that this ADR was trying to supersede; now also superseded by the
  Mastra Cloud path
