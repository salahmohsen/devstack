# Match skill canonicalize — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inspect Match chips and `%` only count allowlisted tools; role phrases drop; same-skill tokens get `stackId`; Create skill from “I have it” stays in this panel and returns to the same job.

**Architecture:** One core canonicalize helper is the law. Land and leftover persist run it before write. Inspect runs it on read so old rows fix without a migration. `resolveJobSkillTags` sets `stackId` with the same unique-hit rule as the alias picker. Take prompt receives the classified chips and must not recompute them. Dashboard Create skill pushes `StackForm` on the existing inspect chrome.

**Tech Stack:** `@tsu-stack/core` (pure), land in `packages/api`, inspect + `StackForm` in `apps/web`. No new RPC. No migration.

**Spec:** `docs/superpowers/specs/2026-08-23-match-skill-canonicalize-design.md`

**Branch:** `feat/hub-job-context` only.

**Conventions:**

1. End-to-end: core → api/agent persist → take prompt → web inspect/panel. UI: **better-ui** + **impeccable** + **coss** + `.agents/ui.md`.
2. Tests only where this plan lists them (spec §8). No e2e. After implement: ai-feature-harness on inspect Match + regenerate take.
3. After each task: `vp check` in touched packages. Conventional commits, subject ≤72 chars, body lines ≤100.
4. Do not change `application.matchScore` or years cap. Do not PATCH listing skills from Create skill. Do not call `requestHubCreateSkillFromInspect` from dashboard inspect.
5. Repo test policy: do not add suites beyond the files named here.

---

## File map

| Path                                                                        | Role                                                                                                                                                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/application/job-skills.ts`                               | `EXTRA_JD_TOOL_SKILLS`, `canonicalizeListingSkillToken`, `canonicalizeListingSkillNames`; `resolveJobSkillTags` + `sanitizeLinkedJobSkills` drop misses and unique-link `stackId` |
| `packages/core/src/application/__tests__/job-skills.test.ts`                | Canonicalize + resolve + sanitize matrix                                                                                                                                          |
| `packages/core/src/job-discovery/__tests__/skill-match.test.ts`             | Phrase no longer in `missing[]`; `%` uses checkable input                                                                                                                         |
| `packages/api/src/lib/job-discovery/inbox-ai.ts`                            | Pass stack **aliases** into `resolveJobSkillTags`; pass classified chips into take                                                                                                |
| `packages/api/src/lib/application/generate-agent-take.ts`                   | Take prompt includes Have/Close/Missing/`percent`                                                                                                                                 |
| `apps/agent/src/mastra/agents/job-agent-take-agent.ts`                      | Same take rules                                                                                                                                                                   |
| `apps/agent/src/mastra/lib/link-job-skills.ts`                              | Pass aliases; persist path already sanitizes                                                                                                                                      |
| `apps/web/src/shared/ui/job-card-marks.tsx`                                 | `listingSkillNames` canonicalize on read                                                                                                                                          |
| `apps/web/src/pages/dashboard/tracked-jobs/ui/inspect-job-skills-match.tsx` | Create skill; stop hub interview                                                                                                                                                  |
| `apps/web/src/pages/dashboard/_lib/side-panel-stack.ts`                     | Tiny push/pop                                                                                                                                                                     |
| `apps/web/src/pages/dashboard/stacks/ui/stack-form.tsx`                     | Create seed `name` (+ alias if saved name differs)                                                                                                                                |

---

### Task 1: Core canonicalize allowlist

**Files:**

- Modify: `packages/core/src/application/job-skills.ts`
- Test: `packages/core/src/application/__tests__/job-skills.test.ts`
- Test: `packages/core/src/job-discovery/__tests__/skill-match.test.ts`

- [ ] **Step 1:** Export frozen extra tools and canonicalize helpers from `job-skills.ts` (same file as `CANONICAL_SKILL_ALIASES` / `extractSkillMentions`).

```ts
export const EXTRA_JD_TOOL_SKILLS = [
  "AWS",
  "GCP",
  "Azure",
  "HTTP",
  "REST",
  "GraphQL",
  "Docker",
  "Kubernetes",
  "Postman",
  "Git",
  "GitHub",
  "GitLab",
  "CI/CD",
  "Linux",
  "SQL"
] as const;

export function canonicalizeListingSkillToken(
  token: string,
  held: readonly { name: string; aliases?: readonly string[] }[] = []
): { keep: true; display: string } | { keep: false };

