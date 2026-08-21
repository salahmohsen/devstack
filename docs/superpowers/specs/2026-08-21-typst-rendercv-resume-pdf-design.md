# Typst + RenderCV engineeringresumes PDF generation — Design

**Date:** 2026-08-21  
**Status:** Approved (spec review)  
**Goal:** Replace `pdfnative` resume and cover-letter generation with RenderCV’s **engineeringresumes** theme (Typst, A4, PDF/UA-1), with no user-facing template UI.

**Related:**

- Research — `docs/research/2026-08-21-resume-pdf-generators.md`
- ADR-0015 pdfnative tagged PDFs — `docs/adr/0015-pdfnative-pdf-generation.md` (supersede)
- ADR-0016 Hono resume generation — `docs/adr/0016-hono-resume-generation.md` (engine swap only)
- Apply package — `docs/superpowers/specs/2026-08-04-application-apply-package-design.md`
- Product glossary — `CONTEXT.md` (PDF renderer / Tagged PDF)
- After implement: [ai-feature-harness](../../.agents/skills/ai-feature-harness/SKILL.md) (apply-package + resume generate)

---

## Product intention

Generated resume PDFs (dashboard **Generate**, apply-package **Accept**, agent copies of those paths) must look like RenderCV engineeringresumes: professional single-column typesetting, ATS-parseable text, PDF/UA-1. Cover letters ship in the same change and match that visual family (fonts, header, rules, A4). Users never pick a theme.

Not in scope: template gallery, per-user/per-resume theme field, education entity, photo on PDF, DOCX export, veraPDF CI, batch-regenerate of existing R2 objects, resume **import** (`unpdf`).

---

## Frozen decisions (grill log)

| #   | Topic           | Decision                                                                                                                                                                                                                                                                                                                                                           |
| --- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Template UI     | **None.** No picker, no settings, no `theme` column.                                                                                                                                                                                                                                                                                                               |
| 2   | Resume look     | RenderCV **engineeringresumes** only, every generate path.                                                                                                                                                                                                                                                                                                         |
| 3   | Engine          | `rendercv` subprocess → Typst source → `typst compile --pdf-standard ua-1`.                                                                                                                                                                                                                                                                                        |
| 4   | Cover letter    | Same PR. Our Typst, engineeringresumes-family header/fonts, same UA-1 compile. Not a RenderCV letter theme (none exists).                                                                                                                                                                                                                                          |
| 5   | Headline        | Among `isPresent` experiences, latest `fromDate`; else latest `fromDate` overall. Omit if none.                                                                                                                                                                                                                                                                    |
| 6   | Photo           | Never. `user.image` stays dashboard-only.                                                                                                                                                                                                                                                                                                                          |
| 7   | Page size       | **A4** (`design.page.size: a4`). Override RenderCV’s US Letter default. MENA + Europe (ISO 216). Cover letter A4 too.                                                                                                                                                                                                                                              |
| 8   | pdfnative       | **Delete** from catalog, api, agent, web, Docker comments.                                                                                                                                                                                                                                                                                                         |
| 9   | Historical PDFs | Leave R2 + `resume` rows. New generates only.                                                                                                                                                                                                                                                                                                                      |
| 10  | Education       | Omit section (no education entity).                                                                                                                                                                                                                                                                                                                                |
| 11  | Runtime         | `rendercv` + `typst` on **PATH in server and agent images**. No extra worker.                                                                                                                                                                                                                                                                                      |
| 12  | Code layout     | New **`@tsu-stack/pdf`**. Not `packages/core` (no spawn/fs in core).                                                                                                                                                                                                                                                                                               |
| 13  | PDF/UA          | **PDF/UA-1 enforced** at Typst compile. Fail closed if Typst rejects. veraPDF **out**.                                                                                                                                                                                                                                                                             |
| 14  | Tests           | **Replace** existing pdfnative unit files with mapper/cover-letter tests. No live engine job in CI unless binaries happen to exist (optional skip).                                                                                                                                                                                                                |
| 15  | Empty portfolio | Still render name + contacts (+ summary if any).                                                                                                                                                                                                                                                                                                                   |
| 16  | Locale          | English only.                                                                                                                                                                                                                                                                                                                                                      |
| 17  | Cover contacts  | Letter input **gains** `contacts` + profile email. Package does not load portfolio. Accept must pass them.                                                                                                                                                                                                                                                         |
| 18  | Summary text    | Always `stripHtml`. Dashboard generate **must pass** `user.summary`. Apply `professionalSummary` overrides when **trimmed non-empty** (`""` falls back to `user.summary`).                                                                                                                                                                                         |
| 19  | Project stacks  | One highlight: `Stack: a · b`. Not also in `summary`.                                                                                                                                                                                                                                                                                                              |
| 20  | Social networks | Map LinkedIn, GitHub, X, YouTube, Instagram, Telegram, Bluesky, Mastodon only. Derive **username** from handle/URL (not the raw contact `value`). Omit Discord, unknown types, and any entry that would fail RenderCV username rules (e.g. YouTube `@`, Mastodon not `@user@domain`). Do **not** fail the PDF. Cover-letter contact line uses the same omit rules. |
| 21  | Invalid phone   | Omit `cv.phone` if RenderCV would reject; do not fail the PDF.                                                                                                                                                                                                                                                                                                     |

