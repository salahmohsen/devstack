# Owner Onboarding — Resume Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner upload a PDF resume via files-sdk (with upload %), run a Mastra extract workflow into a client-held draft, review with coss UI, and apply profile/experiences/projects/stacks in one outer DB transaction (portfolio opt-in), with soft onboarding CTAs.

**Architecture:** Browser → files-sdk `/api/files` (`resume-sources/{uuid}.pdf`) → `onboarding.extract` (PDF→text + stream `resume-import-workflow`) → client draft review → `onboarding.apply` (shared `tx`) | `skip` | `discardSource`. Spec: `docs/superpowers/specs/2026-07-26-owner-onboarding-resume-import-design.md`. ADR: `docs/adr/0023-resume-import-not-generated-resume.md`.

**Tech Stack:** Drizzle/Postgres, `@tsu-stack/core` Zod, oRPC, Mastra workflows/agents, files-sdk, PDF text lib (`unpdf` preferred for pure ESM), TanStack Start/Router/Query, `@tsu-stack/ui` (coss), existing `UploadProgress`.

**Skills to load while implementing:** `@mastra` skill (never invent Mastra APIs), `@coss` / coss-particles for UI, `@.agents/end-to-end-features.md`, `@.agents/orpc.md`, `@.agents/media-storage.md` (update if conventions change).

---

## File Structure

| Action | Path                                                                                         | Responsibility                                       |
| ------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Modify | `packages/db/src/schema/auth.schema.ts`                                                      | `onboardingCompletedAt` column on `user`             |
| Create | drizzle migration (via `vp run db:generate`)                                                 | Migration for new column                             |
| Modify | `packages/db/src/types/auth.schema.ts` (if hand-maintained / regenerate)                     | Types for user                                       |
| Modify | `packages/db/src/repositories/user.repository.ts`                                            | Update/find helpers for onboarding timestamp         |
| Create | `packages/db/src/lib/onboarding-apply.ts` (or `repositories/onboarding-apply.repository.ts`) | Outer-tx apply writes                                |
| Create | `packages/core/src/onboarding/types.ts`                                                      | Draft, extract, apply, status schemas                |
| Create | `packages/core/src/onboarding/constants.ts`                                                  | Size limits, key prefix, contact icon defaults       |
| Create | `packages/core/src/onboarding/utils.ts`                                                      | Key normalize, date/year helpers (pure)              |
| Create | `packages/core/src/onboarding/index.ts`                                                      | Barrel                                               |
| Modify | `packages/core/src/index.ts`                                                                 | Export onboarding                                    |
| Create | `packages/core/src/onboarding/__tests__/utils.test.ts` (or package test path)                | Normalize/key tests                                  |
| Create | `apps/agent/src/mastra/agents/resume-import-extractor-agent.ts`                              | Structured extract agent                             |
| Create | `apps/agent/src/mastra/workflows/resume-import-workflow/*`                                   | prepare/extract/normalize/format steps               |
| Modify | `apps/agent/src/mastra/index.ts`                                                             | Register agent + workflow                            |
| Create | `packages/api/src/lib/onboarding/pdf-text.ts`                                                | PDF bytes → text                                     |
| Create | `packages/api/src/lib/onboarding/object-key.ts`                                              | Resolve/authorize keys                               |
| Create | `packages/api/src/routers/onboarding.router.ts`                                              | status/extract/apply/skip/discardSource              |
| Modify | `packages/api/src/routers/index.ts`                                                          | Mount `onboarding`                                   |
| Modify | `packages/api/package.json`                                                                  | PDF parse dependency                                 |
| Create | `apps/web/src/features/onboarding/api/*`                                                     | Query/mutation wrappers                              |
| Create | `apps/web/src/features/onboarding/index.ts`                                                  | Barrel                                               |
| Create | `apps/web/src/pages/dashboard/onboarding/*`                                                  | Page + steps UI                                      |
| Create | `apps/web/src/routes/(root-layout)/__protected/dashboard/onboarding/index.tsx`               | Route                                                |
| Modify | dashboard home / settings / sidebar                                                          | Soft CTAs + nav link                                 |
| Modify | `.agents/media-storage.md`                                                                   | Record real S3/files-sdk + resume-sources convention |

