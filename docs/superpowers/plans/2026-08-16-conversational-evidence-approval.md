# Conversational evidence + approval File Diff — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **REQUIRED after implementation:** [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) — load the skill, read `LESSONS.md`, run a **fresh** loop (hub Thread **and** floater), include [runtime-hardening.md](../../../.agents/skills/ai-feature-harness/runtime-hardening.md) / checklist **§G**, append lessons, write the report. Do not claim done from unit tests or a screenshot. Natural language only (do not coach product steps).

**Goal:** Human create/edit of project, experience, and stack happens only in hub chat: interview until required goals are filled, then one ApprovalCard whose body is a beUI File Diff; Confirm writes on the client. Hard-stop / prefs use the same card with a proposed-vs-current `search-brief.md` File Diff.

**Architecture:** SoT stays columns. `@tsu-stack/core` owns goals, `evidenceGoalsReady`, generated markdown, search ranking, and HITL Zod. Mastra adds `searchEvidence` (execute, tenant from `requestContext`) and `propose-evidence-change` (client HITL, no `execute`). Web toolkit card calls existing `projects` / `experiences` / `stacks` oRPC (those routers already `invalidateSearchBrief`). Remove inspect Edit and list `+` form doors. Do not mount `ProjectForm` / `ExperienceForm` / `StackForm` from hub.

**Tech Stack:** Mastra `createTool`, `@tsu-stack/core` Zod, oRPC + TanStack Query in `features/agent-hub`, assistant-ui toolkit, beUI `ApprovalCard` + `FileDiff`, existing `renderSearchBriefMarkdown`.

**Spec:** `docs/superpowers/specs/2026-08-16-conversational-evidence-approval-design.md` (Accepted; frozen table is lock).

**Skills:** `mastra` before Mastra API edits; `@assistant-ui` `tools` + `ai-feature-harness` after ship (product + [runtime-hardening.md](../../../.agents/skills/ai-feature-harness/runtime-hardening.md)). Testing policy: seam tests in this plan are requested. After new `@tsu-stack/core` exports: `pnpm --filter @tsu-stack/agent rebuild:core-cache`.

---

## File map

| Area                   | Create / modify                                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core evidence          | Create `packages/core/src/evidence/{goals,format,search,propose,index}.ts` + `__tests__/*.test.ts`; export from `packages/core/src/index.ts`                                        |
| Brief preview vs write | Reuse `renderSearchBriefMarkdown` + `applyHardJobPreferencePatch` + `searchBriefPrefsFromPreference`. Do not persist proposed brief                                                 |
| Agent search           | Create `apps/agent/src/mastra/tools/search-evidence.tool.ts`                                                                                                                        |
| Agent HITL             | Create `apps/agent/src/mastra/tools/propose-evidence-change.tool.ts`                                                                                                                |
| Supervisor             | Modify `apps/agent/src/mastra/agents/hub-supervisor.ts` (tools + everyday-language table + interview rules). Unregister `openEntityFormTool`                                        |
| Policy / processors    | Modify `apps/agent/src/mastra/lib/hub-superpowers-policy.ts` (+ test); `apps/agent/src/mastra/processors/hub-processors.ts` (+ triage/brief tests if names change)                  |
| Web names / resume     | Modify `apps/web/src/features/agent-hub/lib/hub-tool-names.ts`, `should-auto-resume-hub-chat.ts`, `hub-agent-activity.ts` + existing tests                                          |
| Evidence card          | Create `apps/web/src/features/agent-hub/ui/evidence-change-tool-ui.tsx` (and a thin confirm card if the file would exceed ~200 lines)                                               |
| Hard-stop card         | Modify `hard-preference-confirm-card.tsx` to File Diff proposed vs current lists-only brief (chips optional **under** the diff)                                                     |
| Brief question         | Modify `should-auto-resume-hub-chat.ts` + `get-search-brief` path so section questions resume once; identity/rules do not                                                           |
| Toolkit                | Modify `hub-assistant-toolkit.tsx`                                                                                                                                                  |
| List `+`               | Modify `apps/web/src/pages/dashboard/projects/ui/project-page.tsx`, `experiences/experiences-page.tsx`, `stacks/stacks-page.tsx`; extend `hub-assistant-open.ts` with create intent |
| Inspect                | Drop `onEdit` / `PanelEditButton` on project, experience, stack inspect only (applications keep Edit)                                                                               |
| Hub form host          | Stop requesting `EntityFormHost` for new turns. Leftover `open-entity-form` parts: complete cancelled. Do not delete form components (import/onboarding may still use them)         |
| Docs                   | Spec status + plan link. `CONTEXT.md` / search-brief KD 7 already point here — only edit if they still say “form panel”                                                             |

