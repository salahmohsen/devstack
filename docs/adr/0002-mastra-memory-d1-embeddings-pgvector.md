# 0002 — Mastra memory uses Cloudflare D1, identity embeddings use Neon pgvector

Mastra's thread/message/workflow-snapshot storage lives in a Cloudflare D1 binding
(`D1Store` from `@mastra/cloudflare-d1`), while identity facet embeddings live in a
separate pgvector index on the existing Neon Postgres database. This split keeps
Mastra's high-volume, low-value conversation state out of the transactional
database while keeping the _searchable_ identity data (which the agent and dashboard
both query frequently) co-located with the rest of the application's data.

If they were co-located, the Neon pool would be doing two unrelated jobs (transactional
writes for portfolio data, vector + JSON storage for chat history) on a single
connection budget. If both were in D1, we'd need to bring our own embedding pipeline
to D1 (it has no pgvector equivalent), which buys nothing — Mastra already supports
pgvector via `PgVector` and we already run Neon.
