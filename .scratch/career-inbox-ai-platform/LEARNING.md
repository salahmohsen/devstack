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

## Out of scope (this phase)

- Retrieval-ranked few-shot
- Mastra `addFeedback` dual-write
- Dataset export / live scorers
- Fine-tuning