export function canonicalizeListingSkillNames(
  tokens: readonly string[],
  held: readonly { name: string; aliases?: readonly string[] }[] = []
): string[];
```

Hit if `normalizeJobSkillName(token)` equals a held name/alias, `parseCanonicalStackNames()` entry, `CANONICAL_SKILL_ALIASES` canonical or extra, `WEB_FUNDAMENTAL_SKILL_NAMES`, or `EXTRA_JD_TOOL_SKILLS`. Longest surface wins (same sort as `buildJobSkillMentionPatterns`). Display is the table/held spelling when known, else trimmed listing spelling (max 80). Miss → `{ keep: false }` (duty backup is redundant once miss drops everything; still implement the spec regexes so a future allowlist hit cannot be eaten — **allowlist wins first**).

`canonicalizeListingSkillNames`: keepers only, dedupe by normalized display, first-seen order.

- [ ] **Step 2:** Add tests in `job-skills.test.ts`:

```ts
describe("canonicalizeListingSkillToken", () => {
  it("keeps React.js as React via canonical aliases", () => {
    expect(canonicalizeListingSkillToken("React.js")).toEqual({ keep: true, display: "React" });
  });
  it("keeps Tailwind CSS and Postman and HTTP and CI/CD", () => {
    expect(canonicalizeListingSkillToken("Tailwind CSS").keep).toBe(true);
    expect(canonicalizeListingSkillToken("postman")).toEqual({ keep: true, display: "Postman" });
    expect(canonicalizeListingSkillToken("HTTP")).toEqual({ keep: true, display: "HTTP" });
    expect(canonicalizeListingSkillToken("CI/CD").keep).toBe(true);
  });
  it("keeps a held accessibility alias", () => {
    expect(
      canonicalizeListingSkillToken("a11y", [{ name: "Accessibility", aliases: ["a11y"] }])
    ).toEqual({ keep: true, display: "Accessibility" });
  });
  it("drops role and duty phrases", () => {
    for (const token of [
      "frontend development",
      "ui/ux design",
      "responsive ui",
      "accessibility",
      "api building and testing",
      "strong communication skills",
      "cobol"
    ]) {
      expect(canonicalizeListingSkillToken(token)).toEqual({ keep: false });
    }
  });
});

describe("canonicalizeListingSkillNames", () => {
  it("drops phrases and does not count them in the remaining list", () => {
    expect(
      canonicalizeListingSkillNames(
        [
          "react",
          "javascript",
          "typescript",
          "frontend development",
          "ui/ux design",
          "postman",
          "http"
        ],
        [{ name: "React" }, { name: "JavaScript" }, { name: "TypeScript" }]
      )
    ).toEqual(["React", "JavaScript", "TypeScript", "Postman", "HTTP"]);
  });
});
```

- [ ] **Step 3:** Run `vp run --filter @tsu-stack/core test:unit`. Expected: FAIL (exports missing).

- [ ] **Step 4:** Implement until those tests pass. Export from `packages/core/src/application/job-skills.ts` (already re-exported via `application/index.ts`).

- [ ] **Step 5:** In `skill-match.test.ts`, replace `leaves capability phrases in Missing` with:

```ts
it("does not see dropped phrases when the caller canonicalizes first", () => {
  const jobSkills = canonicalizeListingSkillNames(
    ["React", "frontend development"],
    [{ name: "React" }]
  );
  const result = classifyJobSkills({ jobSkills, held: [{ name: "React" }] });
  expect(jobSkills).toEqual(["React"]);
  expect(result.missing).toEqual([]);
  expect(result.percent).toBe(100);
});

