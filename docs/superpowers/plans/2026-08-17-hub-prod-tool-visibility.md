# Hub production tool visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Production hub stack asks actually call `listStacks`, paint a catalog, and stop crashing apply-package skill extract.

**Architecture:** Core detector + supervisor processor (Today/inspect pattern). Web hides prelude text and registers a standalone stack catalog tool UI. Agent Activity stays expanded on the latest message. Job-skill LLM schema is loose; sanitize remains the gate.

**Tech Stack:** TypeScript, Vitest, Mastra processors, assistant-ui toolkit, Zod

**Spec:** [2026-08-17-hub-prod-tool-visibility-design.md](../specs/2026-08-17-hub-prod-tool-visibility-design.md)

**Post-implement:** [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md)

---

### Task 1: Stack-catalog ask detector (core)

**Files:**

- Create: `packages/core/src/hub/stack-catalog-ask.ts`
- Create: `packages/core/src/hub/__tests__/stack-catalog-ask.test.ts`
- Modify: `packages/core/src/hub/index.ts`

- [ ] **Step 1: Write failing tests** for everyday stack/skill asks, retries (“you didn’t pull”), and non-asks (Today, inspect, organize).
- [ ] **Step 2: Run** `pnpm --filter @tsu-stack/core test -- src/hub/__tests__/stack-catalog-ask.test.ts` — fail (module missing).
- [ ] **Step 3: Implement** `userTurnAsksStackCatalog` + `userTurnRetriesStackCatalog`.
- [ ] **Step 4: Re-run tests** — pass.

### Task 2: Force `listStacks` this turn (agent)

**Files:**

- Modify: `apps/agent/src/mastra/lib/hub-superpowers-policy.ts`
- Modify: `apps/agent/src/mastra/lib/hub-superpowers-policy.test.ts`
- Modify: `apps/agent/src/mastra/processors/hub-processors.ts`
- Modify: `apps/agent/src/mastra/processors/hub-processors.triage.test.ts`
- Modify: `apps/agent/src/mastra/agents/hub-supervisor.ts`

- [ ] **Step 1: Write failing tests** for `messagesNeedListStacks` / `shouldStopAfterStackCatalog` / processor id order.
- [ ] **Step 2: Run agent tests** — fail.
- [ ] **Step 3: Implement** policy helpers, `HubStackCatalogProcessor`, `onIterationComplete` continue/stop.
- [ ] **Step 4: Re-run** — pass.

### Task 3: Hide promised-catalog prelude (web)

**Files:**

- Modify: `apps/web/src/features/agent-hub/lib/should-auto-resume-hub-chat.ts`
- Modify: `apps/web/src/features/agent-hub/lib/should-auto-resume-hub-chat.test.ts`
- Modify: `apps/web/src/features/agent-hub/ui/hub-assistant-message.tsx`

- [ ] **Step 1: Write failing tests** for `isHubPromisedCatalogText`.
- [ ] **Step 2: Run** — fail.
- [ ] **Step 3: Implement hide + wire `shouldHideTextPart`.**
- [ ] **Step 4: Re-run** — pass.

### Task 4: Standalone stack catalog UI + latest activity open

**Files:**

- Create: `apps/web/src/features/agent-hub/lib/stack-catalog.ts`
- Create: `apps/web/src/features/agent-hub/lib/stack-catalog.test.ts`
- Create: `apps/web/src/features/agent-hub/ui/stack-catalog-tool-ui.tsx`
- Modify: `apps/web/src/features/agent-hub/ui/hub-assistant-toolkit.tsx`
- Modify: `apps/web/src/features/agent-hub/ui/hub-agent-activity.tsx`
- Modify: `apps/web/src/features/agent-hub/lib/hub-agent-activity.test.ts`

- [ ] **Step 1: Write failing parse + activity-collapse tests.**
- [ ] **Step 2: Run** — fail.
- [ ] **Step 3: Implement parser, chip catalog, toolkit keys (`listStacks` / `list-stacks`), `collapseOnComplete={!isLastMessage}`.**
- [ ] **Step 4: Re-run** — pass.

### Task 5: Loose job-skill LLM schema

**Files:**

- Modify: `packages/core/src/application/job-skills.ts`
- Modify: `packages/core/src/application/__tests__/job-skills.test.ts`

- [ ] **Step 1: Write failing tests** — payload parse without `band`; sanitize maps must-have / nice-to-have; still drops `maybe`.
- [ ] **Step 2: Run** — fail.
- [ ] **Step 3: Loosen payload schema; default/map in sanitize.**
- [ ] **Step 4: Re-run** — pass.

### Task 6: Verify

- [ ] `pnpm --filter @tsu-stack/core test -- src/hub/__tests__/stack-catalog-ask.test.ts src/application/__tests__/job-skills.test.ts`
- [ ] `pnpm --filter @tsu-stack/agent test -- src/mastra/lib/hub-superpowers-policy.test.ts src/mastra/processors/hub-processors.triage.test.ts`
- [ ] `pnpm --filter @tsu-stack/web test -- src/features/agent-hub/lib/should-auto-resume-hub-chat.test.ts src/features/agent-hub/lib/stack-catalog.test.ts src/features/agent-hub/lib/hub-agent-activity.test.ts`
- [ ] Harden report + any extra LESSONS
