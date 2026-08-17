# Hub obey same-turn (company-status wrap) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **REQUIRED after implementation:** [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) — live hub Thread conversation cycle, score 1–100, append `LESSONS.md` + `tool-gaps.md`, write the report. Everyday language only. Do not coach the agent with tool names.

**Goal:** On a packed everyday ask (“what we have today + Trivelta + pile”), the hub finishes Today, then actually reads that company (tracked + mail + labels), then lists the pile — without replacing the hub supervisor, without silent CRM writes, and without “Checking…” as the whole answer.

**Architecture:** Keep `hub-supervisor` as the open-ended chat agent. Add one same-turn Mastra workflow behind `getCompanyStatus` that searches applications + mail, classifies the latest unsorted mention (labels only), and returns facts + a recommendation. Processors force that one tool (and `listNewJobs` for pile). `processOutputStep` + `abort({ retry: true })` retries status-only turns. `proposeMailCrmChange` stays client HITL. Today stays agent + client letter formatter.

**Tech Stack:** Mastra `createWorkflow` / `createStep` / `createTool` / `processInputStep` / `processOutputStep` / `maxProcessorRetries`, Zod contracts in `@tsu-stack/core`, existing `applicationRepository` + `mailMessageRepository`, assistant-ui toolkit UI, one thread `dashboard-home:{userId}`.

## Global Constraints

- Do **not** replace `hub-supervisor` with a chat workflow. Workflow HITL is `suspend`/`resume` and must not replace assistant-ui Confirm.
- One hub thread per user (`dashboard-home:{userId}`). Remount keep-latest + Clear pending stay as they are.
- BYO LLM via `requestContext` / Settings. No provider env keys.
- Session-only Better Auth. Tenant `userId` only from `requestContext`. Never accept `userId` from tool input.
- Confirm writes on the client. No silent `updateApplicationStage` to applied. `sendApplyOutreach` stays the only silent applied path.
- Chat classify is **labels only**. Do not run `applyMailCrmEffect` / `applyMailCrmEffectFromClassify` from chat or from this workflow.
- `job_notifier` never drives a CRM Confirm card or a stage write.
- Same job = company + title, or the same listing URL. Two titles = two rows. One open company row and mail has no title → that row.
- Source of truth = latest CRM mail (`application` / `application_status` / `recruiter` / `interview` / `offer`). A later digest does not cancel a receipt.
- File Diff hard-stop stays. No jal-co. No apply-for-me tools.
- New Mastra files crash incremental bundle if imported via `#@/mastra/…` from the supervisor. Re-export new tools from an already-bundled file (`search-applications.tool.ts`). Use **relative** imports inside new files.
- New `@tsu-stack/core` exports need `pnpm --filter @tsu-stack/agent rebuild:core-cache` before claiming the agent can import them.
- DeepSeek thinking 400s on `toolChoice: "required"`. Steer with `activeTools` + `abort({ retry: true })` only. Never set `toolChoice: "required"` on company / Today / pile.
- Everyday English in live tests. Do not coach product names.
- GitHub MCP stays parked.
- **Evidence form doors are restored (user override 2026-08-17).** List `+` and inspect Edit open `ExperienceForm` / `ProjectForm` / `StackForm` again. Hub interview + File Diff Confirm stay for chat. Detect / organize / inspect / delete / portfolio stay. Hub inspect Edit uses `EntityFormHost` (`completeOnClose: false`), not a new `open-entity-form` tool.

## File map

| File                                                                           | Responsibility                                                                           |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `packages/core/src/mail/hub-mail-crm.ts`                                       | Add `recommendHubMailCrmIntent` (pure). Keep existing latest-mail / same-job helpers.    |
| `packages/core/src/mail/__tests__/recommend-mail-crm-intent.test.ts`           | Core TDD for speak / track / create / set_stage / no notifier write.                     |
| `packages/core/src/application/company-status-facts.ts`                        | Zod input/output for the same-turn wrap.                                                 |
| `packages/core/src/application/index.ts`                                       | Re-export the new schemas.                                                               |
| `apps/agent/src/mastra/workflows/hub-company-status-workflow/index.ts`         | Workflow graph. Register in `apps/agent/src/mastra/index.ts`.                            |
| `apps/agent/src/mastra/workflows/hub-company-status-workflow/search.step.ts`   | Parallel-enough search of applications + mail.                                           |
| `apps/agent/src/mastra/workflows/hub-company-status-workflow/classify.step.ts` | Labels-only classify of latest unsorted mention.                                         |
| `apps/agent/src/mastra/workflows/hub-company-status-workflow/assemble.step.ts` | Call `recommendHubMailCrmIntent`. No writes.                                             |
| `apps/agent/src/mastra/tools/get-company-status.tool.ts`                       | `createRun().start()` same-turn wrapper.                                                 |
| `apps/agent/src/mastra/tools/search-applications.tool.ts`                      | Re-export `getCompanyStatusTool` (bundle-safe).                                          |
| `apps/agent/src/mastra/tools/classify-mail.tool.ts`                            | Load lexical few-shot instead of `[]`.                                                   |
| `packages/core/src/ai-settings/hub-packed-ask.ts`                              | Shared Today / company / pile detectors + `hubPackedAskNeedsContinuation` (Task 5 move). |
| `packages/core/src/ai-settings/index.ts`                                       | Re-export packed-ask helpers.                                                            |
| `apps/agent/src/mastra/lib/hub-superpowers-policy.ts`                          | Task 1 detectors; Task 5 re-exports from core. Company activeTools = `getCompanyStatus`. |
| `apps/agent/src/mastra/processors/hub-processors.ts`                           | Company / pile processors; `HubStatusOnlyRetryProcessor`.                                |
| `apps/agent/src/mastra/agents/hub-supervisor.ts`                               | Register tool; `maxProcessorRetries: 2`; company continue after Today.                   |
| `apps/agent/src/mastra/lib/hub-system-prompt.ts`                               | Path company starts with `getCompanyStatus`.                                             |
| `apps/web/src/features/agent-hub/lib/hub-tool-names.ts`                        | `getCompanyStatus` names.                                                                |
| `apps/web/src/features/agent-hub/lib/should-auto-resume-hub-chat.ts`           | Packed Today is not terminal.                                                            |
| `apps/web/src/features/agent-hub/ui/get-company-status-tool-ui.tsx`            | Status-only line, then hide (mirror `get-daily-brief-tool-ui`).                          |
| `apps/web/src/features/agent-hub/ui/hub-assistant-toolkit.tsx`                 | Register both kebab and camel keys.                                                      |
| `apps/web/src/features/agent-hub/lib/hub-agent-activity.ts`                    | “Checking {company}”.                                                                    |

Do **not** add oRPC, DB migrations, or a second chat agent.

## Reviewer lock (must land in the tasks below)

Plan review 2026-08-17. Do not execute until these are in the task text (they now are).

