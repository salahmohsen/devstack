# 79 — pgvector few-shot retrieval

**Wave:** 24 (production hardening)

## Goal

Scale correction few-shot with Postgres `vector` + cosine distance instead of in-process pool only.

## Shipped when

- `CREATE EXTENSION vector` migration
- `ai_correction.embedding_vec vector(1536)` + HNSW index (partial, non-null)
- Write path stores OpenAI embedding into `embedding_vec` (and keeps jsonb optional/compat)
- Classify uses SQL `ORDER BY embedding_vec <=> query` when vector present; lexical fallback otherwise
- Dimensionality mismatch handled safely
- LEARNING.md updated

## Non-goals

- Cross-tenant search
- Non-OpenAI embed models in v1