---

### Task 1: DB — `onboardingCompletedAt` on user

**Files:**

- Modify: `packages/db/src/schema/auth.schema.ts`
- Create: migration via generate
- Modify: `packages/db/src/repositories/user.repository.ts`
- Types: regenerate or update `packages/db/src/types` per repo convention

- [ ] **Step 1: Add column to user table**

```ts
// packages/db/src/schema/auth.schema.ts — add field on user
onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true });
```

Keep Better Auth–owned columns intact; this is an app field on the same table (same pattern as `summary` / `phone`).

- [ ] **Step 2: Generate migration**

```bash
vp run db:generate
```

Expected: new SQL migration adding `onboarding_completed_at`.

- [ ] **Step 3: Check DATABASE_URL is not production**

```bash
# Print host only — do not log full secrets in chat if avoidable
node -e "const u=process.env.DATABASE_URL; if(!u) console.log('missing'); else console.log(new URL(u.replace(/^postgres(ql)?:/,'http:')).host)"
```

If production/main, **stop** and warn the user (per `.agents/workflow.md`).

- [ ] **Step 4: Apply migration**

```bash
vp run db:migrate
```

- [ ] **Step 5: Extend userRepository**

Add:

```ts
async setOnboardingCompletedAt(id: string, at: Date | null): Promise<UserSchemaSelect | null> {
  const [updated] = await getDb()
    .update(user)
    .set({ onboardingCompletedAt: at })
    .where(eq(user.id, id))
    .returning();
  return updated ?? null;
}
```

Also allow `update` to accept partial including `onboardingCompletedAt` if the insert type is partial-friendly.

- [ ] **Step 6: Commit**

```bash
git add packages/db
git commit -m "feat(db): add user.onboardingCompletedAt for owner onboarding"
```

---

### Task 2: Core — onboarding schemas and pure helpers

**Files:**

- Create: `packages/core/src/onboarding/constants.ts`
- Create: `packages/core/src/onboarding/types.ts`
- Create: `packages/core/src/onboarding/utils.ts`
- Create: `packages/core/src/onboarding/index.ts`
- Modify: `packages/core/src/index.ts`
- Test: package unit test for utils (follow existing core/db test layout)

- [ ] **Step 1: Constants**

```ts
// packages/core/src/onboarding/constants.ts
export const RESUME_SOURCE_KEY_PREFIX = "resume-sources/";
export const RESUME_SOURCE_MAX_BYTES = 10 * 1024 * 1024; // 10MB
export const RESUME_SOURCE_MIME = "application/pdf";

// Use IconPicker / icons-data names already used by profile UI, e.g.:
export const CONTACT_TYPE_DEFAULT_ICONS = {
  website: "FaGlobe",
  email: "FaEnvelope",
  phone: "FaPhone",
  location: "FaMapMarkerAlt",
  linkedin: "FaLinkedin",
  github: "FaGithub",
  x: "FaXTwitter", // or SiX — verify against apps/web icons-data
  youtube: "FaYoutube"
} as const;
```

**Before committing constants:** open `apps/web/src/shared/ui/icons-data.ts` (or profile-settings defaults) and copy **exact** icon ids that render in IconPicker. Do not invent lucide short names.

- [ ] **Step 2: Zod types**

Define in `types.ts` (names can match spec):

