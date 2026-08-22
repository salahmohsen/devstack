# Open-source resume PDF generation: products, libraries, recommendation

**Date:** 2026-08-21
**Question:** Which open-source resume products generate PDFs, what engines do they use, and what should we use instead of `pdfnative` for a resume that is both beautiful and ATS-compatible?
**Current stack:** `pdfnative` `buildDocumentPDFBytes()` in `packages/api` and `apps/agent`, tagged `pdfa2u`, chosen in [ADR-0015](../adr/0015-pdfnative-pdf-generation.md) after leaving `@react-pdf/renderer` for tagged PDF / PDF/A.

Star counts and `pushed_at` were fetched from the GitHub API on 2026-08-21.

---

## Executive recommendation

There is no single library that is both “as pretty as a designer HTML template” and “as ATS-safe as a Word doc” without a layout policy. ATS success is mostly **document shape** (single column, real text, standard headings). Beauty is **typesetting** (fonts, spacing, columns, rules).

For this repo, the best next engine is **Typst 0.14+**, following [RenderCV](https://github.com/rendercv/rendercv). It is the only open-source stack that now covers all three of:

1. Resume-quality typography (the reason pdfnative looks weak)
2. Tagged PDF by default, plus opt-in PDF/UA-1 and PDF/A (the reason we left `@react-pdf/renderer`)
3. A proven YAML/JSON → template → PDF pipeline used by a 17k-star resume product

Stay in TypeScript for orchestration. Compile Typst in the Hono/agent process (CLI binary or WASM). Keep a **single-column ATS template**; do not put experience in a second column.

Second choice if we want CSS and our existing design system: **Playwright Chromium** `page.pdf({ tagged: true })`, or **WeasyPrint** `pdf_variant="pdf/ua-1"`. Do not go back to `@react-pdf/renderer` if tagged PDF remains a requirement. Add **DOCX** as a companion ATS export; Reactive Resume and YAMLResume both do this.

---

## What similar products actually use

Verified from README / `package.json` / `pyproject.toml`, not from blog roundups.

| Product                                                                         |   Stars | License    | Last push            | PDF engine (verified)                                                                                                                         | Template model                                                                       | ATS claim                                                                                                                                                                                 |
| ------------------------------------------------------------------------------- | ------: | ---------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [santifer/career-ops](https://github.com/santifer/career-ops)                   | ~67,200 | MIT        | 2026-08-21           | **Playwright 1.62.1** Chromium (`generate-pdf.mjs`)                                                                                           | HTML/CSS → `page.pdf()`. Unicode sanitization (em dashes, smart quotes, icon glyphs) | README: “clean, ATS-parseable PDF”. Closest _product_ analog (structured data → tailored PDF). One PDF, not a pretty/ATS pair.                                                            |
| [amruthpillai/reactive-resume](https://github.com/amruthpillai/reactive-resume) |  41,430 | MIT        | 2026-08-20           | **`@react-pdf/renderer` ^4.6.1** + `react-pdf-html` (v5.1.0+, client-side). Before that: **Puppeteer + Chromium/Browserless**. Also **DOCX**. | React-PDF templates (Azurill, Pikachu, …)                                            | Docs: ATS parsers extract **text**, not page size. JSON + DOCX. No second ATS PDF.                                                                                                        |
| [posquit0/Awesome-CV](https://github.com/posquit0/Awesome-CV)                   |  28,337 | LPPL-1.3c  | 2026-08-13           | **XeLaTeX** (`xelatex {cv}.tex`)                                                                                                              | LaTeX class `awesome-cv.cls`, Font Awesome + Roboto / Source Sans                    | None official; two-column header is a known ATS risk                                                                                                                                      |
| [srbhr/Resume-Matcher](https://github.com/srbhr/Resume-Matcher)                 |  28,204 | Apache-2.0 | 2026-08-11           | **Playwright 1.58** (“Headless Chromium”) plus JD matching                                                                                    | HTML/CSS templates including 1- and 2-column                                         | ATS is scoring/matching, not a dual PDF                                                                                                                                                   |
| [rendercv/rendercv](https://github.com/rendercv/rendercv)                       |  17,408 | MIT        | 2026-05-01           | **Typst** (`typst>=0.14.8`) via Jinja2                                                                                                        | YAML → Typst themes (classic, engineeringresumes, harvard, …)                        | [`scripts/ats_proof/`](https://github.com/rendercv/rendercv/tree/main/scripts/ats_proof) tests Poppler, PyMuPDF, Affinda, Extracta, Klippa. One PDF per theme.                            |
| [hacksalot/HackMyResume](https://github.com/hacksalot/HackMyResume)             |  ~9,300 | MIT        | 2022-04-03 (dormant) | **External CLIs**: wkhtmltopdf, Phantom.js, WeasyPrint (not npm deps)                                                                         | Handlebars HTML / LaTeX / Word from FRESH or JSON Resume                             | Keyword analysis. Multi-format (HTML/PDF/DOC/TXT/MD), not two PDFs                                                                                                                        |
| [xitanggg/open-resume](https://github.com/xitanggg/open-resume)                 |   8,849 | AGPL-3.0   | 2024-10-29           | **`@react-pdf/renderer` ^3.1.10**; parser is **PDF.js**                                                                                       | One modern single-column design, live preview                                        | README: “ATS friendly to … Greenhouse and Lever”. Parser is a diagnostic, not a second export.                                                                                            |
| [jsonresume/resume-cli](https://github.com/jsonresume/resume-cli)               |   4,720 | MIT        | archived 2026-06-12  | **Puppeteer** `page.pdf()` of theme HTML. Live code in [jsonresume/jsonresume.org](https://github.com/jsonresume/jsonresume.org)              | JSON Resume themes (HTML/CSS)                                                        | [`@jsonresume/ats-validator`](https://github.com/jsonresume/jsonresume.org/tree/master/packages/ats-validator) scores **HTML** (semantic tags, fonts, tables, single-column), not the PDF |
| [yamlresume/yamlresume](https://github.com/yamlresume/yamlresume)               |   1,503 | MIT        | 2026-08-21           | **XeTeX / Tectonic (LaTeX)** default; also HTML + DOCX + Markdown. Typst is on the roadmap                                                    | YAML → LaTeX / HTML layouts                                                          | “Pixel perfect” typesetting; multi-format export                                                                                                                                          |
| [rbardini/resumed](https://github.com/rbardini/resumed)                         |     551 | MIT        | 2025-09-19           | **Puppeteer** (optional peer `^24`)                                                                                                           | JSON Resume themes                                                                   | Same as resume-cli, lighter CLI                                                                                                                                                           |
| [saadq/resumake.io](https://github.com/saadq/resumake.io)                       |  ~3,600 | —          | farewell on `master` | **v2: `swiftlatex` WASM XeTeX/pdfTeX** in the browser; older Node pdflatex                                                                    | LaTeX templates behind a form UI                                                     | Hosted product shut down                                                                                                                                                                  |
| [ptsouchlos/modern-cv](https://github.com/ptsouchlos/modern-cv)                 |     610 | MIT        | 2026-08-10           | **Typst**                                                                                                                                     | Port of Awesome-CV                                                                   | Typst Universe package `modern-cv`                                                                                                                                                        |
| [yunanwg/brilliant-CV](https://github.com/yunanwg/brilliant-CV)                 |    ~829 | Apache-2.0 | 2026-08-17           | **Typst**                                                                                                                                     | Typst package used by some JSON Resume toolkits                                      | Template, not a builder                                                                                                                                                                   |
| [olyaiy/resume-lm](https://github.com/olyaiy/resume-lm)                         |     312 | AGPL-3.0   | 2026-08-15           | Not independently verified here (Next.js 15 AI builder)                                                                                       | Job-tailored resumes                                                                 | Marketing copy only                                                                                                                                                                       |
| [blopa/Resume-Builder](https://github.com/blopa/Resume-Builder)                 |     248 | MIT        | 2026-08-14           | JSON Resume + Gatsby print/PDF path                                                                                                           | JSON Resume                                                                          | JSON Resume portable                                                                                                                                                                      |

Closest **product** analog (structured evidence → tailored PDF): **career-ops** (Playwright HTML) and **Reactive Resume** (same TS monorepo family: TanStack Start, oRPC, Drizzle, Better Auth). Reactive Resume tried Chromium print, then **abandoned it** in v5.1.0 because Browserless/Chrome was the #1 self-host failure mode, and moved to `@react-pdf/renderer`.

Closest **document-engineering** analog (tagged/PDF-A, empirical ATS tests): **RenderCV**.

Closest **visual quality**: **RenderCV** (Typst) and **Awesome-CV / YAMLResume** (LaTeX).

**No notable OSS repo ships two PDFs** (designer vs ATS). The dual-output pattern that exists is **PDF + DOCX** (Reactive Resume, YAMLResume) or **PDF + plain text** (premium-resume-studio, 2 stars). RenderCV and OpenResume claim one PDF is both pretty and parseable.

---

## Engine families (what the market actually picked)

Four families cover almost every OSS resume PDF:

### 1. `@react-pdf/renderer` (Yoga/flexbox, PDFKit under the hood)

Used by **Reactive Resume v5.1+** and **OpenResume**.

- Strengths: TypeScript-native, client or server, flexbox, live preview with pdf.js, no Chromium process.
- Weakness we already hit: **no tagged PDF**. [diegomura/react-pdf#3179](https://github.com/diegomura/react-pdf/issues/3179) (opened 2025-06-24) still tracks WCAG / PDF tagging; PDFKit can tag, the React renderer does not expose it. That is exactly why [ADR-0015](../adr/0015-pdfnative-pdf-generation.md) left this library.
- ATS: text-based PDFs parse if the **template is single-column**. OpenResume bets on that. Two-column React-PDF templates still confuse parsers the same way two-column HTML does.

Do not return to this library if `/StructTreeRoot` remains a requirement.

### 2. HTML/CSS → Chromium print (Puppeteer / Playwright / Gotenberg)

Used by **career-ops**, **Resume-Matcher**, **JSON Resume** (`resume-cli`, `resumed`), and **Reactive Resume v4**.

- Playwright documents `page.pdf({ tagged: true })` since v1.42 (“Whether or not to generate tagged (accessible) PDF. Defaults to `false`.”). Chromium has generated tagged PDFs from print since Chrome 85 ([Chromium blog, 2020-07-29](https://blog.chromium.org/2020/07/using-chrome-to-generate-more.html)).
- Strengths: full CSS (grid, flex, web fonts, our design tokens). Beautiful if the HTML is designed for `@media print`.
- Weaknesses: ~280 MB Chromium, cold start, Docker networking. Reactive Resume’s issue tracker is full of `ResumePrinterError` / `TimeoutError: Waiting failed: 5000ms exceeded` against Browserless and `chromedp/headless-shell`. v5.1.0 release notes: “No more Browserless / Chromium dependency.”
- Gotenberg (12.9k stars) is the usual sidecar wrapper if we still want this path without owning Chrome ourselves.

ATS: tagged Chromium PDFs are still only as good as the HTML. Two-column CSS will interleave “Experience | Skills” in extract order. Use a print stylesheet that is **one column**.

### 3. Typst (RenderCV, modern-cv, resume-toolkit)

Used by **RenderCV** (`typst>=0.14.8` in [pyproject.toml](https://github.com/rendercv/rendercv/blob/main/pyproject.toml)).

Typst 0.14 (2025-10-24) is the important change vs when we wrote ADR-0015:

- “PDF files created with Typst 0.14 are tagged by default” ([Typst 0.14 announcement](https://typst.app/blog/2025/typst-0.14/))
- Opt-in **PDF/UA-1** with compiler checks (title, heading hierarchy, alt text)
- PDF/A expanded to all parts/levels; PDF 1.4–2.0
- Character-level justification (LaTeX does not have this)
- Apache-2.0 compiler (`typst/typst`, 55.6k stars), Rust, no TeX live, no Chromium

This closes the original gap that made `pdfnative` look unique (tagged + PDF/A in a small runtime), while adding the typography pdfnative cannot do.

Node integration options:

- Ship the `typst` CLI next to the agent/server container (RenderCV’s model)
- `typst` npm WASM / `typst-as-library` if we want in-process
- Jinja/Handlebars or a `.typ` template filled from our resume JSON

### 4. LaTeX (Awesome-CV, YAMLResume, Resumake)

XeLaTeX / Tectonic. Still the academic gold standard. YAMLResume’s README: “LaTeX as its default typesetting engine” plus HTML/CSS layouts and DOCX.

- Strengths: unmatched control, huge template corpus (Awesome-CV 28k).
- Weaknesses: TeX Live is huge; compile times; two-column Awesome-CV headers; PDF/UA-2 is possible via the LaTeX tagging project but is a specialist setup, not a default.
- Resumake (the famous hosted LaTeX builder) **shut down**; source lives on `v2`.

Skip LaTeX unless we want to vendor Awesome-CV. Typst is the 2026 replacement for this niche.

### 5. WeasyPrint (HTML/CSS, no browser)

[Kozea/WeasyPrint](https://github.com/Kozea/WeasyPrint) 9,521 stars, BSD-3-Clause, Python 3.10 + Pango.

Official docs: `pdf_variant` includes `pdf/ua-1`, `pdf/ua-2`, `pdf/a-2u`, `pdf/a-3u`, … ([common use cases](https://doc.courtbouillon.org/weasyprint/stable/common_use_cases.html)). HTML structure becomes the PDF structure tree. Requires `<title>` and `lang` on `<html>` for UA.

- Strengths: CSS you already know, tagged + PDF/A without Chromium, small files vs Chromium print.
- Weaknesses: Python sidecar (Pango), no JS, incomplete CSS Grid vs Chromium, slower than a warm Playwright page on complex docs.

Good if we want HTML templates and PDF/UA without Chrome. Worse fit than Typst for a Node-only deploy.

### 6. `pdfnative` (what we have)

[Nizoka/pdfnative](https://github.com/Nizoka/pdfnative) — **12 stars**, MIT, last push 2026-08-01. Zero-dep TypeScript, tagged PDF / PDF/A-1b/2b/2u/3b, veraPDF in CI.

Our code already documents the layout ceiling:

- No flexbox; contact row cannot mix multiple inline links ([`resume-pdf.ts`](../../packages/api/src/routers/resume-pdf.ts): “LinkBlock is block-level only”)
- No keep-with-next (we pre-paginate orphans ourselves)
- `params.title` draws a blue page-0 header we have to omit
- `tel:` URLs blocked
- Block-flow headings/paragraphs/lists only

That is why the PDF “doesn’t look good”: the engine is a document writer, not a typesetter. Supply-chain risk is also real (12 stars vs 17k–55k for Typst/react-pdf).

`@imprint-pdf/react` was the tagged alternative in ADR-0015 (WASM + Tailwind). Still a smaller ecosystem than Typst or Playwright.

---

## ATS vs beauty (do not mix these up)

Tagged PDF ≠ ATS pass. ATS software mostly:

1. Extracts the **text layer** (not OCR, if the PDF is real text)
2. Guesses **sections** from heading strings (`Experience`, `Education`, `Skills`)
3. Splits **jobs** by date patterns and company/title lines

What actually breaks ATS (Jobscan; ResumeOptimizerPro 2026 template tests):

| Do                                                                | Don’t                                                                                                                                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single column, top-to-bottom reading order                        | Two-column “sidebar skills” (one 2026 test: 97.4% field extract on single-column DOCX vs 71.2% on two-column PDF; work history lost to column interleave) |
| Real text, embedded fonts                                         | Text-as-image, Canva-style, scanned PDF                                                                                                                   |
| Standard heading words                                            | Icons-only section labels, unusual names (`Journey`, `Toolkit`)                                                                                           |
| Simple bullets                                                    | Tables used as layout, text boxes, overlapping elements                                                                                                   |
| PDF **or** DOCX; DOCX still wins Taleo/Workday in some 2026 tests | `.pages`, infographic PDF, multi-column “creative”                                                                                                        |

Tagged `/StructTreeRoot` **does** help:

- Screen readers (PDF/UA)
- Parsers that honor structure instead of x/y coordinates (this was our ADR-0015 bet)
- Consistency of extract order when we later add subtle visual chrome (rules, color headings)

It does **not** save a two-column layout. Greenhouse/Lever-class modern ATS will parse a clean single-column `@react-pdf` file. Legacy Taleo may still prefer DOCX.

**Implication:** ship **one ATS-safe PDF template** (single column) regardless of engine. If we ever want a “recruiter visual” two-column PDF, make it a second artifact, never the apply-package default.

---

## Head-to-head for _this_ repo

Constraints from CONTEXT.md / ADR-0015 / current code:

- Server-side in Hono + Mastra agent (not Cloudflare Workers anymore — Chromium is _possible_, still expensive)
- Need text extraction for ATS
- Want tagged / PDF/A
- Want it to look like a professional resume, not a government form
- TypeScript monorepo; Python/Rust as a binary is acceptable in Docker

| Engine                    | Beauty                             | ATS text                         | Tagged / PDF/A                  | Node fit              | Ops cost                                    | Verdict                              |
| ------------------------- | ---------------------------------- | -------------------------------- | ------------------------------- | --------------------- | ------------------------------------------- | ------------------------------------ |
| **Typst 0.14+**           | Excellent (RenderCV-level)         | Excellent if single-column theme | Tagged default; PDF/UA-1; PDF/A | CLI/WASM in container | Small static binary                         | **Best overall**                     |
| Playwright `tagged: true` | Excellent (full CSS)               | Good if print CSS is 1-col       | Chromium tagged PDF             | Native TS             | Chromium sidecar; Reactive Resume fled this | Best if we insist on CSS             |
| WeasyPrint `pdf/ua-1`     | Very good (print CSS)              | Good if 1-col HTML               | PDF/UA-1/2 + PDF/A              | Python sidecar        | Pango deps                                  | Best HTML path without Chrome        |
| `@react-pdf/renderer`     | Good (OpenResume/RxResume)         | Good if 1-col                    | **No**                          | Perfect TS            | Low                                         | Reject if tagging still required     |
| LaTeX (Tectonic)          | Excellent                          | Mixed (Awesome-CV columns)       | Possible via tagging project    | Shell out             | Huge image                                  | Skip; Typst replaced this            |
| **pdfnative (current)**   | Weak (block flow, no inline links) | Good (we already target this)    | PDF/A-2u + tags                 | Perfect TS            | Tiny                                        | Keep only if we refuse extra runtime |

---

## Concrete recommendation

### Do this

1. **Adopt Typst as the resume/cover-letter renderer.** Model after RenderCV: JSON/YAML data + a `.typ` theme. Start with a single-column “engineeringresume / harvard” style, not Awesome-CV’s two-column header.
2. Enable **PDF/UA-1** (or PDF/A-2u if we must stay archival-first) at compile time. Typst 0.14 tags even without UA; UA adds the checks we currently get from pdfnative.
3. Keep generating from `resume.generate` / apply-package; only the engine behind `renderResumePdfBytes` changes.
4. Add **DOCX** as a second apply-package file (Reactive Resume’s `@reactive-resume/docx` pattern). Many ATS still prefer it.
5. Treat “beautiful” as typography inside a **one-column** grid: type scale, tracking, rules, color on headings, hanging dates — not sidebars.

### Do not do this

- Do not go back to `@react-pdf/renderer` for the default apply PDF while ADR-0015’s tagged-PDF requirement stands.
- Do not stand up Browserless just to match Reactive Resume v4; they spent years regretting it.
- Do not copy Awesome-CV’s two-column header into the ATS default.
- Do not expect pdfnative to grow flexbox/inline-link layout. Its niche is compliance, not resumes.

### Fallback if Typst is blocked (no extra binary)

Playwright in the existing Docker host, HTML template with `@page` / print CSS, `tagged: true`, `printBackground: true`, A4. Or WeasyPrint as a tiny Python sidecar with `pdf_variant="pdf/ua-1"`.

### Dual-output option (highest ATS + highest beauty)

Same data →

- `resume.ats.pdf` — Typst single-column, PDF/UA-1
- `resume.visual.pdf` — optional two-column Typst or HTML (recruiter email, not ATS upload)
- `resume.docx` — for Taleo/Workday postings

YAMLResume already ships PDF + DOCX + HTML + Markdown from one YAML. That is the product pattern to copy, not the LaTeX engine.

---

## How our current pain maps to each engine

From `packages/api/src/routers/resume-pdf.ts` comments:

| Pain                                | pdfnative                | Typst                       | Playwright                | WeasyPrint          | react-pdf           |
| ----------------------------------- | ------------------------ | --------------------------- | ------------------------- | ------------------- | ------------------- |
| Multiple links on one contact line  | Block-level links only   | Native links in a line      | HTML `<a>` in a row       | HTML `<a>`          | Flex + Link         |
| Keep heading with following bullets | Manual pre-pagination    | Native grouping             | CSS `break-inside: avoid` | Same                | `wrap={false}`      |
| Custom fonts / weights              | Manual subset + register | First-class                 | `@font-face`              | `@font-face`        | `Font.register`     |
| Blue `params.title` header          | Workaround: omit title   | N/A                         | N/A                       | N/A                 | N/A                 |
| Two-column “looks designed”         | Not really possible      | Easy, **dangerous for ATS** | Easy, **dangerous**       | Easy, **dangerous** | Easy, **dangerous** |
| Tagged PDF/A                        | Yes (why we chose it)    | Yes as of 0.14              | Tagged yes; PDF/A no      | Yes (`pdf_variant`) | No                  |

---

## Sources (primary)

Products

- https://github.com/amruthpillai/reactive-resume — README, `apps/web/package.json` (`@react-pdf/renderer`), [v5.1.0 notes](https://github.com/amruthpillai/reactive-resume/releases/tag/v5.1.0)
- https://github.com/xitanggg/open-resume — README tech stack table, `package.json`
- https://github.com/rendercv/rendercv — README, `pyproject.toml` (`typst>=0.14.8`, Jinja2)
- https://github.com/yamlresume/yamlresume — README (XeTeX/Tectonic, HTML, DOCX; Typst roadmap)
- https://github.com/jsonresume/resume-cli — archived 2026-06-12; Puppeteer PDF ([issue #617](https://github.com/jsonresume/resume-cli/issues/617), [PR #275](https://github.com/jsonresume/resume-cli/pull/275))
- https://github.com/rbardini/resumed — `package.json` peer `puppeteer`
- https://github.com/posquit0/Awesome-CV — XeLaTeX
- https://github.com/saadq/resumake.io — retired; LaTeX on `v2`
- https://github.com/jsonresume/jsonresume-theme-class — ATS-friendly HTML theme
- https://github.com/santifer/career-ops — Playwright HTML→PDF, ATS Unicode flattening
- https://github.com/srbhr/Resume-Matcher — Playwright 1.58 + JD matching
- https://github.com/hacksalot/HackMyResume — wkhtmltopdf / WeasyPrint / Phantom as external CLIs
- https://github.com/jsonresume/jsonresume.org/tree/master/packages/ats-validator — HTML ATS scoring
- https://github.com/rendercv/rendercv/tree/main/scripts/ats_proof — Poppler / PyMuPDF / Affinda / Extracta / Klippa

Engines

- https://typst.app/blog/2025/typst-0.14/ — tagged by default, PDF/UA-1, PDF/A
- https://typst.app/docs/guides/accessibility/
- https://playwright.dev/docs/api/class-page#page-pdf-option-tagged
- https://blog.chromium.org/2020/07/using-chrome-to-generate-more.html
- https://doc.courtbouillon.org/weasyprint/stable/common_use_cases.html — `pdf/ua-1`, `pdf/a-2u`
- https://github.com/diegomura/react-pdf/issues/3179 — no PDF tagging
- https://github.com/Nizoka/pdfnative — tagged PDF/A, 12 stars
- https://github.com/gotenberg/gotenberg — Chromium/LibreOffice PDF sidecar

ATS

- https://www.jobscan.co/blog/20-ats-friendly-resume-templates/
- https://resumeoptimizerpro.com/blog/best-ats-friendly-resume-templates-2026 — single-column DOCX vs two-column PDF extract rates
- https://open-resume.com — Greenhouse/Lever claim (product README)

Internal

- [ADR-0015 pdfnative](../adr/0015-pdfnative-pdf-generation.md)
- [ADR-0016 Hono resume generation](../adr/0016-hono-resume-generation.md)
- `packages/api/src/routers/resume-pdf.ts`
