# Move resume generation to Hono server with pdfnative core

Move resume PDF generation from the TanStack Start web worker to the
Hono server worker, replacing `pdfnative-react` with `pdfnative` core
(no React reconciler).

## Context

ADR-0015 chose `pdfnative` + `pdfnative-react` for tagged PDF output
and replaced `@react-pdf/renderer`. The renderer and service lived in
`apps/web` (TanStack Start), called from TanStack Start API route
handlers that proxied portfolio/profile data from the Hono server via
oRPC before rendering.

This architecture has two consequences:

1. Every resume generation makes three network hops (web → server for
   data → render in web → R2). The data fetch and render happen in
   separate workers.
2. React's reconciler is pulled into the Cloudflare Worker bundle just
   to serialize a JSX tree to a JSON `DocumentParams` object.

A future client application needs to generate resumes without going
through TanStack Start. The Hono server should be the authoritative
backend for resume production.

## Decision

- Add `resume.generate` as a new oRPC protectedProcedure on the
  existing `resumeRouter` in `packages/api/src/routers/resume.router.ts`.
- Use `pdfnative` core's `buildDocumentPDFBytes()` directly instead of
  `pdfnative-react`'s `renderToBytes()`.
- Rewrite the resume template from JSX (pdfnative-react components) to
  a plain TypeScript module that produces `DocumentParams` JSON.
- Add an `r2_buckets` binding (`MEDIA_BUCKET`) to the server worker's
  `wrangler.jsonc` so the procedure can upload the PDF to R2 directly.
- Thread `MEDIA_BUCKET` through the oRPC context so the procedure can
  access it without global state.
- Simplify the TanStack Start `POST /api/resume/generate/` route to
  delegate to the new oRPC procedure. Keep the download route on the
  web worker (it already reads from R2 directly).
- R2 cleanup moves into the server's `resume.delete` procedure (it
  previously only deleted the DB row and relied on the web route for
  R2 cleanup).

## Consequences

- Resume generation is now a single hop: server fetches data locally,
  renders, uploads, persists.
- Server bundle gains ~200KB (pdfnative core with zero dependencies).
- Web bundle loses pdfnative + pdfnative-react + react-reconciler weight.
- No React dependency for the resume template — `DocumentParams` is
  plain JSON, trivially testable and auditable.
- All future clients (web app, API consumers, scheduled jobs) generate
  resumes through the same oRPC procedure.
- The server worker now needs an R2 binding, increasing its surface
  area. This is acceptable because the server is already the
  authoritative backend.