1. **One phase at a time.** Mastra `processInputStep` last-writer-wins on `activeTools`. Packed asks must not let pile overwrite Today. Drive Today / company / pile processors, `onIterationComplete`, and `shouldRetryHubStatusOnlyStep` from `hubPackedAskPhase(messages)`: `today_facts` → `today_open` → `company` → `propose_if_needed` → `pile` → `done`. Later phases no-op until earlier ones are done.
2. **Resume once.** After `openDailyBrief`, auto-resume packed asks only when that tool is on the **last** step (no later `step-start` / server part). Empty later step → do not re-POST.
3. **`messagesNeedCompanyRead` is done** when this turn has `getCompanyStatus` / `get-company-status`, or the legacy pair `searchApplications`+`searchMail`.
4. **Classify must feed assemble.** Search step keeps a rich internal mail type (`fromName`, `fromEmail`, `bodyText`, `companyName`, `title`, `listingUrl`). Classify patches `mail[].labels`. Assemble reads the patched rows. Resolve BYO `llm` the same way as `classify-mail.tool.ts`.
5. **Confirm before pile.** If `boardWouldChange`, keep `proposeMailCrmChange` in `activeTools` and do not force `listNewJobs` / triage until the card is out or the user is `speak_only`.
6. **`extractHubCompanyQuery` stopwords include `also`.** The test `"catch me up — also trivelta stage"` → `"trivelta"`.
7. **Pending `openDailyBrief` HITL stays.** Processors keep `mastraMessagesHavePendingClientHitl` and return `undefined` while the letter waits. That is the handshake; Task 5 client resume is the only continuation.
8. **Relative import** for `load-mail-few-shot.ts` from `classify-mail.tool.ts`. No `#@/mastra/lib/…`.

---

### Task 1: Packed-ask detectors

**Files:**

- Modify: `apps/agent/src/mastra/lib/hub-superpowers-policy.ts`
- Modify: `apps/agent/src/mastra/lib/hub-superpowers-policy.test.ts`
- Modify: `apps/agent/src/mastra/processors/hub-processors.ts` (`messagesNeedCompanyRead` / new `messagesNeedPileList`)
- Modify: `apps/agent/src/mastra/processors/hub-processors.triage.test.ts`

**Interfaces:**

- Consumes: existing `userTurnAsksDailyBrief`, `userTurnAsksEntityInspect`
- Produces:
  - `userTurnAsksCompanyStatus(text: string): boolean` — true on packed Today + named company
  - `userTurnAsksNewJobsPile(text: string): boolean`
  - `extractHubCompanyQuery(text: string): string | null` — leftover tokens joined, used as `getCompanyStatus` query
  - `filterHubCompanyStatusActiveTools(toolNames: string[]): string[]` — only `getCompanyStatus` / `get-company-status`
  - `filterHubPileActiveTools(toolNames: string[]): string[]` — only `listNewJobs` / `list-new-jobs` until that tool has run
  - `messagesNeedPileList(messages): boolean`

- [ ] **Step 1: Write the failing detector tests**

In `hub-superpowers-policy.test.ts`, add:

```ts
describe("userTurnAsksCompanyStatus packed Today", () => {
  it("is true when Today and a named company share one utterance", () => {
    expect(
      userTurnAsksCompanyStatus("what we have today? and trivelta they email me or just quiet")
    ).toBe(true);
    expect(userTurnAsksCompanyStatus("catch me up — also trivelta stage")).toBe(true);
    expect(extractHubCompanyQuery("catch me up — also trivelta stage")).toBe("trivelta");
  });

  it("stays false for Today-only and inspect-only", () => {
    expect(userTurnAsksCompanyStatus("what we have today?")).toBe(false);
    expect(userTurnAsksCompanyStatus("catch me up")).toBe(false);
    expect(userTurnAsksCompanyStatus("open mentech")).toBe(false);
    expect(extractHubCompanyQuery("what we have today?")).toBe(null);
  });
});

describe("userTurnAsksDailyBrief mid-utterance", () => {
  it("catches on-my-plate even after a prefix or an extra word", () => {
    expect(
      userTurnAsksDailyBrief(
        "don't give me a vibe check. what's actually on my plate today, and is trivelta still applied"
      )
    ).toBe(true);
    expect(userTurnAsksDailyBrief("ok so what's on my plate")).toBe(true);
  });
});

describe("userTurnAsksNewJobsPile", () => {
  it("catches pile / new jobs and packed Today+pile", () => {
    expect(userTurnAsksNewJobsPile("anything new in the pile")).toBe(true);
    expect(userTurnAsksNewJobsPile("what we have today and the pile")).toBe(true);
    expect(userTurnAsksNewJobsPile("what's trivelta's stage")).toBe(false);
    expect(userTurnAsksNewJobsPile("open mentech")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @tsu-stack/agent exec vitest run src/mastra/lib/hub-superpowers-policy.test.ts`

Expected: FAIL — packed Today+Trivelta is currently `false` because `userTurnAsksCompanyStatus` returns early when `userTurnAsksDailyBrief` is true. `userTurnAsksNewJobsPile` is not defined.

- [ ] **Step 3: Implement detectors**

Replace the company-status early return. Do **not** treat Today as exclusive.

```ts
const COMPANY_QUERY_STOPWORDS = new Set([
  ...COMPANY_STATUS_STOPWORDS,
  "today",
  "catch",
  "plate",
  "brief",
  "briefing",
  "pile",
  "inbox",
  "jobs",
  "new",
  "anything",
  "landed",
  "showed",
  "update",
  "also",
  "dont",
  "don't",
  "vibe",
  "check",
  "give",
  "actually",
  "sitting",
  "empty"
]);

export function extractHubCompanyQuery(text: string): string | null {
  const leftover = text
    .replace(/[^a-z0-9'\s]/gi, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2)
    .filter((word) => !COMPANY_QUERY_STOPWORDS.has(word.toLowerCase()));
  if (leftover.length === 0) return null;
  return leftover.slice(0, 4).join(" ");
}

export function userTurnAsksCompanyStatus(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (userTurnAsksEntityInspect(t) && !userTurnAsksDailyBrief(t)) return false;
  const query = extractHubCompanyQuery(t);
  if (!query) return false;
  if (
    /\b(stage|email|emails|mail|quiet|reply|replied|news|heard|applied|status|receipt|write back)\b/i.test(
      t
    )
  ) {
    return true;
  }
  return userTurnAsksDailyBrief(t);
}

export function userTurnAsksNewJobsPile(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (userTurnAsksEntityInspect(t) && !userTurnAsksDailyBrief(t)) return false;
  return /\b(pile|new jobs|jobs that came in|any jobs for me|what'?s in the (inbox|pile)|anything new in (the )?(pile|inbox))\b/i.test(
    t
  );
}

export function filterHubCompanyStatusActiveTools(toolNames: string[]): string[] {
  return toolNames.filter((name) => /getCompanyStatus|get-company-status/i.test(name));
}

export function filterHubPileActiveTools(toolNames: string[]): string[] {
  return toolNames.filter((name) => /listNewJobs|list-new-jobs/i.test(name));
}
```

Also fix `userTurnAsksDailyBrief` in the same file (live miss, 2026-08-17 cycle 8):