- `ResumeImportContactSchema` — `type` + `value` (+ optional icon filled later)
- `ResumeImportExperienceDraftSchema` — fields + `clientId` + `selected` + `includedInPortfolio`
- `ResumeImportProjectDraftSchema` — + `experienceClientId?` + `stackNames`
- `ResumeImportStackDraftSchema`
- `ResumeImportDraftSchema` — profile + arrays + meta
- `ResumeImportExtractClientInputSchema` — `{ objectKey: string, filename?: string }`
- `ResumeImportWorkflowInputSchema` — `{ resumeText, sourceFilename?, existingProfile, existingStacks: {id,name}[] }`
- `OnboardingStatusOutputSchema` — `{ onboardingCompletedAt: Date | null }`
- `OnboardingApplyInputSchema` — full draft **plus optional `objectKey?: string`** (for post-commit session PDF delete)
- `OnboardingSkipInputSchema` — `{ objectKey?: string }`
- `OnboardingDiscardSourceInputSchema` — `{ objectKey: string }`

Default `selected: true`, `includedInPortfolio: true` via `.default(true)` where appropriate.

**EMPTY_DRAFT (document in types JSDoc):** reject Apply only when no selected experiences/projects/stacks **and** profile is a no-op (name/email/summary/contacts all effectively unchanged). Profile-only meaningful updates are allowed.

- [ ] **Step 3: Pure utils**

```ts
// utils.ts — examples
export function resolveResumeSourceObjectKey(objectKey: string, userId: string): string | null;
// reject resumes/, traversal, wrong user; accept relative or full prefix

export function assignClientIds<T>(items: T[]): (T & { clientId: string })[];
export function normalizeResumeYear(input: {
  year?: number;
  fromDate?: string | null;
  toDate?: string | null;
}): number;
export function withContactDefaultIcons(
  contacts: Array<{ type: string; value: string; icon?: string }>
);
```

- [ ] **Step 4: Export from core index**

```ts
export * from "#@/onboarding/index";
```

- [ ] **Step 5: Unit tests for key resolve + year normalize**

Write failing tests first, then implement.

Run: `pnpm --filter @tsu-stack/core test:unit` (or the package’s actual test script / `vp test` from package).

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core
git commit -m "feat(core): onboarding resume-import schemas and helpers"
```

---

### Task 3: Mastra — resume import extractor + workflow

**Files:**

- Create: `apps/agent/src/mastra/agents/resume-import-extractor-agent.ts`
- Create: `apps/agent/src/mastra/workflows/resume-import-workflow/index.ts`
- Create: `.../prepare.step.ts`, `extract.step.ts`, `normalize.step.ts`, `format.step.ts` (or fewer if steps merge cleanly)
- Create: optional local AI batch schema file
- Modify: `apps/agent/src/mastra/index.ts`

**Load mastra skill / embedded docs before coding.** Copy patterns from `detect-stacks-workflow` and `stack-categorizer-agent`.

- [ ] **Step 1: Extractor agent**

```ts
export function createResumeImportExtractorAgent() {
  return new Agent({
    id: "resume-import-extractor",
    name: "Resume Import Extractor",
    description:
      "Extracts profile, experiences, projects, and skills/stacks from resume plain text.",
    instructions: `You extract structured portfolio data from resume text.
Return only facts present or clearly implied. Prefer empty arrays over invention.
Skills map to stack names (technologies). Link projects to jobs when nested.
Dates: ISO YYYY-MM-DD when possible, else year-month first day, else null.
Do not use tools.`,
    model: MODEL_PRESETS.qualityFirst
  });
}
```

- [ ] **Step 2: Workflow**

```ts
export const resumeImportWorkflow = createWorkflow({
  id: "resume-import-workflow",
  inputSchema: ResumeImportWorkflowInputSchema,
  outputSchema: ResumeImportDraftSchema
})
  .then(prepare)
  .then(extract)
  .then(normalize)
  .then(format);