it("percent is Have over checkable tokens only", () => {
  const jobSkills = canonicalizeListingSkillNames(
    [
      "React",
      "TypeScript",
      "JavaScript",
      "frontend development",
      "ui/ux design",
      "Postman",
      "HTTP"
    ],
    [{ name: "React" }, { name: "TypeScript" }, { name: "JavaScript" }]
  );
  const result = classifyJobSkills({
    jobSkills,
    held: [{ name: "React" }, { name: "TypeScript" }, { name: "JavaScript" }]
  });
  expect(result.have).toHaveLength(3);
  expect(result.missing).toEqual(["Postman", "HTTP"]);
  expect(result.percent).toBe(60);
});
```

Classifier tests that pass `Go` / `Java` as job skills stay: they test the classifier, not ingest. Callers that persist/inspect must canonicalize first.

- [ ] **Step 6:** `vp check` in `packages/core`. Commit `feat(core): canonicalize listing skill tokens for match chips`

---

### Task 2: Unique stackId link + drop on persist helpers

**Files:**

- Modify: `packages/core/src/application/job-skills.ts` — `resolveJobSkillTags`, `sanitizeLinkedJobSkills`
- Test: `packages/core/src/application/__tests__/job-skills.test.ts`

- [ ] **Step 1:** Extend stack rows to `{ id, name, aliases?: readonly string[] }`.

Do **not** import `preselectHeldSkillForAlias` from `skill-match.ts` (`skill-match` already imports `job-skills` — cycle). **Move** `preselectHeldSkillForAlias` **and** `collectSurfaceKeys` into `job-skills.ts`. `classifyJobSkills` in `skill-match.ts` imports `collectSurfaceKeys` from `job-skills`. Export `preselectHeldSkillForAlias` **once** from `job-skills.ts` only (`packages/core/src/index.ts` already `export *` from both `application` and `job-discovery` — a re-export duplicates the name). Point `skill-match.test.ts` at `@tsu-stack/core` / `job-skills` for preselect tests.

`resolveJobSkillTags`:

1. Canonicalize each name (held = stacks). Drop `{ keep: false }`.
2. Use canonical `display` as `name`.
3. `stackId` = `preselectHeldSkillForAlias(display, stacksWithId)` (unique exact name / alias / canonical table). Collision or none → `null`.
4. Still never creates stacks. Still never appends aliases.

`sanitizeLinkedJobSkills`: parse → drop misses via canonicalize → unique-link **only when `stackId` is null**. Do not remap a trusted in-catalog LLM `stackId`. Invented names with unknown ids drop unless the name hits extra/canonical.

- [ ] **Step 2:** Rewrite **existing** `resolveJobSkillTags` tests in the same file. They contradict the spec today:

- `Katalon` unmatched: **drop** the row (empty array), do not keep `{ stackId: null }`.
- `REACT` vs stacks named `React` and `react`: **collision → `stackId: null`** (or drop if you also canonicalize to one display and two ids still collide). Do **not** keep “first stack wins.”
- Trim/case match test: `"  Type   Script  "` is **not** `TypeScript` after `normalizeJobSkillName` (spaces stay as one space: `type script`). Keep it only as a unique **held-name** match (`name: "Type Script"`) or change the fixture. Do not expect it to unique-link to TypeScript.

Add:

```ts
it("drops role phrases and unique-links React.js to held React", () => {
  expect(
    resolveJobSkillTags(
      [
        { name: "React.js", band: "required" },
        { name: "frontend development", band: "required" }
      ],
      [{ id: "stack-react", name: "React", aliases: [] }]
    )
  ).toEqual([{ name: "React", stackId: "stack-react", band: "required" }]);
});

it("does not link Java to JavaScript", () => {
  expect(
    resolveJobSkillTags(
      [{ name: "Java", band: "required" }],
      [{ id: "js", name: "JavaScript", aliases: [] }]
    )
  ).toEqual([]);
});

it("does not append aliases", () => {
  const stacks = [{ id: "react", name: "React", aliases: [] as string[] }];
  resolveJobSkillTags([{ name: "React.js", band: "required" }], stacks);
  expect(stacks[0]?.aliases).toEqual([]);
});
```

Update `sanitizeLinkedJobSkills` “Invented” case: invented name with unknown id is dropped unless it hits extra/canonical list. Same file also keeps `shadcn/ui` / `Figma` today — those drop unless allowlisted. `React Query` may display as `TanStack Query` while a trusted `stack-tq` id is kept.

- [ ] **Step 3:** `vp run --filter @tsu-stack/core test:unit` then `vp check` `packages/core`. Commit `feat(core): link unique listing skills to catalog stack ids`

---

### Task 3: Land, leftover persist, hub/agent link pass aliases

**Files:**

- Modify: `packages/api/src/lib/job-discovery/inbox-ai.ts` — `resolveSkillsForUser` map `aliases`
- Modify: `packages/api/src/lib/application/link-job-skills.ts` — stacks include aliases
- Modify: `apps/agent/src/mastra/lib/link-job-skills.ts` — same
- Modify: `packages/api/src/lib/application/refresh-from-listing-url.ts` if it builds tags without `resolveJobSkillTags`

`mergeLeftoverExtract` stays a raw merge. Filtering happens in `resolveJobSkillTags` on persist. Do not rewrite leftover merge tests unless they assert persisted tags.

- [ ] **Step 1:** `stackRepository.findAllByUserId` already returns aliases. Pass `{ id, name, aliases: stack.aliases ?? [] }` into `resolveJobSkillTags` / `sanitizeLinkedJobSkills`.
- [ ] **Step 2:** Grep persist call sites (`resolveJobSkillTags`, `sanitizeLinkedJobSkills`, `skillsFromLinkedPayload`) and pass aliases everywhere. Update `packages/api/src/lib/application/__tests__/link-job-skills.test.ts` if canonicalize rewrites `React Query` → `TanStack Query` (unless the stack row is named `React Query`).
- [ ] **Step 3:** `vp check` `packages/api` `apps/agent`. Commit `feat(jobs): persist only checkable listing skills`

---

### Task 4: Inspect canonicalize on read

**Files:**

- Modify: `apps/web/src/shared/ui/job-card-marks.tsx` — `listingSkillNames(required, preferred, held?)`
- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/application-info-panel.tsx` — pass `heldSkills`

