# Typst + RenderCV for resume and cover-letter PDFs

Resume and cover-letter generation use `@tsu-stack/pdf`: portfolio maps to
RenderCV **engineeringresumes** YAML, `rendercv` emits Typst, then
`typst compile --pdf-standard ua-1` produces A4 PDF/UA-1. No template UI,
no photo, no pdfnative fallback. ADR-0016 still owns Hono/`resume.generate`
placement; this ADR only swaps the engine.

Supersedes ADR-0015 (pdfnative engine choice).

## Status

accepted

## Considered options

- Keep pdfnative: tagged PDF in-process, but layout/look diverges from
  RenderCV engineeringresumes and needs ongoing template maintenance.
- Pure Typst without RenderCV: full control, lose the battle-tested
  engineeringresumes theme and YAML mapping surface.
- RenderCV + Typst subprocess (selected): fixed engineeringresumes look,
  PDF/UA-1 via Typst, shared package for API and agent, fail closed when
  binaries are missing.

## Consequences

- Pins: Typst 0.14.2, `rendercv[full]==2.8`, Python 3.12 on server/agent
  images. Code discovers `TYPST_FONT_PATHS` from `rendercv_fonts` when
  unset; no new `packages/env` vars.
- Cover letters use a vendored Typst string in the same font/header family,
  same UA-1 compile path — not a RenderCV letter theme.
- Missing `rendercv`/`typst` on PATH throws `PDF_ENGINE_UNAVAILABLE`; no
  silent engine fallback.
- Resume **import** stays on `unpdf` (ADR-0023); generation and import are
  separate pipelines.