**Do not:** jal-co Diff Viewer; stored `.md` SoT for a row; model-callable `apply-*` / `updateProject`; multi-entity cards; stub row at interview start; `ensureBrief` on the evidence-confirm turn; AgentCore / `agentcore`; import `@tsu-stack/api` from `apps/agent`; import `features/projects` internals from `features/agent-hub`.

---

## Locked implementation notes

1. **Frozen grill table** (spec §3) is not negotiable. Refine file names only.
2. **Confirm writes on the client.** No apply tool. Cancel writes nothing. Create has no `id` until `*.create` returns.
3. **`evidenceGoalsReady` is a hard gate** in the propose tool (`execute` is absent; validate in a shared helper the tool description + web card both use). Card Confirm stays disabled until ready.
4. **One entity per card.** After Confirm, auto-resume so the supervisor can interview the next named entity. After Cancel, auto-resume so it can ask “more on this?”. Pending card: **zero** user-facing text (`shouldStopHubLoopAfterClientHitl` + hide-after-index). Never `listNewJobs` / triage on an evidence or prefs write turn. **Wire this:** add `HubPostEvidenceConfirmProcessor` to `createHubInputProcessors` (there is **no** existing post-hard-stop processor to extend — hard-stop today simply does not auto-resume). The new processor runs when this user turn already has a `propose-evidence-change` or `propose-hard-preference-change` result; it sets `activeTools` via `filterHubPostEvidenceConfirmActiveTools` (drop `listNewJobs`, `proposeNewJobsTriage`, `findJobsNow`). Without the processor, auto-resume re-opens triage.
5. **Hard-stop File Diff is a write preview.** `previous` = `renderSearchBriefMarkdown({ prefs: current })`, `next` = same after `applyHardJobPreferencePatch`. Pass `rebuilt: true` (or call `lineDiff` directly) so the card is **edit** mode (`+`/`−`), not `previewFileLines`. Do not `ensureBrief` for this preview.
6. **get-search-brief:** identity / rules / “show my brief” → File Diff only, **no** auto-resume. Section question (“where is the intro?”) → File Diff + **one** auto-resume + 1–2 spoken sentences. Hide only wrap-up regex (`search brief is current`).
7. **List `+`** opens/focuses hub and sends one user line: `I want to add a new {project|experience|stack}.` No form sheet.
8. **Inspect stays.** Shared chrome already exists; do **not** build `EvidenceInspectShell` unless you are already touching inspect layout. Required: no Edit on project/experience/stack.
9. **Detect / organize / resume import** still persist rows. Out of scope.

---

### Task 1: Core goals + markdown + ready gate

**Files:**

- Create: `packages/core/src/evidence/goals.ts`
- Create: `packages/core/src/evidence/format.ts`
- Create: `packages/core/src/evidence/index.ts`
- Create: `packages/core/src/evidence/__tests__/goals.test.ts`
- Create: `packages/core/src/evidence/__tests__/format.test.ts`
- Modify: `packages/core/src/index.ts` — `export * from "#@/evidence/index";`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";

import { evidenceGoalsReady, formatEvidenceMarkdown, missingRequiredEvidenceGoals } from "../goals";
import { formatEvidenceMarkdown as formatMd } from "../format";

describe("evidenceGoalsReady", () => {
  it("create project missing title is not ready", () => {
    expect(evidenceGoalsReady("project", { summary: "x", year: 2026 })).toBe(false);
    expect(missingRequiredEvidenceGoals("project", { summary: "x", year: 2026 })).toEqual([
      "title"
    ]);
  });

  it("edit project with title + summary + year is ready", () => {
    expect(evidenceGoalsReady("project", { title: "Dev-Hub", summary: "ops", year: 2026 })).toBe(
      true
    );
  });

  it("stack name only is ready", () => {
    expect(evidenceGoalsReady("stack", { name: "React" })).toBe(true);
  });

  it("experience needs title, organization, description", () => {
    expect(evidenceGoalsReady("experience", { title: "FE", organization: "RAYA" })).toBe(false);
    expect(
      evidenceGoalsReady("experience", {
        title: "FE",
        organization: "RAYA",
        description: "Shipped hub"
      })
    ).toBe(true);
  });
});