resumeImportWorkflow.commit();
```

- **prepare:** pass through text + existing stacks/profile
- **extract:** `agent.generate` + `structuredOutput: { schema }` + timeout race (copy detect-stacks)
- **normalize:** clientIds, year defaults, stack name trim/dedupe, default selected/included flags, contact icons
- **format:** assert output schema

- [ ] **Step 3: Register in mastra/index.ts**

```ts
agents: {
  // existing...
  resumeImportExtractor: createResumeImportExtractorAgent()
},
workflows: {
  // existing...
  resumeImportWorkflow
}
```

- [ ] **Step 4: Typecheck agent package**

```bash
cd apps/agent && vp check
```

Expected: pass (or fix types against current Mastra APIs).

- [ ] **Step 5: Commit**

```bash
git add apps/agent
git commit -m "feat(agent): resume-import-workflow and extractor agent"
```

---

### Task 4: API — PDF text + object key helpers

**Files:**

- Modify: `packages/api/package.json` — add PDF dependency
- Create: `packages/api/src/lib/onboarding/pdf-text.ts`
- Create: `packages/api/src/lib/onboarding/object-key.ts`

- [ ] **Step 1: Add dependency**

Prefer `unpdf` (ESM-friendly). If install fails or API unsuitable, fall back to `pdf-parse` with Node buffer.

```bash
# from repo root using workspace package manager (vp/pnpm per monorepo)
pnpm --filter @tsu-stack/api add unpdf
```

- [ ] **Step 2: Spike mediaBucket/Files download API (required before extract)**

Confirm how to read bytes for a key in this stack (`Files` / `mediaBucket`):

```bash
# Inspect files-sdk types in node_modules for get/download/arrayBuffer
rg -n "get\(|download\(|arrayBuffer|getObject" node_modules/files-sdk/dist --glob '*.d.ts' | head -40
```

Document the chosen call in `pdf-text.ts` comments. If only put/delete exist on context type, extend `OrpcContextMediaBucket` / runtime `files` wiring to expose a `get`/`download` used by extract only.

- [ ] **Step 3: pdf-text helper**

```ts
export async function extractTextFromPdf(bytes: Uint8Array): Promise<string> {
  // use unpdf getTextFromPdf or equivalent — verify against installed package docs
  // throw if empty after trim
}
```

Validate size ≤ `RESUME_SOURCE_MAX_BYTES` before parse.

- [ ] **Step 4: object-key helper**

Wrap `resolveResumeSourceObjectKey` from core; throw typed errors at call site.

- [ ] **Step 5: Commit**

```bash
git add packages/api
git commit -m "feat(api): PDF text extraction and resume-source key helpers"
```

---

### Task 5: API — onboarding apply service (outer transaction)

**Files:**

- Create: `packages/db/src/repositories/onboarding-apply.repository.ts` (or `packages/api/src/lib/onboarding/apply.ts` if you prefer API-layer orchestration with drizzle `getDb` — **prefer db package** so transactions stay with data)

**Critical:** Do **not** call `experienceRepository.create` / `projectRepository.create` / etc. that open their own transactions. Use one outer `getDb().transaction(async (tx) => { ... })` and insert via `tx.insert(...)` mirroring repo SQL, **or** add optional `tx` params to repo helpers and use only those from Apply.

- [ ] **Step 1: Implement applyInTransaction(userId, draft)**

Export from `packages/db/src/repositories/index.ts`.

**EMPTY_DRAFT guard (before opening tx):** throw if no selected experiences/projects/stacks **and** profile is effectively no-op vs current user (see core JSDoc).

Order (from spec):

1. Load current user; compute profile patch (name required; email if provided and non-empty; summary). Email change → uniqueness check → typed `EMAIL_TAKEN`; set `emailVerified: false` when address changes. Keep email + verification when omitted/empty.
2. **Contact merge (critical — do NOT call `contactRepository.upsert`):**
   - `contacts` omit / `undefined` / `[]` → **no-op** (leave all existing contacts).
   - Non-empty: for each draft contact, match by `(userId, type)`; update `value`/`icon` or insert with default icon.
   - Types not in draft: **leave unchanged** (no deletes).
   - **Do not** create/delete contact `portfolio_entry` rows.
   - All contact SQL uses shared `tx`.
3. Stacks with `selected`: case-insensitive name match; **Apply payload authoritative** for description/type; create/update; portfolio entry when `includedInPortfolio`.
4. **Orphan project stackNames:** after step 3, for any stack name referenced by selected projects but not yet resolved, create minimal stack (name only, `includedInPortfolio: true`) on `tx`.
5. Experiences selected: create + portfolio; map clientId → id; sequential sortOrder; coerce `description` to `""` if missing (NOT NULL).
6. Projects selected: resolve experience + stack ids; create + portfolio; sequential sortOrder; coerce `summary`/`description` to `""`; year already normalized.
7. Set `onboardingCompletedAt = new Date()` on user via `tx`.

Return summary counts for UI optional.

- [ ] **Step 2: Manual sanity (optional unit with mocked db later)**

If no DB test harness: defer to integration during manual QA.

- [ ] **Step 3: Commit**

```bash
git add packages/db packages/api
git commit -m "feat(db): transactional onboarding apply for resume import"
```

---

### Task 6: API — `onboarding` router + mount

**Files:**

- Create: `packages/api/src/routers/onboarding.router.ts`
- Modify: `packages/api/src/routers/index.ts`

Use **`protectedProcedure`** only (not `ownerProcedure`).

- [ ] **Step 1: status**

```ts
status: protectedProcedure
  .route({ method: "GET", description: "Owner onboarding status" })
  .output(OnboardingStatusOutputSchema)
  .handler(async ({ context }) => {
    const row = await userRepository.findById(context.session.user.id);
    return { onboardingCompletedAt: row?.onboardingCompletedAt ?? null };
  });