```ts
export function listingSkillNames(
  required: readonly JobSkillTag[] | undefined,
  preferred: readonly JobSkillTag[] | undefined,
  held: readonly HeldSkill[] = []
): string[] {
  const raw = [...(required ?? []), ...(preferred ?? [])]
    .map((skill) => skill.name.trim())
    .filter(Boolean);
  return canonicalizeListingSkillNames(raw, held);
}
```

Old rows with `frontend development` in JSON fix on inspect without a migration.

- [ ] **Step 1:** Wire the extra arg. `application-info-panel` already has `heldSkills` before `jobSkills` — reorder so held is computed first.
- [ ] **Step 2:** `vp check` `apps/web`. Commit `feat(web): hide unverifiable phrases on inspect match chips`

---

### Task 5: Ground take in classified chips

**Files:**

- Modify: `packages/api/src/lib/application/generate-agent-take.ts` — `AgentTakeJobInput` + `buildPrompt`
- Modify: `apps/agent/src/mastra/agents/job-agent-take-agent.ts`
- Modify: `packages/api/src/lib/job-discovery/inbox-ai.ts` — `takeOnceForKeeper` / land call
- Modify: `packages/api/src/lib/application/generate-agent-take.ts` `generateAgentTake` (regenerate from stored row)

```ts
skillsMatch?: {
  have: string[];
  close: { name: string; via: string }[];
  missing: string[];
  percent: number | null;
} | null;
```

Prompt additions (plain voice):

```
- Skills chips (deterministic; do not recompute or invent tools):
${JSON.stringify(job.skillsMatch ?? null)}
- Do not list dropped role phrases as missing skills.
- You may mention the role (e.g. frontend) only if Have chips support it.
```

Same bullets on `job-agent-take-agent` instructions.

On land: after `resolveSkillsForUser`, `classifyJobSkills({ jobSkills: names, held: stack rows with aliases })` and pass `skillsMatch`. **Do not** use `loadSeekerMatchEvidence` for chips (those stack names have no aliases). Have `resolveSkillsForUser` return `{ requiredSkills, preferredSkills, held }` from `stackRepository.findAllByUserId` so take and persist share one fetch.

On regenerate: classify from application skill **names** (canonicalize first) + the same stack rows `{ id, name, aliases }`.

Do not feed `matchScore` into chip `%`. Do not change years cap.

- [ ] **Step 1:** Extend input + prompt + agent instructions.
- [ ] **Step 2:** Wire land + regenerate.
- [ ] **Step 3:** `vp check` `packages/api` `apps/agent`. Commit `feat(jobs): ground agent take in match chips`

---

### Task 6: Panel stack + Create skill from “I have it”

**Files:**

- Create: `apps/web/src/pages/dashboard/_lib/side-panel-stack.ts`
- Modify: `apps/web/src/pages/dashboard/stacks/ui/stack-form.tsx`
- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/inspect-job-skills-match.tsx`
- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/application-info-panel.tsx` — pass `applicationId={item.id}`
- Modify: `apps/web/src/pages/dashboard/tracked-jobs/tracked-jobs-page.tsx` and `apps/web/src/pages/dashboard/new-jobs/new-jobs-page.tsx`
- Modify: `apps/web/src/features/agent-hub/lib/hub-assistant-open.ts` — keep `requestHubCreateSkillFromInspect` for hub; **stop importing it** from inspect

**Stack module** (no router):

```ts
export type JobInspectFrame = { type: "job-inspect"; applicationId: string };
export type StackCreateFrame = {
  type: "stack-create";
  name: string;
  returnTo: JobInspectFrame;
};
export type SidePanelFrame = JobInspectFrame | StackCreateFrame;

export function pushSidePanelFrame(frame: SidePanelFrame): void;
export function popSidePanelFrame(): SidePanelFrame | null;
export function peekSidePanelFrame(): SidePanelFrame | null;
export function subscribeSidePanelStack(listener: () => void): () => void;
```

