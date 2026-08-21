# Resume PDF Generation

## Package: `@tsu-stack/pdf`

- Workspace: `packages/pdf`
- Public API: `renderResumePdfBytes`, `renderCoverLetterPdfBytes`,
  `toRenderCvYaml`, `PdfEngineUnavailableError`, `PdfRenderFailedError`
- Theme: RenderCV **engineeringresumes** only (hardcoded; no template UI)
- Page: A4
- Standard: PDF/UA-1 via `typst compile --pdf-standard ua-1`
- Photo: never

## Engine pipeline

```
portfolio + profile (+ optional professionalSummary)
         ↓
  toRenderCvYaml() → RenderCV YAML (engineeringresumes, A4)
         ↓
  spawn rendercv → .typ
         ↓
  spawn typst compile --pdf-standard ua-1 → PDF bytes
```

Cover letters skip RenderCV YAML: a vendored Typst string
(`cover-letter.template.ts`) is filled and compiled with the same Typst +
`TYPST_FONT_PATHS` path.

Fail closed: missing `rendercv` or `typst` on PATH →
`PDF_ENGINE_UNAVAILABLE`. No pdfnative / alternate-engine fallback.

## Runtime pins (server + agent images)

| Tool                          | Pin    |
| ----------------------------- | ------ |
| Typst                         | 0.14.2 |
| `rendercv[full]`              | 2.8    |
| Python (for rendercv + fonts) | 3.12   |

Local `pnpm run dev`: install Typst 0.14.2 on PATH and
`uv pip install 'rendercv[full]==2.8'` (Python 3.12+). `spawn.ts`
discovers fonts via `python3` + `rendercv_fonts` when `TYPST_FONT_PATHS`
is unset. Do not add font/path vars to `packages/env`.

## Placement

ADR-0016 still applies: generation runs through `resume.generate` on the
Hono/oRPC side (`packages/api`), not in the TanStack Start web worker.
Apply-package accept paths (API + agent) call the same
`renderResumePdfBytes` / `renderCoverLetterPdfBytes` helpers.

## ATS-compatible PDF guidelines

RenderCV/Typst output is real selectable text with a PDF/UA-1 structure
tree — ATS-friendly when content stays single-column and text-based.

### DOs

- **Single-column layout** — engineeringresumes is single-column; do not
  invent multi-column sections in custom Typst
- **Real text** — never rasterize body copy into images
- **Plain bullets** — text characters / list markup, not decorative glyphs
  that ATS cannot read
- **Contact as text** — phone, email, URLs as text/links on the contact line
- **Document title/lang** — set during Typst compile so metadata is present

### DON'Ts

- No photos or icons that carry meaning ATS must extract
- No second theme or US Letter page size
- No education/headline profile fields beyond what the mapper already derives
- No silent fallback to another PDF library

### Section structure (engineeringresumes order)

1. **Header** — name, contact line, optional headline from latest job
2. **Summary** — trimmed professional summary or `user.summary`
3. **Experience** — company, title, dates, bullet highlights
4. **Projects** — title, dates, highlights (stacks as last highlight when present)
5. **Skills** — categorized stacks

Education is omitted from generation. Resume **import** (parsing an
uploaded PDF into portfolio) uses `unpdf` and is out of scope here
(ADR-0023).

## Data sources

- **Name / summary**: `profile` + `user.summary` / optional `professionalSummary`
- **Contact**: portfolio contacts (phone, email, location, website; Discord omitted; YouTube normalized)
- **Experience**: portfolio experiences (nested projects stay nested)
- **Projects**: portfolio projects (nested stacks)
- **Skills**: portfolio stacks (categorized)

## Generate flow

```
[Dashboard "Generate" / apply-package Accept]
         ↓
  resume.generate or accept-apply-package (API / agent)
         ↓
  Fetch portfolio + profile (and apply overrides when present)
         ↓
  renderResumePdfBytes(...)  // @tsu-stack/pdf
         ↓
  Upload bytes to media bucket
         ↓
  Insert / update resume row (r2Key, filename, author, …)
```

Cover letter: same accept path → `renderCoverLetterPdfBytes` → store key
on the application.

## Delete flow

```
[Dashboard delete]
         ↓
  Delete object from media bucket (r2Key)
  Delete resume row
         ↓
  Invalidate queries
```