describe("formatEvidenceMarkdown", () => {
  it("renders a full project view", () => {
    const md = formatMd("project", {
      title: "Dev-Hub",
      year: 2026,
      includedInPortfolio: true,
      summary: "Career inbox",
      description: "Longer"
    });
    expect(md).toContain("# Project: Dev-Hub");
    expect(md).toContain("Year: 2026");
    expect(md).toContain("Portfolio: yes");
    expect(md).toContain("## Summary");
  });
});
```

If `goals.ts` re-exports `formatEvidenceMarkdown`, keep one import path — do not duplicate the function.

- [ ] **Step 2: Run tests — expect FAIL** (modules missing)

```bash
cd packages/core && vp run test:unit -- src/evidence/__tests__/goals.test.ts src/evidence/__tests__/format.test.ts
```

- [ ] **Step 3: Implement**

`goals.ts` — kind union `project | experience | stack`. Each goal: `{ id, column, required, pipelineRole }`. Tables from spec §5.

```ts
export function valuePresent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function evidenceGoalsReady(kind: EvidenceKind, record: Record<string, unknown>): boolean {
  return missingRequiredEvidenceGoals(kind, record).length === 0;
}
```

`format.ts` — generated view only (not stored). Headings:

- Project: `# Project: {title}`, `Year`, `Portfolio: yes|no`, `## Summary`, `## Description`, optional Repos / Demo
- Experience: `# Experience: {title} @ {organization}`, dates / present, description, portfolio
- Stack: `# Stack: {name}`, type, featured / portfolio, description

- [ ] **Step 4: Tests PASS.** `vp check` in `packages/core`.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/evidence packages/core/src/index.ts
git commit -m "feat(core): evidence goals and generated File Diff markdown"
```

---

### Task 2: Propose schema + search ranker

**Files:**

- Create: `packages/core/src/evidence/propose.ts`
- Create: `packages/core/src/evidence/search.ts`
- Create: `packages/core/src/evidence/__tests__/search.test.ts`
- Create: `packages/core/src/evidence/__tests__/propose.test.ts`
- Modify: `packages/core/src/evidence/index.ts`

- [ ] **Step 1: Failing tests** — rank: exact title > prefix > substring; cap 8; empty query → `[]`; one-liner ≤ 120 chars, no full description. Schema: create omits `id`; edit requires `id`; output `{ action: "confirm" | "cancel", kind, id? }`.

- [ ] **Step 2: Implement**

```ts
// propose.ts — Zod
export const EvidenceKindSchema = z.enum(["project", "experience", "stack"]);

export const ProposeEvidenceChangeInputSchema = z.object({
  kind: EvidenceKindSchema,
  id: z.string().min(1).optional(),
  patch: z.record(z.string(), z.unknown()),
  currentMarkdown: z.string(),
  proposedMarkdown: z.string().min(1)
});

export const ProposeEvidenceChangeOutputSchema = z.object({
  action: z.enum(["confirm", "cancel"]),
  kind: EvidenceKindSchema,
  id: z.string().min(1).optional()
});
```

`search.ts`:

```ts
export type EvidenceSearchRow = {
  id: string;
  title: string;
  oneLiner: string;
};

export function rankEvidenceHits(input: {
  query: string;
  rows: EvidenceSearchRow[];
  limit?: number;
}): EvidenceSearchRow[] {
  // lowercase trim; score exact=3, startsWith=2, includes=1; sort score desc then title; slice(0, limit ?? 8)
  // oneLiner: first line, slice(0, 120)
}
```

Experience `title` for ranking must include organization (`Senior Frontend @ RAYA`) so “RAYA” hits. Do not put org only in `oneLiner`.

- [ ] **Step 3: Tests PASS. Commit**

```bash
git commit -m "feat(core): propose-evidence schema and search ranker"
```

---

### Task 3: `searchEvidence` tool

**Files:**

- Create: `apps/agent/src/mastra/tools/search-evidence.tool.ts`
- Modify: `apps/agent/src/mastra/agents/hub-supervisor.ts` (register)
- Test: optional thin `apps/agent/src/mastra/lib/search-evidence-rows.ts` if mapping is easier to unit-test than the tool

- [ ] **Step 1:** Tool `id: "search-evidence"`. Input `{ kind, query }` (`query` min 1). Output `{ hits: [{ id, title, oneLiner }] }`.

- [ ] **Step 2:** `userId` from `requestContext` only. Missing user → `{ hits: [] }`. Load tenant rows:

  - project: `projectRepository.findAllByUserId` → title, oneLiner = summary
  - experience: title + organization, oneLiner = description snippet
  - stack: name, oneLiner = description / type

  Then `rankEvidenceHits`. Never invent ids. Description: “Ranked short hits. Then getProject / getExperience / getStack. Close hits → ask which. Never invent an id.”

- [ ] **Step 3:** Register on hub-supervisor `tools` as `searchEvidence`. Rebuild core cache if the agent process is running.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(agent): searchEvidence tool for hub interview"
```