---

## Architecture

```text
portfolio + profile (+ optional apply overrides)
        │
        ▼
  @tsu-stack/pdf
   ├─ toRenderCvYaml()
   │     theme: engineeringresumes (hardcoded)
   │     page.size: a4
   │     no photo
   ├─ renderResumePdfBytes()
   │     tempdir → YAML
   │     spawn rendercv → .typ
   │     spawn typst --pdf-standard ua-1 → PDF
   └─ renderCoverLetterPdfBytes()
         tempdir → fill cover-letter.typ
         spawn typst --pdf-standard ua-1 → PDF
        │
        ▼
  Uint8Array → existing mediaBucket.put + resume row / coverLetterR2Key
```

Callers (signatures stay bytes-in/bytes-out; swap import):

- `packages/api` `resume.generate`
- `packages/api` apply-package Accept
- `apps/agent` apply-package Accept / equivalent PDF helpers

No new oRPC. No resume schema migration.

### Package shape (`packages/pdf`)

```text
packages/pdf/
  src/
    index.ts                 # renderResumePdfBytes, renderCoverLetterPdfBytes
    types.ts                 # ResumePdfInput, CoverLetterPdfInput (contacts + email on letter)
    map-rendercv-yaml.ts     # pure mapper
    headline.ts              # current/latest experience title
    spawn-rendercv.ts
    spawn-typst.ts
    cover-letter.typ         # vendored template
    __tests__/
      map-rendercv-yaml.test.ts
      cover-letter.test.ts
  package.json               # @tsu-stack/pdf
```

Pure mapping vs spawn stay separate so unit tests never need binaries.

`packages/core` keeps filename helpers and `ResumeOutputSchema`. Do not put YAML or Typst I/O in core.

---

## Data mapping

### Resume (RenderCV YAML)

| RenderCV             | Source                                                                                                                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cv.name`            | `user.name`                                                                                                                                                                                                                        |
| `cv.headline`        | Among `isPresent` experiences, latest `fromDate`; else latest overall. Omit if none.                                                                                                                                               |
| `cv.email`           | Profile email; extra emails from contacts                                                                                                                                                                                          |
| `cv.phone`           | Phone contact if valid for RenderCV; **omit** if invalid                                                                                                                                                                           |
| `cv.location`        | Location contact                                                                                                                                                                                                                   |
| `cv.website`         | Website contact                                                                                                                                                                                                                    |
| `cv.social_networks` | LinkedIn, GitHub, X, YouTube, Instagram, Telegram, Bluesky, Mastodon. Username parsed from handle/URL. Omit Discord, unknown, and invalid usernames.                                                                               |
| `cv.photo`           | Always absent                                                                                                                                                                                                                      |
| `design.theme`       | `engineeringresumes`                                                                                                                                                                                                               |
| `design.page.size`   | `a4`                                                                                                                                                                                                                               |
| `locale.language`    | `english`                                                                                                                                                                                                                          |
| Summary section      | Plain text: `stripHtml` of trimmed-non-empty `professionalSummary`, else `user.summary`. Omit if empty. `resume.generate` must pass `user.summary`.                                                                                |
| Experience           | Portfolio-included → `company` ← organization, `position` ← title, dates, `highlights` from apply `bullets` or existing `extractBullets` (`<li>` / paragraphs). Do not flatten the whole HTML with a single `stripHtml`.           |
| Projects             | Included, non-archived → title, highlights from override bullets or `extractBullets` on description/summary. Append one highlight `Stack: a · b` from `filterPortfolioProjectStacks` + `projectStackNames` (portfolio names only). |
| Skills               | Portfolio stacks grouped by type. Move `groupStacksByType` from `resume-pdf.ts` into `@tsu-stack/pdf`.                                                                                                                             |
| Education            | Omitted                                                                                                                                                                                                                            |

Skip any section with zero entries. Contact **display order** follows `sortOrder` as today.

Typst UA-1 needs a document title and language: set from `cv.name` and `english` (via generated Typst or `typst` inputs). Cover letter: `#set document(title: name, lang: "en")`.

