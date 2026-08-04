# Application Apply Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-application Mastra workflow that drafts a tailored resume, cover letter, and recruiter outreach email; Accept materializes PDFs; Confirm Send attaches resume and advances stage.

**Architecture:** Server builds portfolio + job context, calls `apply-package-workflow` on the agent worker (BYO `applyPackage` model), persists `applyPackageDraft` on `application`. Accept renders resume + cover PDFs and writes accepted fields (clears draft). Send uses extended `sendCareerReply` with PDF attachment.

**Tech Stack:** TanStack monorepo, Drizzle, oRPC, Mastra, pdfnative, Resend, React/coss UI.

**Spec:** `docs/superpowers/specs/2026-08-04-application-apply-package-design.md`

**Worktree:** `.worktrees/career-mail-assistant-p0` on `feature/career-mail-assistant-p0`

---

## File map

| Path                                                                      | Role                                              |
| ------------------------------------------------------------------------- | ------------------------------------------------- |
| `packages/db/src/schema/application.schema.ts`                            | New columns                                       |
| `packages/db/migrations/*`                                                | Migration                                         |
| `packages/db/src/repositories/application.repository.ts`                  | **Explicit field whitelist** for every new column |
| `packages/db/src/schema/user-ai-settings.schema.ts`                       | `StoredAiModels` includes `applyPackage`          |
| `packages/core/src/application/apply-package.ts`                          | Draft schema + constants                          |
| `packages/core/src/application/types.ts`                                  | Output/update fields                              |
| `packages/core/src/ai-settings/*`                                         | `applyPackage` feature                            |
| `packages/api/src/routers/ai-settings.router.ts`                          | Merge missing model keys with defaults on read    |
| `apps/web/src/routes/api/cover-letter/download/` or applications download | Auth cover PDF download                           |
| `apps/agent/skills/application-apply-package/SKILL.md`                    | Agent skill                                       |
| `apps/agent/src/mastra/workflows/apply-package-workflow/`                 | Workflow                                          |
| `apps/agent/src/mastra/agents/apply-package-agent.ts`                     | Agent                                             |
| `apps/agent/src/mastra/index.ts`                                          | Register                                          |
| `packages/api/src/lib/application/call-apply-package-agent.ts`            | Agent HTTP call                                   |
| `packages/api/src/lib/application/generate-apply-package.ts`              | Generate orchestration                            |
| `packages/api/src/lib/application/accept-apply-package.ts`                | Accept orchestration                              |
| `packages/api/src/lib/application/send-application-outreach.ts`           | Send orchestration                                |
| `packages/api/src/lib/mail/send-career-reply.ts`                          | Attachments                                       |
| `packages/api/src/routers/resume-pdf.ts`                                  | Override portfolio builder                        |
| `packages/api/src/lib/application/cover-letter-pdf.ts`                    | Cover PDF bytes                                   |
| `packages/api/src/routers/applications.router.ts`                         | New procedures + mappers                          |
| `apps/web/.../applications/*`                                             | CTAs, package sheet, send dialog                  |

---

### Task 1: DB schema + migration for apply package columns

**Files:**

- Modify: `packages/db/src/schema/application.schema.ts`
- Create: migration via `pnpm db:generate` (or repo’s drizzle generate script)
- Modify: `packages/db/src/repositories/application.repository.ts` (**required** — explicit field whitelist)

- [ ] **Step 1: Add columns to Drizzle schema**

Add nullable fields:

```ts
recruiterEmail: text("recruiter_email"),
coverLetterBody: text("cover_letter_body"),
coverLetterR2Key: text("cover_letter_r2_key"),
coverLetterFilename: text("cover_letter_filename"),
outreachSubject: text("outreach_subject"),
outreachBody: text("outreach_body"),
outreachSentAt: timestamp("outreach_sent_at", { withTimezone: true }),
outreachProviderMessageId: text("outreach_provider_message_id"),
applyPackageDraft: jsonb("apply_package_draft").$type<unknown>(),
applyPackageDraftedAt: timestamp("apply_package_drafted_at", { withTimezone: true }),
```

- [ ] **Step 2: Update `applicationRepository.update` (and create if needed) whitelist**