v1: only `job-inspect` ↔ `stack-create`. Escape on the form pops one frame (existing dirty dialog). Closing inspect while the form is up pops the form first.

**StackForm:** add optional `createSeed?: { name: string }` for create mode (`initialData` stays edit). Seed `defaultValues.name` from `createSeed?.name`. **The create-mode `form.reset({ name: "" })` in `stack-form.tsx` (~181–193) runs when `open && !isEdit` and will wipe the seed.** Change that reset to `name: createSeed?.name ?? ""`. Depend on `createSeed?.name` (string), **not** a new `{ name }` object each render (that resets and wipes typing).

On create submit, if `normalizeJobSkillName(createSeed.name) !== normalizeJobSkillName(value.name)` and seed is not already in aliases, append seed to `aliases`.

**Inspect `handleHaveIt`:**

- Close: toast (unchanged).
- Missing + catalog: open alias picker. `PromptDialog` has **no footer slot** — put a **Create skill** control in the **dialog body** (text button under the combobox). It **must** be `type="button"` (PromptDialog wraps children in `<Form>`; a default submit would fire “Add alias” when preselect filled `skillId`). Do not call the alias `onSubmit`. Clicking it `pushSidePanelFrame({ type: "stack-create", name: token, returnTo: { type: "job-inspect", applicationId } })` and closes the picker.
- Missing + empty catalog: push Create skill directly. **Do not** `requestHubCreateSkillFromInspect`.

Pass `applicationId` into `InspectJobSkillsMatch`.

**Pop once:** `StackForm` already calls `onSaved` then `onOpenChange(false)`. Pop **only** in `onOpenChange(false)` (same as `EntityFormHost`: save = invalidate, close = pop). Do not pop in both.

**Host (subscribe or StackForm never mounts):** `InspectJobSkillsMatch` pushes `stack-create` then closes the picker (child state). Pages must re-render.

Implement `side-panel-stack.ts` like `createExternalStore` / `entity-form-host-store.ts`. Pages:

```ts
const frame = useSyncExternalStore(subscribeSidePanelStack, peekSidePanelFrame, peekSidePanelFrame);
```

- `ItemsInspectHost open={isAnyOpen && frame?.type !== "stack-create" && …}` — putting `StackForm` **inside** inspect cannot work; the host unmounts.
- Render `StackForm` **beside** inspect on `tracked-jobs-page.tsx` **and** `new-jobs-page.tsx`.
- `createSeed={{ name: frame.type === "stack-create" ? frame.name : "" }}` is fine if the reset effect keys on `createSeed?.name`.
- `onSaved` = invalidate only. `onOpenChange(false)` = `popSidePanelFrame()`.
- `hostOwnsPanel` still wins over inspect.
- Chevron `dismissDashboardSidePanel` currently clears `viewItem` via `subscribeSidePanelClose` in `tracked-jobs/_lib/application.slice.ts` and `new-jobs-page.tsx`. `side-panel.tsx` `close()` always dismisses. **Guard those listeners** (or intercept `close()`): while `frame.type === "stack-create"`, pop the form only; do not clear the job. Do not copy `entity-form-host-store`’s “null the request on dismiss.” `EntityFormSheet` already handles Escape.

Do not `navigate` to `/dashboard/skills`.

- [ ] **Step 1:** Stack module + StackForm seed.
- [ ] **Step 2:** Inspect Create skill + remove dashboard hub call.
- [ ] **Step 3:** Host push/pop on tracked + new jobs inspect (same `ApplicationInfoPanel`).
- [ ] **Step 4:** `vp check` `apps/web`. Commit `feat(web): create skill from job match in the side panel`

---

### Task 7: Check + harness

- [ ] **Step 1:** `vp check` in `packages/core`, `packages/api`, `apps/agent`, `apps/web`. `vp run --filter @tsu-stack/core test:unit`.
- [ ] **Step 2:** Manual: inspect the job from the screenshot. Phrases gone. Postman/HTTP still Missing. `%` is Have / remaining tools. Take still allowed to say frontend role. Create skill from Postman → same job, Postman in Have.
- [ ] **Step 3:** Run [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) on inspect Match + regenerate take. Append lessons.
- [ ] **Step 4:** Commit harness notes if the skill requires a report file.

---

## Out of scope (do not do)

- New oRPC “create and assign to job”
- Counting Close as Have
- Changing `matchScore` / years cap
- Lightcast/ESCO
- Hub create-skill Confirm (still hub-job-context PR 3)
- Migrating old `requiredSkills` JSON (inspect canonicalize is enough)