---

### Task 4: `propose-evidence-change` tool + supervisor interview

**Files:**

- Create: `apps/agent/src/mastra/tools/propose-evidence-change.tool.ts`
- Modify: `hub-supervisor.ts` (register, everyday-language table, instructions)
- Modify: `open-entity-inspect.tool.ts` description — drop “editing requires open-entity-form”
- Modify: `hub-superpowers-policy.ts` + `hub-superpowers-policy.test.ts`
- Modify: `apps/agent/src/mastra/processors/hub-processors.ts` + `hub-processors.triage.test.ts` (new processor, not a comment-only helper)

- [ ] **Step 1:** Tool like `propose-hard-preference-change`: `createTool` with core input/output schemas, **no `execute`**. Description must say: do not call until `evidenceGoalsReady`; after call write **no** user-facing text; after confirm do not `listNewJobs` / triage / `openEntityForm`; one entity per call; omit `id` on create.

- [ ] **Step 2:** Add names to `HUB_CLIENT_HITL_TOOL_NAMES`. Policy tests: new names are HITL; URL-import still cannot call them (same lock as `open-entity-form`).

- [ ] **Step 3:** Supervisor instructions — replace the row:

  `| add a job / project / stack, edit that experience | … openEntityForm |`

  with search / get / interview (say `pipelineRole` in chat, not as a form label) / `proposeEvidenceChange`. After that tool: zero prose until the card returns. After Confirm: if another named entity remains, start its interview. After Cancel: ask more edits on **this** one, then the next. Unregister `openEntityFormTool`. Grep the supervisor file for leftover `openEntityForm` / “opens the form” bullets and delete them.

- [ ] **Step 4:** Add `filterHubPostEvidenceConfirmActiveTools(toolNames)` in policy (unit-test: those three names gone; search/get/propose-evidence remain). Add `messagesHaveEvidenceOrHardStopResultThisTurn` scoped to the **latest user turn** (`latestUserTurn*` helpers, not the whole thread) + `HubPostEvidenceConfirmProcessor` that returns `{ activeTools }` when that is true and no client HITL is still pending. Register it in `createHubInputProcessors` **before** `HubEnsureFinalResponseProcessor` (alongside `HubPostTriageConfirmProcessor`). Test the processor the same way `HubPostTriageConfirmProcessor` is tested.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(agent): propose-evidence-change HITL and drop form tool"
```

---

### Task 5: Web names, hide-after, lastHubHitlKind

**Files:**

- Modify: `apps/web/src/features/agent-hub/lib/hub-tool-names.ts`
- Modify: `apps/web/src/features/agent-hub/lib/hub-tool-names.test.ts` / `hub-superpowers-tools.test.ts`
- Modify: `apps/web/src/features/agent-hub/lib/should-auto-resume-hub-chat.ts` + test
- Modify: `apps/web/src/features/agent-hub/lib/hub-agent-activity.ts` + test

- [ ] **Step 1: Tests first**

  - `isProposeEvidenceChangeToolName` kebab + camel
  - parse input/output via core schemas
  - `lastHubHitlKind` → `"client"` while **any** evidence card is still waiting (explicit branch, not set membership). After Confirm the supervisor may propose **the next entity on the same user turn** — that second card must lock and render. Do **not** add `isLaterEvidenceAfterConfirm` as a hard-stop clone; that helper would hide/cancel the RAYA card after Dev-Hub Confirm. Parallel cards on the **same** entity: `cancelSiblingCards` only
  - `hideHubAssistantTextAfterIndex`: hide text while **pending**; after confirm/cancel **do not** hide later interview prose (hard-stop stays hide-after-complete — special-case evidence so it is not lumped in with hard-stop)
  - `should-auto-resume`: pending → false; confirm or cancel → **true** (special-case: generic `action: confirm|cancel` is terminal today and would skip the next interview). Do not resume while wrap-up text is still streaming. Server `activeTools` owns “no triage”

- [ ] **Step 2: Implement parsers + `HUB_PROPOSE_EVIDENCE_CHANGE_TOOL_NAMES`.** Add to `HUB_CLIENT_RESUME_TOOL_NAMES`. Add to `isHubChoiceToolName` so the ApprovalCard is not also a compact working-strip row.

- [ ] **Step 3: Web unit tests PASS.**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): hub tool names for propose-evidence-change"
```

