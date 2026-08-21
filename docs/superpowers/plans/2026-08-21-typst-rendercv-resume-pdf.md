# Typst + RenderCV engineeringresumes PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace pdfnative resume and cover-letter generation with RenderCV engineeringresumes (A4, PDF/UA-1) via a shared `@tsu-stack/pdf` package, with no template UI.

**Architecture:** Pure mapper (portfolio → RenderCV YAML) plus subprocesses (`rendercv` → `.typ`, then `typst compile --pdf-standard ua-1`). Cover letter is a vendored `.typ` compiled with the same Typst + `TYPST_FONT_PATHS`. API and agent both depend on the package. Delete pdfnative.

**Tech Stack:** TypeScript monorepo, `@tsu-stack/pdf`, RenderCV 2.8 + Typst ≥ 0.14, Python 3.12 in Docker, existing oRPC/R2 paths.

**Spec:** `docs/superpowers/specs/2026-08-21-typst-rendercv-resume-pdf-design.md`

**Worktree:** `.worktrees/typst-rendercv-resume-pdf` on `feat/typst-rendercv-resume-pdf`

@superpowers:test-driven-development @tsu-stack/core @.agents/end-to-end-features.md @.agents/orpc.md @.agents/logging.md @.agents/vite-plus.md

---

## File map

| Path | Role |
| --- | --- |
| `packages/pdf/**` | New package: types, mapper, spawn, cover-letter.template.ts, tests |
| `packages/api` | Import `@tsu-stack/pdf`; pass `user.summary`; typed PDF errors; delete pdfnative helpers |
| `apps/agent` | Same import; Accept error codes; delete duplicated `mastra/lib/pdf/*` |
| `apps/server` + `apps/agent` + `apps/web` Dockerfiles | COPY `packages/pdf/package.json`; server+agent also Python 3.12, rendercv[full]==2.8, Typst ≥ 0.14 |
| `pnpm-workspace.yaml` | Drop pdfnative catalog entries |
| ADRs / CONTEXT / README / `.agents/resume-pdf-generation.md` | Engine swap |

---

### Task 1: Scaffold `@tsu-stack/pdf`

**Files:**
- Create: `packages/pdf/package.json`
- Create: `packages/pdf/tsconfig.json`
- Create: `packages/pdf/vite.config.ts`
- Create: `packages/pdf/src/index.ts`
- Create: `packages/pdf/src/types.ts`

- [ ] **Step 1: Create package.json** matching `@tsu-stack/seo` (private, `#@/*` imports, `test:unit`: `vp test run`). Dependencies: `yaml` (npm), `@tsu-stack/core` workspace, `zod` catalog. Dev: tsconfig, vitest via vite-plus, `@types/node`. **Ship the cover letter as a TypeScript string** (`cover-letter.template.ts` exporting the Typst source). Do **not** use Vite `?raw` (Mastra/Node agent will not resolve it) and do **not** `fs.readFile` via `import.meta.url`. Keep `@tsu-stack/pdf` inside `ssr.noExternal` (`/@tsu-stack/`).

- [ ] **Step 2: tsconfig** extends `@tsu-stack/tsconfig/tsconfig.base.json` with `#@/*` paths. vite.config.ts `test.include: ["**/__tests__/**/*.test.ts"]`.

- [ ] **Step 3: Export empty `renderResumePdfBytes` / `renderCoverLetterPdfBytes` stubs that throw `PDF_ENGINE_UNAVAILABLE` so dependents can compile incrementally.** Types: `ResumePdfInput` with `portfolio`, `profile`, `summary` (`user.summary`), optional `professionalSummary`; `CoverLetterPdfInput` (+ contacts + email). Mapper uses trimmed-non-empty `professionalSummary` else `summary`.

- [ ] **Step 4: `vp install` from repo root; `vp check` in `packages/pdf`.**

- [ ] **Step 5: Commit** `chore: scaffold @tsu-stack/pdf package`

---

### Task 2: Mapper tests then YAML mapper (TDD)

**Files:**
- Create: `packages/pdf/src/headline.ts`
- Create: `packages/pdf/src/contacts.ts`
- Create: `packages/pdf/src/map-rendercv-yaml.ts`
- Create: `packages/pdf/src/__tests__/map-rendercv-yaml.test.ts`
- **Copy** helpers from `packages/api/src/routers/resume-pdf.ts` into `packages/pdf` (`extractBullets`, `stripHtml`, `groupStacksByType`, `filterPortfolioProjectStacks`, `projectStackNames`). **Do not delete** `resume-pdf.ts` until Task 5. `formatStackTypeLabel` stays imported from `@tsu-stack/core`.

**RenderCV date fields:** emit `YYYY-MM` / `YYYY` / `present` from stored ISO (`fromDate`/`toDate`/`isPresent`). Do **not** use `formatResumeMonthYear` display strings in YAML.

**Social username table:**