- The `^(what|anything|…)\btoday` fallback is start-anchored, so `"don't give me a vibe check. what's actually on my plate today"` is **not** Today.
- `what's on my plate` does not match `what's actually on my plate`.
- Drop the `^`. Treat `on my plate` as Today even with one extra word (`actually` / `really`).

```ts
if (/\bon my plate\b/i.test(t)) return true;
if (/\b(what|anything|whats|what'?s)\b[\s\S]{0,64}\btoday\b/i.test(t)) return true;
```

Keep the existing `I applied today to Trivelta` case **false** (it has no what/anything/what's and no "on my plate").

In `hub-processors.ts`, add `hubPackedAskPhase` and use it everywhere a packed ask is forced:

```ts
export type HubPackedAskPhase =
  "today_facts" | "today_open" | "company" | "propose_if_needed" | "pile" | "done";

export function hubPackedAskPhase(messages: ProcessInputStepArgs["messages"]): HubPackedAskPhase {
  if (messagesNeedDailyBriefFacts(messages)) return "today_facts";
  if (messagesNeedDailyBriefOpen(messages)) return "today_open";
  if (messagesNeedCompanyRead(messages)) return "company";
  if (messagesNeedMailCrmPropose(messages)) return "propose_if_needed";
  if (messagesNeedPileList(messages)) return "pile";
  return "done";
}
```

`HubTodayProcessor` only runs on `today_facts` / `today_open`. `HubCompanyStatusProcessor` only on `company`. `HubPileProcessor` only on `pile`. A processor whose phase is not current returns `undefined` (does not set `activeTools`).

`messagesNeedCompanyRead` is **false** once this turn has any of:

- a `getCompanyStatus` / `get-company-status` part, or
- both a `searchApplications` / `search-applications` part **and** a `searchMail` / `search-mail` part.

Add a processor-chain unit: packed step-0 user text → run Today then company then pile `processInputStep` in order → merged `activeTools` is only `getDailyBrief` / `get-daily-brief`.

`messagesNeedMailCrmPropose`: this turn already has company facts, `boardWouldChange` is true on the latest `getCompanyStatus` output, and `proposeMailCrmChange` has not been called. While this is true, pile must not lock `activeTools`.

Add `messagesNeedPileList`:

```ts
export function messagesNeedPileList(messages: ProcessInputStepArgs["messages"]): boolean {
  if (!userTurnAsksNewJobsPile(latestUserText(messages))) return false;
  for (const message of messagesAfterLatestUser(messages)) {
    if (message.role !== "assistant") continue;
    for (const raw of message.content?.parts ?? []) {
      if (!raw || typeof raw !== "object") continue;
      if (isListNewJobsToolName(mastraPartToolName(raw as Record<string, unknown>))) return false;
    }
  }
  return true;
}
```

Add the matching processor-test rows in `hub-processors.triage.test.ts` for a packed user turn that already has `openDailyBrief` complete and still needs company / pile.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @tsu-stack/agent exec vitest run src/mastra/lib/hub-superpowers-policy.test.ts src/mastra/processors/hub-processors.triage.test.ts`

Expected: PASS for the new detector cases. Existing Today-only / inspect-only cases still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/mastra/lib/hub-superpowers-policy.ts \
  apps/agent/src/mastra/lib/hub-superpowers-policy.test.ts \
  apps/agent/src/mastra/processors/hub-processors.ts \
  apps/agent/src/mastra/processors/hub-processors.triage.test.ts
git commit -m "$(cat <<'EOF'
fix(agent): detect packed Today + company + pile in one turn

EOF
)"
```

---

### Task 2: Pure CRM recommendation (no writes)

**Files:**

- Create: `packages/core/src/mail/__tests__/recommend-mail-crm-intent.test.ts`
- Modify: `packages/core/src/mail/hub-mail-crm.ts`
- Create: `packages/core/src/application/company-status-facts.ts`
- Modify: `packages/core/src/application/index.ts`

**Interfaces:**

- Consumes: `latestCrmMail`, `latestMention`, `mailIsJobNotifier`, `mailIsUnsorted`, `isSameHubJob`, `proposedStageFromSystemLabels`, `ProposeMailCrmIntent`
- Produces:

```ts
export type HubMailCrmRecommendation = {
  intent: "speak_only" | ProposeMailCrmIntent;
  boardWouldChange: boolean;
  applicationId: string | null;
  trackingStatus: "inbox" | "tracked" | "dismissed" | "none";
  currentStage: string | null;
  targetStage: string | null;
  reason: string;
};

export function recommendHubMailCrmIntent(input: {
  applications: Array<{
    id: string;
    companyName: string;
    title: string;
    stage: string;
    trackingStatus: "inbox" | "tracked" | "dismissed";
    listingUrl?: string | null;
    outcome?: string | null;
  }>;
  mail: Array<{
    id: string;
    receivedAt: string | null;
    labels: string[];
    subject?: string | null;
    companyName?: string | null;
    title?: string | null;
    listingUrl?: string | null;
  }>;
}): HubMailCrmRecommendation;
```

```ts
// packages/core/src/application/company-status-facts.ts
export const GetCompanyStatusInputSchema = z.object({
  query: z.string().min(1).max(80)
});

export const CompanyStatusFactsSchema = z.object({
  query: z.string(),
  applications: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      companyName: z.string(),
      stage: z.string(),
      trackingStatus: z.enum(["inbox", "tracked", "dismissed"])
    })
  ),
  mail: z.array(
    z.object({
      id: z.string(),
      subject: z.string(),
      labels: z.array(z.string()),
      receivedAt: z.string().nullable(),
      applicationId: z.string().nullable(),
      preview: z.string()
    })
  ),
  latestCrmMailId: z.string().nullable(),
  latestMentionMailId: z.string().nullable(),
  classifiedThisRun: z.boolean(),
  recommendation: z.enum([
    "speak_only",
    "track_applied",
    "create_applied",
    "set_stage",
    "close_rejected"
  ]),
  boardWouldChange: z.boolean(),
  applicationId: z.string().nullable(),
  trackingStatus: z.enum(["inbox", "tracked", "dismissed", "none"]),
  currentStage: z.string().nullable(),
  targetStage: z.string().nullable(),
  reason: z.string()
});
```

- [ ] **Step 1: Write the failing core tests**

```ts
import { describe, expect, it } from "vitest";
import { recommendHubMailCrmIntent } from "../hub-mail-crm";

const tracked = {
  id: "a1",
  companyName: "Trivelta",
  title: "Engineer",
  stage: "applied",
  trackingStatus: "tracked" as const
};

const inbox = { ...tracked, id: "a2", trackingStatus: "inbox" as const, stage: "saved" };

const receipt = {
  id: "m1",
  receivedAt: "2026-01-01T10:00:00.000Z",
  labels: ["application"],
  companyName: "Trivelta",
  title: "Engineer"
};

const laterDigest = {
  id: "m2",
  receivedAt: "2026-01-15T10:00:00.000Z",
  labels: ["job_notifier"],
  companyName: "Trivelta",
  title: null
};

describe("recommendHubMailCrmIntent", () => {
  it("speaks when tracked already matches the latest CRM mail", () => {
    const rec = recommendHubMailCrmIntent({
      applications: [tracked],
      mail: [receipt, laterDigest]
    });
    expect(rec.intent).toBe("speak_only");
    expect(rec.boardWouldChange).toBe(false);
    expect(rec.applicationId).toBe("a1");
  });

  it("tracks an inbox row when latest CRM mail is a receipt", () => {
    const rec = recommendHubMailCrmIntent({
      applications: [inbox],
      mail: [receipt]
    });
    expect(rec.intent).toBe("track_applied");
    expect(rec.boardWouldChange).toBe(true);
  });

  it("creates when there is a receipt and no row", () => {
    const rec = recommendHubMailCrmIntent({ applications: [], mail: [receipt] });
    expect(rec.intent).toBe("create_applied");
    expect(rec.boardWouldChange).toBe(true);
  });

  it("never writes from a notifier-only mailbox", () => {
    const rec = recommendHubMailCrmIntent({
      applications: [tracked],
      mail: [laterDigest]
    });
    expect(rec.intent).toBe("speak_only");
    expect(rec.boardWouldChange).toBe(false);
  });

  it("uses the one open company row when mail has no title", () => {
    const rec = recommendHubMailCrmIntent({
      applications: [tracked],
      mail: [{ ...receipt, title: null }]
    });
    expect(rec.applicationId).toBe("a1");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @tsu-stack/core exec vitest run src/mail/__tests__/recommend-mail-crm-intent.test.ts`

Expected: FAIL — `recommendHubMailCrmIntent` is not exported.

- [ ] **Step 3: Implement the helper + schema**

Add `recommendHubMailCrmIntent` next to the existing helpers in `hub-mail-crm.ts`:

- Pick the application with `isSameHubJob`, else the single open (`inbox` or `tracked`) row for that company, else null.
- `latest = latestCrmMail(mail)`. If none, `speak_only` (board does not change from notifier / unsorted).
- `targetStage = proposedStageFromSystemLabels(latest.labels)`.
- If no application and target is `applied` → `create_applied`.
- If application.trackingStatus === `inbox` and target is set → `track_applied`.
- If application is tracked and `targetStage` is ahead of `currentStage` → `set_stage`.
- If application is tracked and already at/above target → `speak_only`.
- Never recommend a write when `mailIsJobNotifier(latest.labels)` or `latest` is null.
- Do **not** invent `close_rejected` from keywords. Leave `close_rejected` for the supervisor after it reads facts (preview is in the payload). Tests must assert notifier/receipt never become `close_rejected`.

Export `GetCompanyStatusInputSchema` and `CompanyStatusFactsSchema` from `packages/core/src/application/index.ts`.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @tsu-stack/core exec vitest run src/mail/__tests__/recommend-mail-crm-intent.test.ts src/mail/__tests__/hub-mail-crm.test.ts`

Expected: PASS.

- [ ] **Step 5: Rebuild the core ESM cache**

Run: `pnpm --filter @tsu-stack/agent rebuild:core-cache`

Expected: cache file regenerates; no “does not provide an export named” for the new symbols.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/mail/hub-mail-crm.ts \
  packages/core/src/mail/__tests__/recommend-mail-crm-intent.test.ts \
  packages/core/src/application/company-status-facts.ts \
  packages/core/src/application/index.ts
git commit -m "$(cat <<'EOF'
feat(core): recommend hub mail CRM intent without writing

EOF
)"
```

---

### Task 3: Same-turn company-status workflow + tool

**Files:**

- Create: `apps/agent/src/mastra/workflows/hub-company-status-workflow/search.step.ts`
- Create: `apps/agent/src/mastra/workflows/hub-company-status-workflow/classify.step.ts`
- Create: `apps/agent/src/mastra/workflows/hub-company-status-workflow/assemble.step.ts`
- Create: `apps/agent/src/mastra/workflows/hub-company-status-workflow/index.ts`
- Create: `apps/agent/src/mastra/tools/get-company-status.tool.ts`
- Modify: `apps/agent/src/mastra/tools/search-applications.tool.ts` (re-export)
- Modify: `apps/agent/src/mastra/index.ts` (register workflow)
- Modify: `apps/agent/src/mastra/tools/classify-mail.tool.ts` (few-shot)

**Interfaces:**

- Consumes: `GetCompanyStatusInputSchema`, `CompanyStatusFactsSchema`, `recommendHubMailCrmIntent`, `mailClassifyWorkflow.createRun().start`, `applicationRepository.findAllByUserId`, `mailMessageRepository.findByUserId`
- Produces: `hubCompanyStatusWorkflow`, `getCompanyStatusTool` (`id: "get-company-status"`)

Workflow is **same-turn** (`run.start`, not `startAsync`). No `suspend`. No CRM write. Classify step must not call `applyMailCrmEffect`.

- [ ] **Step 1: Write a workflow-assemble unit test**

Create `apps/agent/src/mastra/workflows/hub-company-status-workflow/assemble.test.ts` that feeds the assemble function the receipt + tracked fixtures from Task 2 and asserts the output matches `CompanyStatusFactsSchema` with `recommendation: "speak_only"`. Keep search/classify IO out of this test — export `assembleCompanyStatusFacts(...)` from `assemble.step.ts` as a plain function the step calls.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @tsu-stack/agent exec vitest run src/mastra/workflows/hub-company-status-workflow/assemble.test.ts`

Expected: FAIL — file / function missing.

- [ ] **Step 3: Implement search → classify → assemble**

`search.step.ts` (relative imports only):

```ts
import { createStep } from "@mastra/core/workflows";
import { GetCompanyStatusInputSchema } from "@tsu-stack/core";
import { applicationRepository, createDb, mailMessageRepository, runWithDb } from "@tsu-stack/db";
import { z } from "zod";

export const searchCompanyStatusStep = createStep({
  id: "search-company-status",
  inputSchema: GetCompanyStatusInputSchema.extend({
    userId: z.string().min(1)
  }),
  outputSchema: z.object({
    query: z.string(),
    userId: z.string(),
    applications: CompanyStatusFactsSchema.shape.applications,
    mail: CompanyStatusFactsSchema.shape.mail
  }),
  execute: async ({ inputData }) => {
    // tenant = inputData.userId from requestContext only (set by the tool)
    // reuse the same scoring as search-applications.tool.ts and haystack as search-mail.tool.ts
    // do not import those tools (bundle + execute coupling)
  }
});
```

Copy the small `scoreHit` / `haystack` helpers into this file (or a `./search-helpers.ts` next to the step). Do not import `searchApplicationsTool.execute`.

Search **output** is a rich internal type, not `CompanyStatusFactsSchema.shape.mail`. It must include `fromName`, `fromEmail`, `bodyText` (load via `findByIdForUser` on the latest mention if the list row has no body), `companyName`, `title`, `listingUrl`. Facts schema is only the assemble output.

`classify.step.ts`:

- Input = search output.
- `latest = latestMention(mail)`.
- If `!latest || !mailIsUnsorted(latest.labels)` → pass through `classifiedThisRun: false`.
- Else run the same path as `classifyMailTool`: skip if already has a system label; resolve `llm` with `runtimeLlmFromRequestContext` then `resolveRuntimeAiCredentials` (do not start classify without `llm`); `mailClassifyWorkflow.createRun(); run.start({ inputData: { …, fewShotCorrections, smartRules, llm }, requestContext })`; `applyClassification` for **labels only**.
- Emit the search payload with **that message’s `labels` replaced** by the classify result. Assemble must not see the pre-classify unsorted labels.
- Extract few-shot load into `apps/agent/src/mastra/lib/load-mail-few-shot.ts` and call it from both `classify-mail.tool.ts` and this step. Import it with a **relative** path (`../lib/load-mail-few-shot.ts`). Never `#@/mastra/lib/load-mail-few-shot`.

Few-shot loader (lexical only — `aiCorrectionRepository` may be missing from the db ESM cache, same class as `mailSmartRuleRepository`):

```ts
export async function loadMailFewShotCorrections(args: {
  db: /* drizzle */;
  userId: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  preview: string;
  bodyText: string;
}): Promise<AiCorrectionFewShotExample[]> {
  const result = await args.db.execute(sql`
    select from_name, from_email, subject, preview,
           predicted_system_labels, corrected_system_labels
    from ai_correction
    where user_id = ${args.userId}
    order by created_at desc
    limit 24
  `);
  // map rows → AiCorrectionFewShotExample (no body_text column on this table)
  return selectCorrectionsForFewShot(
    {
      fromName: args.fromName,
      fromEmail: args.fromEmail,
      subject: args.subject,
      preview: args.preview,
      bodyText: args.bodyText
    },
    mapped,
    { max: 6 }
  );
}
```

Table is `ai_correction` (`packages/db/src/schema/ai-correction.schema.ts`). There is **no** `body_text` column. If the query throws, return `[]` (do not crash the turn).

`assemble.step.ts` calls `recommendHubMailCrmIntent` and returns `CompanyStatusFactsSchema`.

`index.ts`:

```ts
export const hubCompanyStatusWorkflow = createWorkflow({
  id: "hub-company-status-workflow",
  inputSchema: GetCompanyStatusInputSchema.extend({ userId: z.string().min(1) }),
  outputSchema: CompanyStatusFactsSchema
})
  .then(searchCompanyStatusStep)
  .then(classifyCompanyStatusStep)
  .then(assembleCompanyStatusStep);

hubCompanyStatusWorkflow.commit();
```

Register `hubCompanyStatusWorkflow` in `apps/agent/src/mastra/index.ts` `workflows: { … }`.

`get-company-status.tool.ts`:

```ts
export const getCompanyStatusTool = createTool({
  id: "get-company-status",
  description:
    "Same-turn read of tracked, New jobs, and all mail for one company name. Classifies the latest unsorted mention (labels only). Returns facts plus a recommendation. Then speak the stage. Call proposeMailCrmChange only if boardWouldChange is true. Never write CRM from this tool. job_notifier never changes stage.",
  inputSchema: GetCompanyStatusInputSchema,
  outputSchema: CompanyStatusFactsSchema,
  execute: async ({ query }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return {
        query,
        applications: [],
        mail: [],
        latestCrmMailId: null,
        latestMentionMailId: null,
        classifiedThisRun: false,
        recommendation: "speak_only",
        boardWouldChange: false,
        applicationId: null,
        trackingStatus: "none",
        currentStage: null,
        targetStage: null,
        reason: "unauthorized"
      };
    }
    const run = await hubCompanyStatusWorkflow.createRun();
    const result = await run.start({
      inputData: { query: query.trim(), userId },
      requestContext: context.requestContext
    });
    if (result.status !== "success") {
      return {
        query,
        applications: [],
        mail: [],
        latestCrmMailId: null,
        latestMentionMailId: null,
        classifiedThisRun: false,
        recommendation: "speak_only",
        boardWouldChange: false,
        applicationId: null,
        trackingStatus: "none",
        currentStage: null,
        targetStage: null,
        reason: "workflow_failed"
      };
    }
    return CompanyStatusFactsSchema.parse(result.result);
  }
});
```

At the bottom of `search-applications.tool.ts`:

```ts
export { getCompanyStatusTool } from "./get-company-status.tool.ts";
```

Supervisor must import `getCompanyStatusTool` from `#@/mastra/tools/search-applications.tool` (already bundled), not from the new file path.

- [ ] **Step 4: Run assemble + classify-mail tests**

Run:

```bash
pnpm --filter @tsu-stack/agent exec vitest run \
  src/mastra/workflows/hub-company-status-workflow/assemble.test.ts \
  src/mastra/lib/hub-superpowers-policy.test.ts
```

Expected: assemble PASS. Existing policy tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/mastra/workflows/hub-company-status-workflow \
  apps/agent/src/mastra/tools/get-company-status.tool.ts \
  apps/agent/src/mastra/tools/search-applications.tool.ts \
  apps/agent/src/mastra/tools/classify-mail.tool.ts \
  apps/agent/src/mastra/lib/load-mail-few-shot.ts \
  apps/agent/src/mastra/index.ts
git commit -m "$(cat <<'EOF'
feat(agent): same-turn getCompanyStatus workflow

EOF
)"
```

---

### Task 4: Wire supervisor, prompt, and toolkit

**Files:**

- Modify: `apps/agent/src/mastra/agents/hub-supervisor.ts`
- Modify: `apps/agent/src/mastra/lib/hub-system-prompt.ts`
- Modify: `apps/agent/src/mastra/lib/hub-system-prompt.test.ts`
- Modify: `apps/agent/src/mastra/processors/hub-processors.ts`
- Modify: `apps/web/src/features/agent-hub/lib/hub-tool-names.ts`
- Modify: `apps/web/src/features/agent-hub/lib/hub-agent-activity.ts`
- Modify: `apps/web/src/features/agent-hub/lib/hub-agent-activity.test.ts`
- Create: `apps/web/src/features/agent-hub/ui/get-company-status-tool-ui.tsx`
- Modify: `apps/web/src/features/agent-hub/ui/hub-assistant-toolkit.tsx`
- Modify: `apps/web/src/features/agent-hub/index.ts` if it re-exports tool-name helpers

**Interfaces:**

- Consumes: `getCompanyStatusTool`, `messagesNeedCompanyRead`, `HUB_COMPANY_MUST_READ_FEEDBACK`
- Produces: supervisor tool key `getCompanyStatus`; activity label “Checking company”; toolkit entry that hides after result (like `GetDailyBriefToolUI`)

- [ ] **Step 1: Write the failing prompt + activity tests**

`hub-system-prompt.test.ts` — assert the company path mentions `getCompanyStatus` and still mentions `proposeMailCrmChange`.

`hub-agent-activity.test.ts` — `["get-company-status", "Checking company"]`.

- [ ] **Step 2: Run them**

Run:

```bash
pnpm --filter @tsu-stack/agent exec vitest run src/mastra/lib/hub-system-prompt.test.ts
pnpm --filter @tsu-stack/web exec vitest run src/features/agent-hub/lib/hub-agent-activity.test.ts
```

Expected: FAIL on the new assertions.

- [ ] **Step 3: Wire**

Supervisor `tools`: `getCompanyStatus: getCompanyStatusTool` imported from `search-applications.tool`.

`onIterationComplete`: keep `messagesNeedCompanyRead` continue. After Today open, if `messagesNeedCompanyRead` or `messagesNeedPileList`, `continue: true` with the matching feedback.

Prompt Path company — replace the first sentence with:

```
A company name plus stage / mail / "what's going on" (including packed with Today) means: call `getCompanyStatus` once with that name. Wait for the facts. Then speak the stage. Call `proposeMailCrmChange` only if `boardWouldChange` is true. Do not skip to "Checking…". Do not call `findJobsNow` for a stage question.
```

Keep the mail-kind table and Confirm rules.

Path Today — add one line after the spoken-line rule:

```
Packed with a company or the pile: after the letter is open, continue those clauses. Do not stop the turn at the letter.
```

`HubCompanyStatusProcessor` already exists — it now forces `getCompanyStatus` via the Task 1 activeTools filter. Feedback:

```
They asked about a company. Call getCompanyStatus now with that name. Then speak the stage. Do not only say you are checking.
```

Wrap in `<system-reminder>` like the existing constants.

Toolkit UI (`get-company-status-tool-ui.tsx`):

```tsx
export function GetCompanyStatusToolUI({ result }: ToolCallMessagePartProps<...>) {
  if (result == null) {
    return (
      <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
        Checking that company…
      </p>
    );
  }
  return null;
}
```

Register kebab + camel in `hub-assistant-toolkit.tsx`. Add names to `hub-tool-names.ts`. Do **not** put `getCompanyStatus` on `HUB_CLIENT_RESUME_TOOL_NAMES` (it has `execute`).

- [ ] **Step 4: Re-run tests**

Same commands as Step 2 plus:

`pnpm --filter @tsu-stack/agent exec vitest run src/mastra/processors/hub-processors.triage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/mastra/agents/hub-supervisor.ts \
  apps/agent/src/mastra/lib/hub-system-prompt.ts \
  apps/agent/src/mastra/lib/hub-system-prompt.test.ts \
  apps/agent/src/mastra/processors/hub-processors.ts \
  apps/web/src/features/agent-hub
