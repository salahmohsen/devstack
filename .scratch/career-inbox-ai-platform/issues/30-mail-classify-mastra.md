# 30 — Mail classify Mastra workflow (LLM)

**What to build:** Mastra workflow on agent: heuristic first, then LLM structured labels when heuristic is empty/low confidence. Register in `apps/agent/src/mastra/index.ts`. Server worker calls agent when configured.

**Blocked by:** 29

**Status:** done

- [x] Workflow `mail-classify-workflow` with input/output from core
- [x] Heuristic step + optional LLM step (`mailClassifierAgent`)
- [x] Server worker: try agent HTTP (`AGENT_WORKER_URL`), fall back to local heuristic
- [ ] CRM effects + undo — later tickets