Every new column must appear in the repository’s explicit set/patch maps. Silent omission = generate/accept/send appear to work but DB never updates.

- [ ] **Step 3: Generate and apply migration**

```bash
pnpm db:generate
pnpm db:migrate
```

Expected: migration applied cleanly.

- [ ] **Step 4: Commit**

```bash
git add packages/db
git commit -m "feat(db): application apply package columns"
```

---

### Task 2: Core contracts — draft schema + AiFeature + ApplicationOutput

**Files:**

- Create: `packages/core/src/application/apply-package.ts`
- Modify: `packages/core/src/application/index.ts` (export)
- Modify: `packages/core/src/application/types.ts`
- Modify: `packages/core/src/ai-settings/types.ts`
- Modify: `packages/core/src/ai-settings/constants.ts`
- Modify: `packages/db/src/schema/user-ai-settings.schema.ts` (`StoredAiModels`)
- Modify: `packages/api/src/routers/ai-settings.router.ts` (merge defaults on read)
- Test: `packages/core/src/application/__tests__/apply-package.test.ts`

- [ ] **Step 1: Write failing unit tests for draft schema**

```ts
import { describe, expect, it } from "vitest";
import { ApplyPackageDraftSchema, THIN_JD_DESCRIPTION_CHARS } from "../apply-package";

describe("ApplyPackageDraftSchema", () => {
  it("accepts a minimal valid draft", () => {
    const parsed = ApplyPackageDraftSchema.safeParse({
      applicationId: "app1",
      generatedAt: new Date().toISOString(),
      jobContext: {
        title: "FE",
        companyName: "Acme",
        descriptionUsed: "x".repeat(50),
        listingFetched: false
      },
      proposedRecruiterEmail: null,
      professionalSummary: "Summary",
      experiences: [],
      projects: [],
      stacks: [],
      coverLetterBody: "Dear team...",
      outreachSubject: "Application",
      outreachBody: "Hi..."
    });
    expect(parsed.success).toBe(true);
  });

  it("exposes thin JD threshold", () => {
    expect(THIN_JD_DESCRIPTION_CHARS).toBe(400);
  });
});
```

- [ ] **Step 2: Run test — expect fail**

```bash
pnpm exec vitest run packages/core/src/application/__tests__/apply-package.test.ts
```

- [ ] **Step 3: Implement `apply-package.ts` + AiFeature + extend ApplicationOutputSchema**

Include:

- `ApplyPackageDraftSchema` (match spec)
- `ApplyPackageWorkflowInputSchema` (shared API ↔ agent payload: job fields, portfolio snapshot, llm)
- `THIN_JD_DESCRIPTION_CHARS = 400`
- `isThinJobDescription(description: string | null): boolean`
- Input schemas: `GenerateApplyPackageInputSchema`, `AcceptApplyPackageInputSchema`, `SendOutreachInputSchema`
- Extend `ApplicationOutputSchema` with new columns (draft as optional/nullable json)
- Extend `UpdateApplicationInputSchema` with `recruiterEmail`, cover/outreach body fields for Review materials edits
- Add `applyPackage` to `AiFeatureSchema`, `AI_FEATURES`, labels, `DEFAULT_AI_MODELS`
- Update `StoredAiModels` in db schema to include `applyPackage?: string`
- On AI settings GET (and update base merge): `models = { ...defaultAiModels(), ...row.models }` so existing users without the key do not fail Zod parse

- [ ] **Step 4: Run tests — pass**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): apply package draft schema and AI feature"
```

---

### Task 3: Mastra skill + agent + apply-package-workflow

**Files:**

- Create: `apps/agent/skills/application-apply-package/SKILL.md`
- Create: `apps/agent/src/mastra/agents/apply-package-agent.ts`
- Create: `apps/agent/src/mastra/workflows/apply-package-workflow/index.ts`
- Modify: `apps/agent/src/mastra/skills-paths.ts` (if pattern exists)
- Modify: `apps/agent/src/mastra/index.ts`

- [ ] **Step 1: Write skill SKILL.md**

Rules: select + rewrite only; no invented employers; cover vs email tone; project analysis is private signal only; return structured draft only.

- [ ] **Step 2: Agent with `byoModelFromRequestContext` + skill path**

- [ ] **Step 3: Workflow**

- Input: application job fields + portfolio snapshot + llm config
- Step: `generateModelOption` + `RequestContext` with `LLM_REQUEST_CONTEXT_KEYS` (same harvest fix)
- Structured output: `ApplyPackageDraftSchema`
- On missing model: fail notes (server treats as AGENT_FAILED)

- [ ] **Step 4: Register workflow + agent in `mastra/index.ts`**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(agent): apply-package workflow and skill"
```