| type | network | username |
| --- | --- | --- |
| github | GitHub | path after github.com or handle without `@` |
| linkedin | LinkedIn | path after linkedin.com/in/ without `@` |
| x | X (Twitter) or GitHub’s expected `X` literal — match RenderCV schema enum exactly | handle without `@` |
| youtube | YouTube | **no** leading `@` |
| instagram | Instagram | handle without `@` |
| telegram | Telegram | handle without `@` |
| bluesky | Bluesky | handle without `@` |
| mastodon | Mastodon | `@user@domain` only; omit otherwise |
| discord / unknown | omit | |

Invalid phone / website: omit field (website must be HttpUrl via existing https prefixing; omit if still invalid). Extra emails: omit if not `@`.

- [ ] **Step 1: Write failing tests** in `map-rendercv-yaml.test.ts` covering: A4 + `engineeringresumes`; no photo; no education; headline present-job latest `fromDate`; omit headline if no experiences; `stripHtml` summary; empty professionalSummary falls back; extractBullets not flattened HTML; `Stack: a · b` last project highlight; Discord omitted; YouTube `@foo` → username `foo`; invalid phone omitted; tel allowed on contact line.

- [ ] **Step 2: Run** `vp run test:unit` in `packages/pdf` — expect FAIL.

- [ ] **Step 3: Implement mapper** emitting a JS object then `yaml.stringify`. Hardcode theme and page size.

- [ ] **Step 4: Tests pass.**

- [ ] **Step 5: Commit** `feat(pdf): map portfolio to RenderCV engineeringresumes YAML`

---

### Task 3: Spawn RenderCV + Typst (resume bytes)

**Files:**
- Create: `packages/pdf/src/spawn.ts`
- Create: `packages/pdf/src/errors.ts` (`PdfEngineUnavailableError`, `PdfRenderFailedError`)
- Modify: `packages/pdf/src/index.ts`

Behavior:
1. `mkdtemp`
2. Write `cv.yaml`
3. Spawn `rendercv render cv.yaml --dont-generate-pdf`. Locate the generated `.typ`. Never store RenderCV’s PDF.
4. Spawn `typst compile --pdf-standard ua-1 --input` as needed so document title/lang are set. If the generated `.typ` already has them, skip inputs.
5. Read PDF bytes; `rm -rf` in `finally`
6. Timeout 30s, kill process group
7. Missing binary → `PdfEngineUnavailableError`
8. One outcome log (duration, bytes, ok/fail) — no YAML/PII. Use `@tsu-stack/logger` only if that does not pull server-only env into the package; otherwise return metadata to the caller and log in API/agent. Prefer logging in the spawn module with a small `console`/`debug` only if logger creates a cycle — **plan default:** throw typed errors; callers log. Spec wants one outcome log: add a `onRender` callback or log from API/agent wrappers. **Do log from `packages/api` and `apps/agent` wrappers** to avoid pdf→logger→env cycles.

- [ ] **Step 1: Implement spawn + `renderResumePdfBytes`.**

- [ ] **Step 2: Manual smoke if binaries exist; unit-test “ENOENT → PdfEngineUnavailableError” by stubbing spawn.**

- [ ] **Step 3: Commit** `feat(pdf): render resume via rendercv and Typst UA-1`

---

### Task 4: Cover letter Typst

**Files:**
- Create: `packages/pdf/src/cover-letter.template.ts`
- Create: `packages/pdf/src/cover-letter.ts`
- Create: `packages/pdf/src/__tests__/cover-letter.test.ts`

- [ ] **Step 1: Tests** for paragraph split, contact line omits Discord, empty body throws before spawn.

- [ ] **Step 2: Implement** `#set document(title: name, lang: "en")`, `#set page(paper: "a4")`, header name + contact line, date/company/Re, body paragraphs. No H1 “Cover Letter”. `TYPST_FONT_PATHS` from `rendercv-fonts` data dir (document lookup: `python -c "import rendercv_fonts"` or well-known path). Compile `--pdf-standard ua-1`.

- [ ] **Step 3: Commit** `feat(pdf): cover letter Typst matching engineeringresumes`

---

### Task 5: Wire API (`resume.generate` + Accept)

**Files:**
- Modify: `packages/api/src/routers/resume.router.ts` — pass `user.summary`; `.errors({ PDF_ENGINE_UNAVAILABLE, PDF_RENDER_FAILED })`; catch mapper/spawn errors
- Modify: `packages/api/src/lib/application/accept-apply-package.ts` — import `@tsu-stack/pdf`; pass contacts+email to cover letter; pass `userRow.summary` on `ResumePdfInput` so empty/whitespace `draft.professionalSummary` can fall back; extend `AcceptApplyPackageErrorCode` with `PDF_ENGINE_UNAVAILABLE` | `PDF_RENDER_FAILED`; wrap spawn errors
- Modify: `packages/api` applications Accept **handler if-chain** to `errors.PDF_ENGINE_UNAVAILABLE()` / `errors.PDF_RENDER_FAILED()` (today unknown codes become `INVALID_DRAFT`)
- Modify: `apps/web/src/features/applications/api/accept-apply-package.mutation.ts` (and resume generate toast) to handle those codes
- Modify: `ResumePdfInput` mapper to treat trimmed-empty `professionalSummary` as missing (use `user.summary`)
- Modify: `packages/api/package.json` — depend `@tsu-stack/pdf`, remove pdfnative
- Delete: `packages/api/src/lib/pdf/**` font helpers, `packages/api/src/lib/application/cover-letter-pdf.ts`, large `resume-pdf.ts` after moving remaining helpers
- Replace: `packages/api/src/routers/__tests__/resume-pdf.test.ts` — re-export mapper tests or delete and rely on `packages/pdf` tests; remove pdfnative `validatePdfUA`
- Delete: `packages/api/src/routers/__tests__/resume-pdf-weight-preview.test.ts`
- Modify: apply-package router `.errors` if Accept surfaces codes to the client
- Modify: `apps/web` Accept/generate toast switch if it maps error codes