---

### Task 6: Evidence ApprovalCard + client write

**Files:**

- Create: `apps/web/src/features/agent-hub/ui/evidence-change-tool-ui.tsx`
- Modify: `apps/web/src/features/agent-hub/ui/hub-assistant-toolkit.tsx`
- Modify: `apps/web/src/features/agent-hub/index.ts` only if you export parsers
- Reuse: `ApprovalCard`, `FileDiff` + `lineDiff` (always **edit** mode for this card)

- [ ] **Step 1:** Toolkit entry for kebab + camel, same pattern as `HardPreferenceChangeToolUI`.

- [ ] **Step 2:** Card

  - Title: `Confirm project change` / `Confirm new project` / experience / stack (create vs edit from `id`)
  - Body: `<FileDiff file="{kind}.md" lines={lineDiff(currentMarkdown, proposedMarkdown)} defaultOpen collapseOnComplete={false} maxHeight={420} />`
  - Footer: Confirm / Cancel. Confirm loading. No hover flip. `data-hitl-kind="confirm"`
  - **Load current row** when `id` is set (`orpcQueryClient.projects.get` / experiences / stacks — same idea as hard-stop loading prefs). Merge `record = { ...currentRow, ...patch }` for the ready gate. **Never** call `evidenceGoalsReady(kind, patch)` alone — a title-only edit would stay false
  - Confirm disabled when `!evidenceGoalsReady(kind, record)` or markdown empty

- [ ] **Step 3:** Confirm handler (client) — map onto **real** oRPC shapes, not raw `patch`

  - Update: `orpcClient.projects.update({ id, data })` (and experiences/stacks). Not `update(patch)`.
  - `UpdateExperienceInputSchema` **requires** `description` on every update — send `record.description` (merged), not only the delta.
  - Create is a **flat** body: `orpcClient.projects.create(input)` (not `{ id, data }`). `CreateProjectInputSchema` requires `title`, `year`, `summary`, **`description`** (string). Spec marks description optional — send `""` when missing. Same for experience create (`description` required by schema).
  - Create stack: required `name` from patch; optionals once.
  - After success: `invalidateProjectsListQueries` / `invalidateExperiencesListQueries` / `invalidateStacksListQueries` in `apps/web/src/shared/lib/` — do not invent query keys. Routers already `invalidateSearchBrief` — **do not** call `ensureBrief`.
  - Dates: `fromDate` / `toDate` must be `YYYY-MM-DD` or omitted (`ExperienceDateStringSchema`). Drop invalid LLM dates instead of failing Confirm.
  - `addResult` + `addToolOutput({ action: "confirm", kind, id })` (`id` from create response when new).
  - Cancel siblings on this turn (copy hard-stop `cancelSiblingCards`)