---

### Task 4: API — generate apply package (agent call + draft persist)

**Files:**

- Create: `packages/api/src/lib/application/call-apply-package-agent.ts`
- Create: `packages/api/src/lib/application/generate-apply-package.ts`
- Modify: `packages/api/src/routers/applications.router.ts`
- Modify: `packages/db` repository `update` to accept draft fields

- [ ] **Step 1: Implement agent client**

Mirror harvest/reply call pattern: create-run + start/stream, parse draft schema, fail-closed.

**Critical:** `TIMEOUT_MS = 180_000` (not 45s mail-reply default). Spec requires long portfolio rewrite budget; server timeout must match workflow.

- [ ] **Step 2: `generateApplyPackage`**

1. Load application for user
2. Load opted-in experiences/projects (**include `project.analysis`**)/stacks/contacts/profile
3. If no experiences and no projects → `NO_EVIDENCE`
4. `resolveRuntimeAiCredentials(userId, "applyPackage")` — no key → `AI_NOT_CONFIGURED`
5. If thin JD + url → server-side page fetch helper (do not import agent app into api; small fetch util in packages/api)
6. Call agent (180s timeout)
7. Validate experience/project ids ⊆ portfolio set
8. Persist `applyPackageDraft` + `applyPackageDraftedAt` via repository whitelist + optional set `recruiterEmail` only if currently null and proposed email valid
9. Return full application output including draft

- [ ] **Step 3: Wire `applications.generateApplyPackage` with typed errors**

Map: `NOT_FOUND`, `NO_EVIDENCE`, `AI_NOT_CONFIGURED`, `AGENT_FAILED` (per spec error table).

- [ ] **Step 4: Update `toApplicationOutput` mapper for new fields**

- [ ] **Step 5: Manual smoke** (agent running): generate on one application id

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(api): generate apply package draft"
```

---

### Task 5: Accept package — resume + cover PDFs + cover download

**Files:**

- Modify: `packages/api/src/routers/resume-pdf.ts` (or create override path) — **add professional summary section** if missing today
- Create: `packages/api/src/lib/application/cover-letter-pdf.ts`
- Create: `packages/api/src/lib/application/accept-apply-package.ts`
- Create: cover download route (mirror `apps/web/src/routes/api/resume/download/`) e.g. `apps/web/src/routes/api/cover-letter/download/index.ts` **or** oRPC `applications.getCoverLetterDownload` returning signed/bytes
- Modify: applications router

- [ ] **Step 1: Cover letter PDF helper**

Return `Uint8Array` for simple multi-paragraph cover letter.

- [ ] **Step 2: Resume builder override**

Accept selected experiences/projects with rewritten bullets + **professional summary block** + live dates from DB by id + profile/contacts from current user.

- [ ] **Step 3: `acceptApplyPackage`**

1. Resolve draft (request body preferred else DB draft)
2. Filter `include: true`
3. Build resume PDF → put `{userId}/resumes/...` → `resumeRepository.create` author agent
4. Delete old cover object if `coverLetterR2Key` set
5. Put cover PDF → keys on application
6. Write cover/outreach/recruiter fields from draft
7. Set `resumeId` to new resume
8. Clear draft columns
9. Return application

- [ ] **Step 4: Cover download (authenticated)**

Mirror resume download: session user must own application; stream/return PDF from `coverLetterR2Key`.

- [ ] **Step 5: Wire accept procedure** (`NOT_FOUND`, draft missing errors)

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(api): accept apply package materializes PDFs"
```

---

