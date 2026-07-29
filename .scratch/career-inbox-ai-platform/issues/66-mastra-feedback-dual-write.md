# 66 — Dual-write correction → Mastra feedback

**Wave:** 16

- `POST /api/observability/feedback` from API after `ai_correction` insert
- `feedbackType: correction`, optional `traceId`, `sourceId = correctionId`
- Best-effort; never fails product correction path
