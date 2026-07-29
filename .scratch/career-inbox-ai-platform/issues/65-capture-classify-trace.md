# 65 — Capture classify run/trace on mail message

**Wave:** 16

- `mail_message.mastra_classify_run_id` / `mastra_classify_trace_id`
- `callMailClassifyAgent` returns runId + optional traceId
- Persist on `applyClassification`