### Task 6: Send outreach with resume attachment + stage + hard-delete cover cleanup

**Files:**

- Modify: `packages/api/src/lib/mail/send-career-reply.ts`
- Create: `packages/api/src/lib/application/send-application-outreach.ts`
- Modify: applications router (`sendOutreach` + **`delete`/`deleteMany` cover object cleanup**)

- [ ] **Step 1: Extend sendCareerReply**

```ts
attachments?: Array<{ filename: string; content: Buffer | string }>;
```

Pass Resend `attachments` as base64 content per Resend API.

- [ ] **Step 2: `sendApplicationOutreach`**

1. Load app; reject if `outcome` set
2. Require recruiterEmail, resumeId, subject, body
3. Load resume bytes from media bucket
4. `sendCareerReply` with attachment
5. Set `outreachSentAt`, `outreachProviderMessageId` via repository `update` whitelist
6. If stage === `saved`, call **`applicationRepository.updateStage`** (or equivalent) for `applied` + `stageChangedAt` — do not put stage on body `update` patch

Typed errors: `NO_RESUME`, `NO_RECIPIENT`, `MAIL_NOT_CONFIGURED`, `SEND_FAILED`, `NOT_FOUND` (closed → `SEND_FAILED` or dedicated if preferred).

- [ ] **Step 3: Wire `applications.sendOutreach`**

- [ ] **Step 4: Hard delete cleanup**

On `applications.delete` / `deleteMany`: **load rows (or select `coverLetterR2Key`) before delete** — `deleteMany` returns only ids. Then `mediaBucket.delete` each cover key. Do **not** delete linked resume (catalog stays).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(api): send application outreach with resume PDF"
```

---

### Task 7: Web UI — package sheet + CTAs + send

**Files:**

- Create: `apps/web/src/features/applications/api/generate-apply-package.mutation.ts`
- Create: `apps/web/src/features/applications/api/accept-apply-package.mutation.ts`
- Create: `apps/web/src/features/applications/api/send-outreach.mutation.ts`
- Create: `apps/web/src/pages/dashboard/applications/ui/apply-package-sheet.tsx`
- Modify: `application-info-panel.tsx`, board card menu, list row menu
- Modify: application form if needed for recruiterEmail field

- [ ] **Step 1: Mutations with toast error handling**

- [ ] **Step 2: Apply package sheet**

Editable draft fields; Accept; Regenerate with confirm dialog.

- [ ] **Step 3: Entry actions per state** (Prepare / Review package / Regenerate / Review materials / Send)

- [ ] **Step 4: Send AlertDialog** — To, subject, “Resume will be attached”

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): apply package sheet and outreach send UI"
```

---

### Task 8: Settings label + docs touch-up

**Files:**

- Modify: AI settings UI if it maps features from `AI_FEATURE_LABELS` automatically (should pick up)
- Modify: `.agents/media-storage.md` briefly for cover-letters purpose (if file exists)

- [ ] **Step 1: Ensure applyPackage appears in AI model feature list**

- [ ] **Step 2: Note cover-letters object prefix in media storage agent doc**

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: apply package media purpose and AI feature label"
```

---

### Task 9: Verification pass

- [ ] **Step 1: Typecheck**

```bash
pnpm exec tsc --noEmit -p packages/core
pnpm exec tsc --noEmit -p packages/api
pnpm exec tsc --noEmit -p apps/agent
pnpm exec tsc --noEmit -p apps/web
```

Filter to new/changed files; fix errors introduced by this feature.

- [ ] **Step 2: Unit tests**

```bash
pnpm exec vitest run packages/core/src/application/__tests__/apply-package.test.ts
```

Include: `isThinJobDescription` boundary cases; optional unit for preflight “empty portfolio” pure helper if extracted.

- [ ] **Step 3: Smoke (dev stack)**

1. Open application with portfolio data
2. Prepare → draft sheet
3. Accept → resume + cover linked
4. Set recruiter email → Send → stage applied

- [ ] **Step 4: Final commit if fixes needed**

---

## Out of scope (do not implement)

- Review queue kinds for packages
- Auto-send
- Package version history
- Non-portfolio private entities
- Easy Apply automation
