# Resume import is not the generated resume table

Owner onboarding uploads a PDF as a **session resume source** and runs a
Mastra extract → client draft → transactional apply pipeline. That path
must not reuse the `resume` table or the `resumes/` object prefix, which
exist only for **generated** portfolio PDFs (`resume.generate`, author
admin|agent, default flag, public list/download).

## Context

Reuse looked tempting (“it’s a resume PDF”) but collides on lifecycle
(output catalog vs ephemeral import), auth (generated list is public),
and naming (`r2Key` under `resumes/` is downloadable as the public CV).

## Decision

- Import objects: client key `resume-sources/…` under files-sdk user
  prefix (full key `{userId}/resume-sources/…`); no durable source row
  in v1; delete on Apply/Skip/Discard.
- New `onboarding` oRPC (`protectedProcedure`) + `resume-import-workflow`;
  Apply writes profile/evidence in **one outer DB transaction** (repos
  today open nested transactions — Apply must share a `tx`, not call
  independent `create()`s) with portfolio opt-in for selected rows.
- Keep `resume` / resume builder unchanged as generate-only output.
- Do not make `/api/files` PDF-only; size/MIME for import enforced at
  onboarding UI + `extract`.

## Consequences

- Two PDF concepts in the product glossary (source session vs generated
  resume). Future “keep my uploaded CV” needs a new domain deliberately.
