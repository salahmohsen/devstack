# Career Mail AI-First Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the AI-first Career Mail spine: unified `mail-process` workflow, hub supervisor parity, multi-source harvest AI path, CRM AI match/stage, purge deterministic judgment code.

**Architecture:** BullMQ schedules only. Mastra workflows own order; agents + skills own judgment. Schema/allow-list/monotonic rails only. Same agents/workflows on hubSupervisor and queues.

**Tech Stack:** Mastra agents/workflows/skills, BullMQ, `@tsu-stack/core` contracts, Drizzle apps, TanStack dashboard hub.

**Spec:** `docs/superpowers/specs/2026-08-04-career-mail-ai-first-pipeline-design.md`

**Skills:** `@mastra` skill + product skills under `apps/agent/skills/`; superpowers executing-plans / subagent-driven-development; verification-before-completion.

**Workspace:** Prefer `feature/career-mail-assistant-p0` worktree (has harvest); merge to main when phases land. Do not mix unrelated dirty main UI work.

---

## File map (P0–P1)

| Path                                                         | Responsibility                                          |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| `apps/agent/skills/**`                                       | Classification, harvest, CRM match, stage, write-skills |
| `apps/agent/src/mastra/skills-paths.ts`                      | Absolute skill paths                                    |
| `apps/agent/src/mastra/workflows/mail-process-workflow/`     | Unified entry                                           |
| `apps/agent/src/mastra/workflows/mail-classify-workflow/`    | AI classify only                                        |
| `apps/agent/src/mastra/workflows/mail-job-harvest-workflow/` | Extract/enrich/score                                    |
| `apps/agent/src/mastra/agents/*`                             | Specialists + hubSupervisor                             |
| `apps/agent/src/mastra/index.ts`                             | Register all                                            |
| `apps/server/src/queues/run-mail-classify.ts`                | Call process workflow; no regex fallback                |
| `apps/server/src/queues/apply-mail-crm-effect.ts`            | AI match/stage; no string match                         |
| `packages/core/src/mail/*`                                   | Contracts; remove/quarantine judgment helpers           |

---

### Task 1: Ensure skills + skill paths on agent package

**Files:**

- Ensure: `apps/agent/skills/{write-skills,mail-classification,job-notifier-harvest,job-preference-match}/`
- Create if missing: `crm-application-match`, `crm-stage-policy`
- Ensure: `apps/agent/src/mastra/skills-paths.ts`

- [ ] **Step 1:** Copy/align skills from worktree if main lacks them
- [ ] **Step 2:** Add CRM skill SKILL.md files (match + stage policy)
- [ ] **Step 3:** Export paths in `skills-paths.ts`
- [ ] **Step 4:** Commit `feat(agent): career mail skills tree for AI-first pipeline`

---

### Task 2: Wire agents with skills (classify, harvest, scorer, hub)

**Files:**

- Modify: mail-classifier, job-notifier extractor, job-preference scorer agents
- Modify: `hub-supervisor.ts` — register career agents + mail workflows
- Modify: `index.ts` registration

- [ ] **Step 1:** Classifier: skills + dynamic user-smart-filters
- [ ] **Step 2:** Extractor/scorer: harvest + match skills
- [ ] **Step 3:** Hub supervisor: agents + `mailClassifyWorkflow`, `mailJobHarvestWorkflow`, (later mail-process)
- [ ] **Step 4:** Commit

---

### Task 3: AI-only classify path (no keyword smart rules / heuristic)

**Files:**

- `mail-classify-workflow/ai.step.ts` (or equivalent)
- `run-mail-classify.ts`
- `packages/core/src/mail/classify.ts` — assemble labels from AI only

- [ ] **Step 1:** Classify output includes smartRuleSlugs; assemble via allow-list
- [ ] **Step 2:** Server: pass full smart rules; no `applySmartRulesToClassifyResult` keyword pass
- [ ] **Step 3:** Fail closed without BYO/agent
- [ ] **Step 4:** Commit

---

### Task 4: mail-process-workflow shell

**Files:**

- Create: `apps/agent/src/mastra/workflows/mail-process-workflow/`
- Modify: server enqueue to call process (or process calls classify internally)
- Register in index + hub

- [ ] **Step 1:** Input schema `{ messageId, userId, forceReprocess? }`
- [ ] **Step 2:** Steps: classify → branch hooks (CRM placeholder / harvest enqueue signal)
- [ ] **Step 3:** Hub can run workflow
- [ ] **Step 4:** Commit

---

### Task 5: CRM AI match + stage (P1)

**Files:**

- New agents + skills
- `apply-mail-crm-effect.ts`
- Remove `extractMailApplicationHints` / `resolveMailApplicationMatch` from hot path

- [ ] **Step 1:** Agents + skills
- [ ] **Step 2:** Server loads open apps, calls matcher AI, then stage AI, monotonic apply
- [ ] **Step 3:** Commit

---

### Task 6: Harvest multi-source AI-only (P2 polish)

**Files:**

- harvest workflow: no heuristic merge
- purge dead harvest helpers from core hot path
- `isValidHarvestedJob` schema-only

- [ ] **Step 1:** AI extract only
- [ ] **Step 2:** Remove/deprecate dead functions
- [ ] **Step 3:** Commit

---

### Task 7: Purge + grep gate

- [ ] **Step 1:** Delete or move to `__tests__/legacy` unused judgment regex modules
- [ ] **Step 2:** `rg` hot paths clean
- [ ] **Step 3:** Commit

---

### Task 8: Verification

- [ ] Agent boots with skills
- [ ] Hub lists career workflows/agents
- [ ] Classify + harvest path smoke (one real message if env allows)

---

## Execution

User requested **start implementation** immediately → execute Tasks 1–4 (P0) inline on career-mail worktree, then continue P1.
