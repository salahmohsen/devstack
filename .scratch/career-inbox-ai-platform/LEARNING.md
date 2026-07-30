# Learning / corrections — guide

**Tickets:** `61`–`64` (Phase A), `65`–`66` (feedback), `71` (retrieval few-shot)  
**Route UX:** Mail reader → **Correct** (after classify)  
**Migration:** `packages/db/migrations/20260729235117_perpetual_overlord/`

## Ownership (locked)

| Layer                                    | Role                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| **`ai_correction` (app Postgres)**       | Source of truth for multi-tenant learning + audit                            |
| **Few-shot inject**                      | Top-**K=5** similar corrections into classify LLM prompt (lexical retrieval) |
| **Smart rules**                          | Prefer for sticky keyword patterns (not infinite corrections)                |
| **Mastra feedback / datasets / scorers** | Dual-write observability + offline eval — **not** runtime memory             |

## Flow

```text
User opens classified mail → Correct → pick label or None
  → update message system labels
  → undo active CRM apply (default)
  → insert ai_correction (predicted vs corrected + mail snapshot)
  → next classify:
       load last 40 candidates
       → selectCorrectionsForFewShot (similarity)
       → formatCorrectionsFewShot → LLM prompt
```

Does **not** re-apply CRM after correction (no surprise stage moves).

## API

- `mail.correctClassification` — input: `messageId`, `correctedSystemLabels` (0–1), optional `undoCrm`, `note`

## Core helpers

- `applyCorrectedSystemLabels` / `extractSystemLabels`
- `scoreCorrectionSimilarity` / `selectCorrectionsForFewShot`
- `formatCorrectionsFewShot` / `AI_CORRECTION_FEW_SHOT_K` / `AI_CORRECTION_CANDIDATE_POOL`

## Phase B — Mastra feedback dual-write

On correction (after `ai_correction` insert):

1. Copy `mastraClassifyTraceId` / `mastraClassifyRunId` from the message onto the correction row
2. Best-effort `POST {AGENT_WORKER_URL}/api/observability/feedback` with  
   `feedbackType: "correction"`, `value: "predicted->corrected"`, `sourceId: correctionId`,  
   optional `traceId` when known
3. Failures never block the product path

Classify agent path stores `mastra_classify_run_id` (+ `trace_id` when the workflow returns it) on the message.

## Phase C — Retrieval-ranked few-shot (lexical)

At classify time:

1. Load last **40** corrections for the user (`AI_CORRECTION_CANDIDATE_POOL`)
2. Score each vs live mail: from-domain, exact from-email, subject Jaccard, body/preview Jaccard
3. Inject top **K=5**; if all scores weak (`minScore` 0.05), fall back to newest K

## Phase D — Embedding + pgvector (wave 24)

When `OPENAI_API_KEY` is set:

1. Correction create embeds → `embedding` (jsonb legacy) + `embedding_vec` (pgvector 1536)
2. Classify embeds live mail → SQL `ORDER BY embedding_vec <=> query` (HNSW)
3. Fallback: lexical ranking over last 40

Requires `CREATE EXTENSION vector` (Neon). Without API key, pure lexical remains.

## Still out of scope

- Dataset export / live scorers
- Fine-tuning
