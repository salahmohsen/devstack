# Learning / corrections — Phase A guide

**Tickets:** `61`–`64`  
**Route UX:** Mail reader → **Correct** (after classify)  
**Migration:** `packages/db/migrations/20260729235117_perpetual_overlord/`

## Ownership (locked)

| Layer                                    | Role                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| **`ai_correction` (app Postgres)**       | Source of truth for multi-tenant learning + audit                        |
| **Few-shot inject**                      | Last **K=5** corrections into classify LLM prompt                        |
| **Smart rules**                          | Prefer for sticky keyword patterns (not infinite corrections)            |
| **Mastra feedback / datasets / scorers** | Later dual-write (observability + offline eval) — **not** runtime memory |

## Flow

```text
User opens classified mail → Correct → pick label or None
  → update message system labels
  → undo active CRM apply (default)
  → insert ai_correction (predicted vs corrected + mail snapshot)
  → next classify: load last K → formatCorrectionsFewShot → LLM prompt
```

Does **not** re-apply CRM after correction (no surprise stage moves).

## API

- `mail.correctClassification` — input: `messageId`, `correctedSystemLabels` (0–1), optional `undoCrm`, `note`

## Core helpers

- `applyCorrectedSystemLabels` / `extractSystemLabels`
- `formatCorrectionsFewShot` / `AI_CORRECTION_FEW_SHOT_K`

## Phase B — Mastra feedback dual-write

On correction (after `ai_correction` insert):

1. Copy `mastraClassifyTraceId` / `mastraClassifyRunId` from the message onto the correction row
2. Best-effort `POST {AGENT_WORKER_URL}/api/observability/feedback` with  
   `feedbackType: "correction"`, `value: "predicted->corrected"`, `sourceId: correctionId`,  
   optional `traceId` when known
3. Failures never block the product path

Classify agent path stores `mastra_classify_run_id` (+ `trace_id` when the workflow returns it) on the message.

## Still out of scope

- Retrieval-ranked few-shot
- Dataset export / live scorers
- Fine-tuning