- [ ] **Step 4:** Cancel → `{ action: "cancel", kind, id? }` only.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): evidence File Diff approval card writes on confirm"
```

---

### Task 7: Hard-stop card = proposed vs current brief File Diff

**Files:**

- Modify: `apps/web/src/features/agent-hub/ui/hard-preference-confirm-card.tsx`
- Modify: `apps/web/src/features/agent-hub/ui/hard-preference-change-tool-ui.tsx` only if it still injects a preview-only brief
- Test: `packages/core` already has `applyHardJobPreferencePatch`; add a web or core test that lists-only markdown **changes** when `levelFloor` / salary / exclude changes

- [ ] **Step 1:** In the confirm card, with current prefs loaded:

```ts
const currentMd = renderSearchBriefMarkdown({
  prefs: searchBriefPrefsFromPreference(current)
});
const nextPrefs = applyHardJobPreferencePatch(
  {
    excludeKeywords: current.excludeKeywords,
    salaryMin: current.salaryMin ?? null,
    salaryCurrency: current.salaryCurrency ?? null,
    levelFloor: current.levelFloor ?? null
  },
  patch
);
const proposedMd = renderSearchBriefMarkdown({
  prefs: { ...searchBriefPrefsFromPreference(current), ...nextPrefs }
});
```

Render `SearchBriefFileDiff` / `FileDiff` with `previousMarkdown={currentMd}`, `markdown={proposedMd}`, `rebuilt` true (or `lineDiff` directly). Chips **under** the diff only, never instead of `+`/`−`.

- [ ] **Step 2:** Confirm still upserts via existing mutation. No `ensureBrief` before or after persist. The pending-card File Diff **is** the write preview; collapse to a receipt after Confirm. Remove the post-confirm `ensureBrief()` + second `SearchBriefFileDiff` in `hard-preference-change-tool-ui.tsx` if it is still there (that is the stacked “preview dump after save”).

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(web): hard-stop confirm shows proposed vs current brief diff"
```

---

### Task 8: get-search-brief — question resume vs identity preview

**Files:**

- Create or extend: `apps/web/src/features/agent-hub/lib/search-brief-follow-up.ts` + test
- Modify: `should-auto-resume-hub-chat.ts` + test
- Agent: `HUB_SEARCH_BRIEF_MUST_ANSWER_FEEDBACK` already exists — keep it; only fire when the user turn needs a spoken answer

- [ ] **Step 1: Tests**

  - `searchBriefUserTurnNeedsSpokenAnswer("where is the intro?")` → true
  - `"what happened to the who paragraph?"` → true
  - `"what am I looking for?"` / `"show my brief"` / `"what are my job rules?"` → false
  - Auto-resume after get-search-brief complete: true only when helper is true and there is no final text yet
  - Identity turns do not resume (File Diff is enough; no empty 3s turn)

- [ ] **Step 2: Implement helper** (interrogative about a section / what changed / where did X go). Identity/rules phrases from the supervisor table stay preview-only.

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(web): resume once after search-brief section questions"
```

---

### Task 9: Remove form doors (inspect Edit + list `+`)

**Files:**

- Modify: `apps/web/src/pages/dashboard/projects/ui/project-page.tsx`, `experiences/experiences-page.tsx`, `stacks/stacks-page.tsx`
- Modify: **`apps/web/src/pages/dashboard/_lib/entity-inspect-host.tsx`** (hub `open-entity-inspect` still calls `requestEntityForm` from `openEdit` — list-page-only edits leave the spoken inspect door open)
- Modify: `apps/web/src/features/agent-hub/lib/hub-assistant-open.ts` (+ test)
- Modify: hub send in `HubChatProvider` (it already owns `sendMessage`) — once after history ready; clear `pendingCreateKind` only
- Modify: `open-entity-form-tool-ui.tsx` — leftover history: `addToolOutput` cancelled; do not `requestEntityForm`
- Do **not** delete `ProjectForm` / import onboarding forms

- [ ] **Step 1:** Extend open-hub store:

```ts
export type HubCreateIntent = "project" | "experience" | "stack";

export function requestHubCreateInterview(kind: HubCreateIntent) {
  requestOpenHubAssistant();
  pendingCreateKind = kind;
}
```

`HubChatProvider`: when `pendingCreateKind` is set and history is ready (`ensureHistory` if the floater Thread has not mounted — same as `import-jd-sheet.tsx`), `sendMessage` **once**: `I want to add a new project.` / experience / stack. Then clear **only** `pendingCreateKind`. **Do not** call `consumeOpenHubAssistant()` here. `HubAssistantModal` stays visible via `visible = open || pendingOpen` until `onOpenChange(false)` consumes the open flag (JD-save path). Consuming open on the same tick as `requestHubCreateInterview` closes the floater on `/dashboard/projects|experiences|stacks` before the user sees the turn. Send from the provider only — not also from the home Thread.

- [ ] **Step 2:** Replace `onAdd: () => openDialog(null)` with `requestHubCreateInterview("project")` (and experience/stack). Empty-state `+` too.

- [ ] **Step 3:** Remove `onEdit` / `openEdit` from project / experience / stack inspect on **list pages and** `entity-inspect-host.tsx` (`PanelEditButton` gone; delete `openEdit` that calls `requestEntityForm`). Application inspect Edit **stays**.

- [ ] **Step 4:** Menu item “Edit” on project/experience/stack rows: either remove or route to the same hub interview (`I want to edit {title}`) — do **not** open the form. Prefer remove Edit; spoken start is the spec default.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): list plus and inspect no longer open entity forms"
```