### Cover letter

Input: `candidateName`, `body`, optional `companyName`, `roleTitle`, `date`, plus **`contacts` and profile `email`** (same shapes as resume). The package does not fetch portfolio.

- Header: name + one contact line (shared contact formatter).
- Meta: date, company, `Re: {role}` when present.
- Body: blank-line paragraphs (same split as current `cover-letter-pdf.ts`).
- No “Cover Letter” H1 banner.
- A4. `spawn-typst` must set `TYPST_FONT_PATHS` (or equivalent) so letter fonts match the resume (`rendercv-fonts`). Pin **Typst ≥ 0.14** and **`rendercv[full]`** in Dockerfiles. Debian bookworm-slim is Python 3.11 — images must use 3.12+.

---

## PDF/UA-1 hardening

1. RenderCV emits Typst (do not take its default PDF if that PDF is not UA-1).
2. Compile with `typst compile --pdf-standard ua-1`.
3. Cover letter: same flag.
4. Typst compiler checks **are** the harness: missing title/lang/structure → non-zero exit → `PDF_RENDER_FAILED`.
5. veraPDF is **not** in this change.

If `rendercv render` cannot stop at Typst source, use the smallest documented flag to skip PDF (or ignore its PDF and compile the `.typ` it always writes). Implementation must not ship a non-UA PDF as the stored artifact.

---

## Errors

Fail closed. No pdfnative fallback.

| Failure                                   | Error                                                                                                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rendercv` or `typst` missing on PATH     | `PDF_ENGINE_UNAVAILABLE` on `resume.generate` **and** Accept. Extend `AcceptApplyPackageErrorCode` (API + agent); web Accept `switch` handles new codes. |
| CLI non-zero, UA-1 reject, timeout (~30s) | `PDF_RENDER_FAILED` — short stderr, no YAML dump to client                                                                                               |
| Empty cover body                          | Reject before spawn (Accept already requires body)                                                                                                       |
| Thin CV                                   | Success (name + contacts)                                                                                                                                |

Temp dir per render; `rm -rf` in `finally`. Kill spawn process group on timeout.

Logging: one outcome event per render (ok/fail, duration_ms, bytes, engine). No PII/YAML.

`unpdf` **stays** for resume-import extract.

---

## Docker / PATH

Server and agent images (and local `pnpm run dev` story) install:

- Python ≥ 3.12
- `pip install 'rendercv[full]'` pinned
- Typst ≥ 0.14 CLI on PATH
- `rendercv-fonts` (comes with `[full]`)

Document as **code-owned PATH**, not a new `packages/env` var. Optional later: `RENDERCV_BIN` / `TYPST_BIN` only if PATH is painful.

Update Dockerfiles, compose, any Dokploy notes that mentioned pdfnative. Remove `pdfnative` from pnpm catalog and `apps/web` if it is only a leftover.

---

## Tests

Replace, do not pile on:

- `packages/api/src/routers/__tests__/resume-pdf.test.ts` → move assertions into `@tsu-stack/pdf` mapper tests; delete pdfnative `validatePdfUA` / `extractText` usage.
- Agent duplicate tests if present: same.
- Cover letter paragraph split + header/contact line.
- Delete `resume-pdf-weight-preview.test.ts` (pdfnative font preview) if it still exists.

Do **not** add veraPDF, Playwright screenshot, or a required live-engine CI job. If a developer has binaries, an optional skipped test may compile a fixture with `ua-1`.

Existing tests that must keep compiling after the swap are in scope even though policy is “no new tests unless asked”; this is replacement of files that would otherwise fail typecheck.

---

## Docs to update in the same change

- New ADR: Typst/RenderCV engineeringresumes + PDF/UA-1; supersedes 0015 engine choice.
- `CONTEXT.md` — **PDF renderer** = `@tsu-stack/pdf` + RenderCV/Typst, not pdfnative.
- `README.md` stack table.
- Apply-package spec footnote if it names `buildResumeDocument` / pdfnative.
- `.agents/resume-pdf-generation.md` if it still documents `@react-pdf/renderer` / pdfnative.

---

## Out of scope

- Template selection UI or persisted theme
- US Letter or per-user page size
- Education / headline profile fields
- Photo on PDF
- DOCX sibling export
- veraPDF
- Regenerating historical resumes
- Changing resume import (`unpdf`)
- RenderCV themes other than engineeringresumes