git commit -m "$(cat <<'EOF'
feat(hub): force getCompanyStatus on company-status turns

EOF
)"
```

---

### Task 5: Packed Today must not swallow the rest

**Files:**

- Modify: `apps/web/src/features/agent-hub/lib/should-auto-resume-hub-chat.ts`
- Modify: `apps/web/src/features/agent-hub/lib/should-auto-resume-hub-chat.test.ts`
- Modify: `apps/agent/src/mastra/processors/hub-processors.ts` (`HubTodayProcessor` must not run after `sawOpen` when company/pile still needed — already true if detectors work)
- Modify: `apps/agent/src/mastra/agents/hub-supervisor.ts` (`onIterationComplete` after Today open)

**Interfaces:**

- Consumes: `userTurnAsksCompanyStatus`, `userTurnAsksNewJobsPile` (re-export from `@tsu-stack/core` **or** duplicate the two one-line regexes in the web test via a tiny core helper)
- Produces: `openDailyBriefNeedsContinuation(userText: string): boolean`

Do **not** import agent policy files from `apps/web`. In this task, move the three detectors plus this helper into `packages/core/src/ai-settings/hub-packed-ask.ts` and add `export * from "./hub-packed-ask"` to `packages/core/src/ai-settings/index.ts`. Agent `hub-superpowers-policy.ts` becomes:

```ts
export {
  extractHubCompanyQuery,
  userTurnAsksCompanyStatus,
  userTurnAsksNewJobsPile,
  userTurnAsksDailyBrief,
  hubPackedAskNeedsContinuation
} from "@tsu-stack/core";
```

```ts
export function hubPackedAskNeedsContinuation(text: string): boolean {
  return userTurnAsksCompanyStatus(text) || userTurnAsksNewJobsPile(text);
}
```

Keep `userTurnRetriesDailyBrief` and inspect detectors in the agent policy file (web does not need them). Rebuild the core ESM cache after the move.

- [ ] **Step 1: Write the failing resume + hide tests**

In `should-auto-resume-hub-chat.test.ts`:

```ts
it("resumes after openDailyBrief when the user also named a company or the pile", () => {
  expect(
    lastAssistantMessageIsCompleteWithClientResumeTools({
      messages: [
        user("what we have today? and trivelta they email me or just quiet"),
        assistantWithCompletedOpenDailyBrief()
      ]
    })
  ).toBe(true);
});