```

- [ ] **Step 2: extract (streaming)**

Mirror `agent.router.ts` `detectStacks`:

1. Resolve + authorize object key
2. Download bytes via API confirmed in Task 4 spike (never log full text — PII)
3. MIME/size checks
4. `extractTextFromPdf`
5. Prefetch profile + stacks
6. `agentWorker.fetch` create-run `resume-import-workflow` + stream
7. Yield parsed JSON events

Define `.errors({ INVALID_OBJECT_KEY, UNSUPPORTED_MEDIA, FILE_TOO_LARGE, EXTRACT_FAILED, ... })`.

- [ ] **Step 3: apply**

```ts
.input(OnboardingApplyInputSchema) // includes optional objectKey
.errors({
  EMPTY_DRAFT: { ... },
  APPLY_VALIDATION: { ... },
  APPLY_FAILED: { ... },
  EMAIL_TAKEN: { ... } // mirror profile.router
})
.handler(async ({ input, context }) => {
  // EMPTY_DRAFT + zod already validated
  // applyInTransaction(userId, draft without objectKey)
  // after success: best-effort delete input.objectKey if present
})
```

- [ ] **Step 4: skip + discardSource**

Skip sets timestamp + optional delete. Discard only deletes.

- [ ] **Step 5: Mount**

```ts
import { onboardingRouter } from "#@/routers/onboarding.router";
// appRouter.onboarding = onboardingRouter
```

- [ ] **Step 6: Typecheck API**

```bash
cd packages/api && vp check
```

- [ ] **Step 7: Commit**

```bash
git add packages/api
git commit -m "feat(api): onboarding router extract/apply/skip/discard"
```

---

### Task 7: Web — feature API layer

**Files:**

- Create: `apps/web/src/features/onboarding/api/get-onboarding-status.query.ts`
- Create: `apps/web/src/features/onboarding/api/extract-resume.ts` (stream mutation like detect-stacks)
- Create: `apps/web/src/features/onboarding/api/apply-onboarding.mutation.ts`
- Create: `apps/web/src/features/onboarding/api/skip-onboarding.mutation.ts`
- Create: `apps/web/src/features/onboarding/api/discard-source.mutation.ts`
- Create: `apps/web/src/features/onboarding/index.ts`

- [ ] **Step 1: Copy stream assembly from `features/stacks/api/detect-stacks.ts`**

STEP_LABELS for resume workflow step ids:

```ts
const STEP_LABELS = {
  prepare: "Preparing resume text",
  extract: "Extracting experience and skills",
  normalize: "Normalizing fields",
  format: "Building draft"
};
```

Detect final payload when output matches draft keys (`experiences` / `projects` / `stacks` / `profile`).

- [ ] **Step 2: Apply/skip/status use orpc TanStack wrappers** per `.agents/api-fetching-patterns.md`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/onboarding
git commit -m "feat(web): onboarding feature API hooks"
```

