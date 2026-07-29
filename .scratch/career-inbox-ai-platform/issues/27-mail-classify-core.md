# 27 — Mail classify core contracts

**What to build:** Shared Zod I/O for classify (input message fields → labels + source). Heuristic prefilter helpers in `packages/core`.

**Status:** done

- [x] `MailClassifyInputSchema` / `MailClassifyOutputSchema`
- [x] `heuristicClassifyMail` (application | recruiter | interview | offer)
- [x] Preserve non-system labels (smart rules)