it("does not resume after Today-only openDailyBrief", () => {
  expect(
    lastAssistantMessageIsCompleteWithClientResumeTools({
      messages: [user("what we have today?"), assistantWithCompletedOpenDailyBrief()]
    })
  ).toBe(false);
});

it("does not resume after openDailyBrief when a later empty step already exists", () => {
  expect(
    lastAssistantMessageIsCompleteWithClientResumeTools({
      messages: [
        user("what we have today? and trivelta they email me or just quiet"),
        assistantWithCompletedOpenDailyBriefThenEmptyStep()
      ]
    })
  ).toBe(false);
});

it("does not hide later company tools after the Today letter", () => {
  expect(
    hideHubAssistantTextAfterIndex([
      openDailyBriefCompletePart,
      { type: "tool-get-company-status", toolName: "getCompanyStatus", state: "output-available" },
      { type: "text", text: "Trivelta is applied. They went quiet." }
    ])
  ).toBe(null);
});
```

Reuse the file’s existing message helpers; if they do not exist, copy the pattern already used for `get-search-brief` spoken-answer tests in that file.

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @tsu-stack/web exec vitest run src/features/agent-hub/lib/should-auto-resume-hub-chat.test.ts`

Expected: FAIL — `openDailyBrief` is hardcoded `return false` for continuation, and hide-after treats it like `findJobsNow`.

