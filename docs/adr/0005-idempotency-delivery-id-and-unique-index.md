# 0005 — Idempotency uses both a delivery-ID cache and a revisions unique index

The GitHub webhook handler is protected against duplicate delivery in two layers:
(1) the `X-GitHub-Delivery` ID is written to `GITHUB_CACHE_KV` with a 7-day TTL
and the workflow is skipped if already seen, and (2) the
`portfolio_identity_revisions` table has a unique index on
`(facet_key, source, source_ref)` when `source_ref IS NOT NULL` so duplicate writes
from a missed cache TTL or a parallel manual edit still fail at the database.

Layer 1 is cheap and O(1); layer 2 is defense in depth and costs only an index.
Removing either leaves a real failure mode: dropping layer 1 means every duplicate
webhook pays for a full workflow run; dropping layer 2 means a missed cache TTL
or a parallel writer (e.g. the agent tool + a webhook firing at the same time)
can produce two revisions for the same `(facet, source, sourceRef)`.