---

### Task 8: Web — onboarding page (upload + analyzing)

**Files:**

- Create: `apps/web/src/pages/dashboard/onboarding/onboarding-page.tsx`
- Create: `apps/web/src/pages/dashboard/onboarding/ui/upload-step.tsx`
- Create: `apps/web/src/pages/dashboard/onboarding/ui/analyzing-step.tsx`
- Create: `apps/web/src/pages/dashboard/onboarding/index.ts`

**UI:** `@coss` / `@tsu-stack/ui` only. **Upload:** `useFiles({ endpoint: "/api/files" })` + **`UploadProgress`** from `@/components/files-sdk/upload-progress`.

- [ ] **Step 1: Upload step (mandatory `resume-sources/` key)**

- Dropzone card; `accept="application/pdf"`; reject non-PDF client-side
- Size check vs `RESUME_SOURCE_MAX_BYTES`
- **Required:** upload so the **client-relative key is exactly** `resume-sources/{uuid}.pdf` (files-sdk custom key / path option — verify in `useFiles` / `files.upload` types).
  - If the SDK cannot set a key: upload then **server-side** `onboarding.promoteSource` is **not** in scope — instead use Files API put with chosen key from a small oRPC that returns a presigned put for that key, **or** call `files.upload` with the documented key option.
  - **Do not** accept a root-filename key for extract; extract will reject non-`resume-sources/` keys by design.
- Show `<UploadProgress files={files} />` whenever `files.uploads.length > 0`
- Store relative `objectKey` + filename in page state (+ optional sessionStorage)
- **Replace / Remove:** call `discardSource` (or client delete if available) for the **previous** key before accepting a new file (spec: delete on replace-upload)
- Primary button **Analyze resume**; **Skip for now** calls skip mutation

- [ ] **Step 2: Analyzing step**

- Call extract stream; show Spinner + step label Progress
- On success → set draft, go Review
- On failure → Alert; keep objectKey for retry

- [ ] **Step 3: Page state machine**

`step: "upload" | "analyzing" | "review" | "done"`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/dashboard/onboarding
git commit -m "feat(web): onboarding upload and analyzing steps with files-sdk progress"
```

---

### Task 9: Web — review + apply + done (coss production UI)

**Files:**

- Create: `apps/web/src/pages/dashboard/onboarding/ui/review-step.tsx`
- Create: `.../review-profile-panel.tsx` (optional split)
- Create: `.../review-list-panel.tsx`
- Create: `.../done-step.tsx`

- [ ] **Step 1: Review layout**

- Tabs: Profile | Experiences | Projects | Stacks
- Each evidence row: Checkbox → `selected`; Switch/Checkbox → `includedInPortfolio` (disabled if !selected)
- Controlled local draft state (editable fields)
- Projects: Select parent experience by `clientId`; multi stack names
- Sticky footer: counts + Apply + re-extract + discard

- [ ] **Step 2: Apply**

- Mutation with full draft + objectKey
- Invalidate experiences/projects/stacks/profile/onboarding status queries
- On success → done step

- [ ] **Step 3: Done**

- Success Alert/Empty + links to `/dashboard/experiences`, projects, stacks

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/dashboard/onboarding
git commit -m "feat(web): onboarding review apply and done steps"
```