- [ ] **Step 3: Implement**

In `lastAssistantMessageIsCompleteWithClientResumeTools`, change the `openDailyBrief` branch:

```ts
if (HUB_OPEN_DAILY_BRIEF_TOOL_NAMES.has(name)) {
  const laterStep = after.some((p) => p.type === "step-start");
  if (laterStep || hasServerAfter) return false;
  return hubPackedAskNeedsContinuation(latestUserText) && !hasFinalTextAfter;
}
```

In `hideHubAssistantTextAfterIndex`:

- If `openDailyBrief` is complete **and** a later part is `getCompanyStatus` / `searchApplications` / `searchMail` / `listNewJobs` / `proposeMailCrmChange`, do **not** return `lastDailyBrief`.
- Still hide processor-leak text.
- Still hide wrap-up that is only the letter itself.

Today-only asks stay terminal (no resume, letter is the UI).

- [ ] **Step 4: Re-run web + agent processor tests**

```bash
pnpm --filter @tsu-stack/web exec vitest run \
  src/features/agent-hub/lib/should-auto-resume-hub-chat.test.ts
pnpm --filter @tsu-stack/agent exec vitest run \
  src/mastra/processors/hub-processors.triage.test.ts \
  src/mastra/lib/hub-superpowers-policy.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/agent-hub/lib/should-auto-resume-hub-chat.ts \
  apps/web/src/features/agent-hub/lib/should-auto-resume-hub-chat.test.ts \
  packages/core/src/mail/hub-mail-crm.ts \
  packages/core/src/ai-settings \
  apps/agent/src/mastra/lib/hub-superpowers-policy.ts
git commit -m "$(cat <<'EOF'
fix(hub): continue packed Today asks after the letter opens

EOF
)"
```