- [ ] **Step 1: Wire generate + Accept; typed errors.**

- [ ] **Step 2: `vp check` in packages/api.**

- [ ] **Step 3: Commit** `feat(api): generate resumes with @tsu-stack/pdf`

---

### Task 6: Wire agent, delete duplicates

**Files:**
- Modify: `apps/agent/src/mastra/lib/accept-apply-package.ts` — same error codes; pass `user.summary` + contacts into `@tsu-stack/pdf`
- Delete: `apps/agent/src/mastra/lib/pdf/resume-pdf.ts`, `cover-letter-pdf.ts`, `pdfa-latin-font.ts`, `fonts/**`
- Modify: `apps/agent/package.json` — `@tsu-stack/pdf`, drop pdfnative

- [ ] **Step 1: Same Accept error codes and PDF calls as API.**

- [ ] **Step 2: `vp check` in apps/agent.**

- [ ] **Step 3: Commit** `feat(agent): use @tsu-stack/pdf for apply-package PDFs`

---

### Task 7: Remove pdfnative from catalog and web

**Files:**
- Modify: `pnpm-workspace.yaml` catalog (drop pdfnative, pdfnative-react)
- Modify: `apps/web/package.json`, `apps/server/package.json` if listed
- Modify: `apps/web/Dockerfile` comments
- Modify: `apps/server/vite.config.ts` external list

- [ ] **Step 1: Grep pdfnative; remove all production refs. Keep `unpdf`.**

- [ ] **Step 2: `vp install`; `vp run -w fix` if multi-package, else package-local `vp check`.**

- [ ] **Step 3: Commit** `chore: remove pdfnative`

---

### Task 8: Docker — Python 3.12 + Typst + RenderCV

**Files:**
- Modify: `apps/server/Dockerfile` — **build** stage `COPY packages/pdf/package.json packages/pdf/` **before** `vp install --frozen-lockfile` (same pattern as other packages)
- Modify: `apps/agent/Dockerfile` — same COPY
- Modify: `apps/web/Dockerfile` — same COPY (web lockfile includes workspace packages even if it does not spawn Typst)
- Modify: server + agent **runtime** stages: install engines as **root** into `/usr/local/bin` **before** `USER server` / `USER agent`

**Runtime (bookworm-slim is Python 3.11):**
- `curl`, `ca-certificates`
- Typst ≥ 0.14 from GitHub releases, pin version + **sha256 per `TARGETARCH`** (amd64 + arm64)
- `uv python install 3.12` then `uv pip install --system 'rendercv[full]==2.8'` (pin exact 2.8.x)
- `TYPST_FONT_PATHS` to `rendercv-fonts` data dir
- Document local: same pins on PATH for `pnpm run dev`

- [ ] **Step 1: COPY `packages/pdf/package.json` in server, agent, **and web** Dockerfiles before `vp install`. Python/Typst/rendercv only on server+agent runtime, as root, before `USER`. Symlink `rendercv`/`typst` to `/usr/local/bin` (uv tool/venv does not do this by itself).`

- [ ] **Step 2: Document local: `uv pip install 'rendercv[full]==2.8'` and Typst 0.14 on PATH for `pnpm run dev`.**

- [ ] **Step 3: Commit** `chore: install RenderCV and Typst in server and agent images`

---

### Task 9: Docs

**Files:**
- Create: `docs/adr/0027-typst-rendercv-resume-pdf.md` (next free ADR number — verify)
- Modify: `CONTEXT.md` PDF renderer / Tagged PDF
- Modify: `README.md` stack table
- Modify: `.agents/resume-pdf-generation.md` if present
- Modify: apply-package spec footnote

- [ ] **Step 1: Write ADR superseding 0015 engine; 0016 still valid for Hono placement.**

- [ ] **Step 2: Commit** `docs: ADR for Typst/RenderCV resume PDFs`

---

### Task 10: Harness (apply-package + generate)

After code lands, follow `.agents/skills/ai-feature-harness/SKILL.md`: dashboard generate + apply-package Accept, both PDFs open as UA-looking tagged text. Append LESSONS.md.

- [ ] **Step 1: Manual generate + Accept with engines installed.**

- [ ] **Step 2: Note failures in LESSONS if any.**

---

## Execution

Use **subagent-driven-development**: one implementer per task, then spec review, then code quality review. Work only in `.worktrees/typst-rendercv-resume-pdf` on `feat/typst-rendercv-resume-pdf`.