---

### Task 10: Docs pointers

**Files:**

- Modify: `docs/superpowers/specs/2026-08-16-conversational-evidence-approval-design.md` — Status: Implementation plan written; link this file
- Grep `CONTEXT.md` and `2026-08-16-search-brief-hub-operator-design.md` for leftover “entity form panel” / KD 7 form language; fix only stale lines

- [ ] **Step 1:** Status + plan link. No product-lock edits.

- [ ] **Step 2: Commit**

```bash
git commit -m "docs: link conversational evidence implementation plan"
```

---

### Task 11: App + AI feature hardening (required — not optional)

**Files:** none new unless the loop finds a root-cause fix. Follow [SKILL.md](../../../.agents/skills/ai-feature-harness/SKILL.md) end to end.

- [ ] **Step 1: Load memory**

  Read `LESSONS.md` (newest first). Read this plan + the spec. Load `runtime-hardening.md`.

- [ ] **Step 2: Contract** (put this in the report)

  | Item                 | Content                                                                                                                                                                           |
  | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | User-visible success | Spoken create/edit → interview → File Diff ApprovalCard → Confirm persists; Cancel does not. Hard-stop shows `+`/`−` vs current brief. Inspect has no Edit. List `+` starts chat. |
  | Entry paths          | Hub home Thread; hub floater; list `+` on projects / experiences / stacks; inspect (view only); hard-stop / “what am I looking for?” / “where is the intro?”                      |
  | Shared state         | project / experience / stack rows; `job_preference` columns; invalidated search brief (no stacked brief File Diff on evidence confirm)                                            |
  | Non-goals            | jal-co; detect/organize/import rewrite; applications CRM interview                                                                                                                |

- [ ] **Step 3: Loops**

  1. Package unit tests already added (`packages/core` evidence + web resume helpers).
  2. Authenticated oRPC: create does not insert until Confirm (no stub); Cancel leaves counts unchanged; update Cancel leaves row.
  3. Browser: everyday language only — e.g. “edit Dev-Hub”, “add a job at RAYA”, “make it senior”, “what am I looking for?”, “where is the intro?”. Exercise **home Thread and floater**.
  4. Read traces yourself (Studio / `:4111` / evlog). Do not ask the user to paste logs.
  5. Runtime §G: unauthenticated `POST :4111/chat/hub-supervisor` → 401/403; no provider keys in agent env; `memory: { thread, resource }`; no tokens in lessons.

- [ ] **Step 4: Matrix** (spec §11 + checklists C, D, F, G)

  - [ ] Create: no row until Confirm; empty required goals block the card
  - [ ] Edit Cancel leaves the row
  - [ ] File Diff edit mode has reachable `+`/`−` (wrap + scroll)
  - [ ] Hard-stop level/salary/exclude shows `+`/`−`, not preview-only / chips-only
  - [ ] Identity brief is preview (no `+`/`−` required); section question gets 1–2 sentences (not an empty turn)
  - [ ] Multi-entity: Confirm then second interview; Cancel then “more on this?”
  - [ ] Confirm does not open New jobs triage
  - [ ] Inspect: no Edit; `open-entity-inspect` still previews
  - [ ] List `+` does not mount a form
  - [ ] Floater and home share the same write
  - [ ] Logged-out / missing BYO fail closed as designed

- [ ] **Step 5:** Fix root causes. Re-run the **same** failing loop. Prefer core guards over one-off UI.

- [ ] **Step 6:** Prepend `LESSONS.md`. Hardening report in the session (include `Runtime checks: skip | pass | gaps`).

- [ ] **Step 7: Commit** only if the loop produced code or lesson fixes

```bash
git add .agents/skills/ai-feature-harness/LESSONS.md
git commit -m "docs(hardening): conversational evidence approval loop"
```

**No completion language** without commands/UI steps and outcomes from **this** session.

---

## Out of scope (do not sneak in)

- Conversational CRM / application interview
- Moving inspect bodies into `packages/ui`
- Question-stepper / radios on ApprovalCard
- AWS AgentCore skills or `agentcore`
- Replacing detect / organize / resume import