---

### Task 6: Retry status-only model turns

**Files:**

- Modify: `apps/agent/src/mastra/processors/hub-processors.ts`
- Modify: `apps/agent/src/mastra/processors/hub-processors.triage.test.ts`
- Modify: `apps/agent/src/mastra/agents/hub-supervisor.ts`

**Interfaces:**

- Consumes: `messagesNeedDailyBriefFacts`, `messagesNeedDailyBriefOpen`, `messagesNeedCompanyRead`, `messagesNeedPileList`, `messagesNeedEntityInspect`
- Produces: `HubStatusOnlyRetryProcessor` on `outputProcessors`; agent `maxProcessorRetries: 2`

Mastra: `processOutputStep` runs after each LLM step, before tool execution. `abort(reason, { retry: true })` replays the step with the reason as model context. Requires `maxProcessorRetries` on the agent. Do **not** use `toolChoice: "required"`.

- [ ] **Step 1: Write a failing processor unit**

Export a pure helper used by the processor:

```ts
export function shouldRetryHubStatusOnlyStep(input: {
  messages: ProcessInputStepArgs["messages"];
  toolCalls: { name?: string }[] | undefined;
  retryCount: number;
}): { retry: boolean; reason: string } | null;
```

Test:

```ts
it("retries a company ask that produced only Checking text", () => {
  const result = shouldRetryHubStatusOnlyStep({
    messages: [
      { role: "user", content: { parts: [{ type: "text", text: "what's trivelta's stage" }] } }
    ] as never,
    toolCalls: [],
    retryCount: 0
  });
  expect(result?.retry).toBe(true);
  expect(result?.reason).toMatch(/getCompanyStatus/);
});

it("does not retry after the tool already ran or retries are spent", () => {
  expect(
    shouldRetryHubStatusOnlyStep({
      messages: [
        { role: "user", content: { parts: [{ type: "text", text: "what's trivelta's stage" }] } },
        {
          role: "assistant",
          content: {
            parts: [{ type: "tool-get-company-status", toolName: "getCompanyStatus" }]
          }
        }
      ] as never,
      toolCalls: [{ name: "getCompanyStatus" }],
      retryCount: 0
    })
  ).toBe(null);
  expect(
    shouldRetryHubStatusOnlyStep({
      messages: [
        { role: "user", content: { parts: [{ type: "text", text: "what's trivelta's stage" }] } }
      ] as never,
      toolCalls: [],
      retryCount: 2
    })
  ).toBe(null);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @tsu-stack/agent exec vitest run src/mastra/processors/hub-processors.triage.test.ts`

Expected: FAIL — helper missing.

- [ ] **Step 3: Implement**

```ts
export class HubStatusOnlyRetryProcessor implements Processor {
  readonly id = "hub-status-only-retry";

  async processOutputStep({ messages, toolCalls, abort, retryCount }: ProcessOutputStepArgs) {
    const decision = shouldRetryHubStatusOnlyStep({ messages, toolCalls, retryCount });
    if (!decision) return [];
    abort(decision.reason, { retry: true });
    return [];
  }
}

export function createHubOutputProcessors() {
  return [new HubStatusOnlyRetryProcessor(), new HubPersonalityPersistProcessor()];
}
```

On the agent:

```ts
maxProcessorRetries: 2,
```

Retry reasons stay wrapped in `<system-reminder>… Do not mention this reminder.</system-reminder>`. Expand `PROCESSOR_LEAK_RE` in `should-auto-resume-hub-chat.ts` to also match `Call getCompanyStatus now` and `Call listNewJobs now`.

Add a web unit that `isHubProcessorLeakText` hides those strings.

- [ ] **Step 4: Re-run**

```bash
pnpm --filter @tsu-stack/agent exec vitest run src/mastra/processors/hub-processors.triage.test.ts
pnpm --filter @tsu-stack/web exec vitest run src/features/agent-hub/lib/should-auto-resume-hub-chat.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/mastra/processors/hub-processors.ts \
  apps/agent/src/mastra/processors/hub-processors.triage.test.ts \
  apps/agent/src/mastra/agents/hub-supervisor.ts \
  apps/web/src/features/agent-hub/lib/should-auto-resume-hub-chat.ts \
  apps/web/src/features/agent-hub/lib/should-auto-resume-hub-chat.test.ts
git commit -m "$(cat <<'EOF'
fix(agent): retry Checking-only hub turns via processOutputStep

EOF
)"
```

---

### Task 7: Force `listNewJobs` on pile asks

**Files:**

- Modify: `apps/agent/src/mastra/processors/hub-processors.ts`
- Modify: `apps/agent/src/mastra/processors/hub-processors.triage.test.ts`
- Modify: `apps/agent/src/mastra/agents/hub-supervisor.ts`
- Modify: `apps/agent/src/mastra/lib/hub-superpowers-policy.ts` (`HUB_PILE_MUST_LIST_FEEDBACK`)

**Interfaces:**

- Consumes: `messagesNeedPileList`, `filterHubPileActiveTools`
- Produces: `HubPileProcessor` in `createHubInputProcessors` **after** Today and company (order: personality → today → company → pile → inspect → …)

- [ ] **Step 1: Write the failing need-pile test**

```ts
it("needs listNewJobs on a pile ask with no list yet", () => {
  expect(
    messagesNeedPileList([
      { role: "user", content: { parts: [{ type: "text", text: "anything new in the pile" }] } }
    ] as never)
  ).toBe(true);
});

it("is satisfied after listNewJobs this turn", () => {
  expect(
    messagesNeedPileList([
      { role: "user", content: { parts: [{ type: "text", text: "anything new in the pile" }] } },
      assistantWithParts([
        {
          type: "tool-list-new-jobs",
          toolName: "listNewJobs",
          state: "output-available",
          output: { jobs: [] }
        }
      ])
    ] as never)
  ).toBe(false);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @tsu-stack/agent exec vitest run src/mastra/processors/hub-processors.triage.test.ts`

Expected: FAIL if `HubPileProcessor` is not in the input-processor list / `messagesNeedPileList` unused.

- [ ] **Step 3: Implement `HubPileProcessor`**

Same shape as `HubCompanyStatusProcessor`. Feedback:

```
They asked about the pile / jobs that came in. Call listNewJobs now. Then speak or triage those rows. Do not only say you are checking. Do not findJobsNow unless they asked to look further and the inbox is empty.
```