---

### Task 10: Web — route, soft CTAs, navigation

**Files:**

- Create: `apps/web/src/routes/(root-layout)/__protected/dashboard/onboarding/index.tsx`
- Modify: dashboard home (or agent hub empty area) for soft banner
- Modify: settings profile page — “Import from resume” button
- Modify: sidebar / command palette if dashboard nav lists pages

- [ ] **Step 1: Route**

```tsx
export const Route = createFileRoute("/(root-layout)/__protected/dashboard/onboarding/")({
  head: () =>
    generateAppSeo({
      /* noindex, title Onboarding */
    }),
  component: OnboardingPage
});
```

Thin route only.

- [ ] **Step 2: Soft CTA (concrete host)**

Primary host: `apps/web/src/pages/dashboard/home/ui/agent-hub-page.tsx` (dashboard `/dashboard` home). If that component is chat-only and awkward, place a thin banner in `apps/web/src/widgets/layout/ui/sidebar.tsx` or dashboard layout wrapper used by `__protected/dashboard` routes — pick **one** visible place, prefer agent-hub page top.

If `onboardingCompletedAt == null`, show Alert/Card with:

- Set up from resume → `/dashboard/onboarding`
- Skip for now → `onboarding.skip`

Do **not** hard-redirect.

- [ ] **Step 3: Settings re-import entry**

Link/button always available: Import from resume → same route.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes apps/web/src/pages/dashboard apps/web/src/widgets
git commit -m "feat(web): onboarding route and soft CTAs"
```

---

### Task 11: Docs — media-storage alignment

**Files:**

- Modify: `.agents/media-storage.md`

- [ ] **Step 1: Replace “does not ship media storage” with reality**

Document:

- `files-sdk` + `files-sdk/s3`
- Env: `S3_*`, `MEDIA_PUBLIC_URL`, `FILES_API_SECRET`
- Gateway `/api/files` with `keyPrefix: {userId}/`
- Generated resumes: `resumes/…` server put
- Session resume sources: `resume-sources/…` under user prefix
- No `media_asset` table yet

- [ ] **Step 2: Commit**

```bash
git add .agents/media-storage.md
git commit -m "docs(agents): record files-sdk S3 upload conventions including resume-sources"
```

---

### Task 12: End-to-end validation

- [ ] **Step 1: Package checks**

```bash
cd packages/core && vp check
cd packages/db && vp check
cd packages/api && vp check
cd apps/agent && vp check
cd apps/web && vp check
```

Or after multi-package work:

```bash
vp run -w fix
```

- [ ] **Step 2: Manual QA checklist**

1. Sign in → soft CTA when `onboardingCompletedAt` null
2. Upload PDF → progress % visible
3. Analyze → draft tabs populated
4. Deselect a row → not created
5. Apply → portfolio entries for included rows; timestamp set; PDF deleted
6. Re-import → stacks merge by name; experiences/projects duplicate
7. Skip → timestamp set, no entities required
8. Generated resume list still works; keys under `resumes/` rejected by extract

- [ ] **Step 3: Final commit if any fixups**

---

## Testing notes

- Prefer unit tests for pure core utils and key auth.
- LLM workflow: fixture text smoke test only if suite already mocks agents; otherwise manual Studio/dev run.
- Do not add brittle e2e unless requested.

## Out of scope (do not implement)

- Durable source table, server draft table, fuzzy job merge, vision PDF, `ownerProcedure`, global PDF-only files gateway, hub chat as primary import UX.

---

## Execution handoff

After this plan is saved and reviewed:

**Plan complete and saved to `docs/superpowers/plans/2026-07-26-owner-onboarding-resume-import.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks

**2. Inline Execution** — execute tasks in this session with checkpoints

**Which approach?**