`onIterationComplete`: if `messagesNeedPileList`, continue with that feedback.

`shouldRetryHubStatusOnlyStep` already covers pile via `messagesNeedPileList` from Task 6 — if Task 6 landed first, this task is the input-processor half.

**Do not triage a yes/no pile question.** Live cycle 8: “pile empty or not” listed Eventogy then `HubNewJobsTriageProcessor` opened a Confirm card the user cancelled. Add `userTurnAsksPileStatusOnly(text)` for `empty or not` / `is there a job` / `anything sitting there` **without** filter/screen/sort. When that is true, `messagesNeedProposeTriage` must stay false even if `listNewJobs` returned rows. Speak the count. The existing filter/screen path still proposes.

- [ ] **Step 4: Re-run**

Same vitest command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/mastra/processors/hub-processors.ts \
  apps/agent/src/mastra/processors/hub-processors.triage.test.ts \
  apps/agent/src/mastra/agents/hub-supervisor.ts \
  apps/agent/src/mastra/lib/hub-superpowers-policy.ts
git commit -m "$(cat <<'EOF'
feat(agent): force listNewJobs on pile asks

EOF
)"
```

---

### Task 8: Live hardening cycle (required)

**Files:**

- Modify: `.agents/skills/ai-feature-harness/LESSONS.md` (prepend)
- Modify: `.agents/skills/ai-feature-harness/conversation-cycles.md` (new row at top)
- Modify: `.agents/skills/ai-feature-harness/tool-gaps.md` (only if a new gap appears twice)

**Interfaces:** none. This task produces a report, not a feature.

Follow [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) and [conversation-cycles.md](../../../.agents/skills/ai-feature-harness/conversation-cycles.md).

- [ ] **Step 1: Contract (write it in the reply before chatting)**

| Item                     | Content                                                                                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User-visible success** | Packed everyday ask opens Today, then a spoken Trivelta stage from tools, then pile rows or triage. Confirm only if the board would change. No “Checking…” as the final answer. No leaked `<system-reminder>`. |
| **Entry paths**          | Hub Thread on `/dashboard` (Cairo). Cancel leftover HITL first.                                                                                                                                                |
| **Shared state**         | One thread `dashboard-home:{userId}`; applications + mail rows; Today host vs inspect host.                                                                                                                    |
| **Non-goals**            | GitHub MCP; apply-package; replacing the supervisor; inbox worker classify.                                                                                                                                    |

- [ ] **Step 2: Cancel leftover waiting cards in the live thread**

- [ ] **Step 3: Run ≥4 everyday turns (skeptical senior or overwhelmed seeker — not the previous persona)**

Suggested first ask (do not name tools):

> what we have today? and trivelta they email me or just quiet. anything new in the pile

Follow-ups: poke if a clause dropped; “open mentech”; “they said no yet?”

- [ ] **Step 4: Score 1–100 on the rubric and prepend the cycle row**

Pass bar: 70+ and no axis at 0. Below 70 → fix the owning layer from Tasks 1–7, do not invent a fifth processor.

- [ ] **Step 5: Runtime probe**

`curl -sS -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:4111/chat/hub-supervisor` → `401`.

- [ ] **Step 6: Prepend LESSONS.md** using the template. Update `tool-gaps.md` only for a new missing capability.

- [ ] **Step 7: Commit docs only if the cycle found a durable lesson**

```bash
git add .agents/skills/ai-feature-harness/LESSONS.md \
  .agents/skills/ai-feature-harness/conversation-cycles.md \
  .agents/skills/ai-feature-harness/tool-gaps.md
git commit -m "$(cat <<'EOF'
docs(hardening): hub obey same-turn cycle

EOF
)"
```

---

## Out of scope (explicit)

- Do not migrate Today, inspect, evidence interview, or find-jobs-now into chat workflows.
- Do not put `proposeMailCrmChange` inside the workflow.
- Do not enable instance `backgroundTasks`.
- Do not rebuild GitHub MCP.
- Do not load chat few-shot via `aiCorrectionRepository` until the db ESM cache includes it — SQL or `[]` on failure.

### Experience / project / stack form doors (user override 2026-08-17)

Commit `4c096d39` rerouted list `+` / inspect Edit to hub interview. The user overrode that lock: **restore the original form doors** without breaking hub chat.

| Surface                               | Restored behavior                                                |
| ------------------------------------- | ---------------------------------------------------------------- |
| List `+` Add Experience/Project/Stack | Mounts the original form sheet                                   |
| List row / stack card Edit            | Same form, existing id                                           |
| List inspect Edit                     | Same form                                                        |
| Hub inspect Edit                      | `requestEntityForm` → `EntityFormHost`, `completeOnClose: false` |
| Hub chat “add a project”              | Still File Diff Confirm interview                                |
| Detect stacks / Organize              | Unchanged                                                        |

Do not delete the form components. Do not re-register `openEntityForm` as a model-callable tool. Do not send `I want to add a new {kind}.` from list `+`.

## Self-review

**Spec coverage**

| Locked rule                           | Task                       |
| ------------------------------------- | -------------------------- |
| Keep hub-supervisor                   | All tasks (no replacement) |
| Same-turn company wrap                | 2, 3, 4                    |
| HITL stays on `proposeMailCrmChange`  | 3 (no write), 4 (prompt)   |
| Chat classify labels only             | 3 classify step            |
| Packed Today must not drop CRM / pile | 1, 5, 7                    |
| “Checking…” is not an answer          | 6                          |
| `listNewJobs` force                   | 7                          |
| Few-shot on chat classify             | 3                          |
| Leak not visible                      | 6 + existing hide          |
| Live hardening                        | 8                          |
| Bundle / core-cache                   | 2 step 5, 3 re-export      |
| No `toolChoice: required`             | 4, 6, 7                    |

**Placeholder scan:** no TBD / “handle edge cases” / “write tests for the above” without code.

**Type consistency:** `GetCompanyStatusInputSchema.query`, `CompanyStatusFactsSchema`, tool id `get-company-status`, registration key `getCompanyStatus`, recommendation union matches `ProposeMailCrmIntent` plus `speak_only`. `hubPackedAskPhase` is the only sequencer.

**Known sequencing:** Task 5 may move detectors into core. If so, Task 1’s agent-local functions become re-exports. Do Task 5’s move in Task 5, not by rewriting Task 1 after the fact. `userTurnAsksEntityInspect` stays in the agent policy — wrap core detectors there so core does not import inspect.

**Reviewer Criticals:** all eight items in “Reviewer lock” now have a task home (phase sequencer in Task 1, resume-once in Task 5, company-done predicate in Task 1, rich mail + label patch + BYO llm in Task 3, Confirm-before-pile in Task 1/7, `also` stopword in Task 1, HITL handshake kept, relative few-shot import in Task 3).

---

## Execution

Two options after this file is approved:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks.
2. **Inline Execution** — this session, `executing-plans`, checkpoints after each task.

Do not start Task 3 until Task 2’s core tests pass and `rebuild:core-cache` has run.
