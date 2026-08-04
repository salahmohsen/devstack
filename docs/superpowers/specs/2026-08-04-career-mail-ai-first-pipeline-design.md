# Career Mail AI-First Pipeline — Design

**Date:** 2026-08-04  
**Status:** Draft for review (brainstorm locked)  
**Goal:** Refactor Career Inbox mail, CRM application effects, and job extraction/harvest into a single **AI-first** spine: higher **accuracy**, tokens allowed to rise, **no content-judgment regex / deterministic matchers**, and all capabilities available from the **dashboard Hub Supervisor**.

**Related:**

- [Career Inbox + AI platform](./2026-07-29-career-inbox-ai-platform-design.md)
- [Career Mail Assistant](./2026-07-31-career-mail-assistant-design.md)
- [Seeker Applications CRM](./2026-07-28-seeker-applications-crm-design.md)

**Supersedes (judgment layers only):** Cheap prefilter / keyword smart rules / regex digest detection as product authorities. Schema enums and monotonic CRM rails remain.

---

## Product intent

Career Mail should behave as one system:

```text
every career mail
  → AI classify (+ user smart filters)
  → either Applications CRM effects
     or multi-source job harvest → Applications rows
  → same logic runnable from queues OR /dashboard hub chat
```

**Primary success criterion:** accuracy (correct labels, correct app links/stages, correct multi-source job extraction).  
**Non-goals for efficiency:** minimizing tokens is not a constraint for this epic.

---

## Frozen decisions (grill log)

| #   | Topic          | Decision                                                                                                                          |
| --- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Primary metric | **Accuracy** over latency/cost                                                                                                    |
| 2   | Scope          | **Full spine** + **purge** leftover deterministic judgment code in core                                                           |
| 3   | Architecture   | **Unified mail-process workflow** (Approach A)                                                                                    |
| 4   | Hub            | **All career AI** registered on `hubSupervisor` — same agents/workflows as automation                                             |
| 5   | Safety rails   | **Schema + policy only**: Zod, system label/stage enums, smart-filter slug allow-list, monotonic stage, basic `http(s)` URL parse |
| 6   | URL handling   | **Not** LinkedIn-only canonicalize/rank heuristics; multi-source / unknown notifiers; **AI** selects listing + apply URLs         |
| 7   | Smart filters  | Injected per run as **dynamic skill + prompt**; AI assigns `rule:{slug}`; no keyword includes()                                   |
| 8   | Failures       | **No regex fallback** when AI/BYO missing — leave unlabeled / log hard                                                            |

---

## Architecture

### Principle

| Layer                      | Owns                                                                     |
| -------------------------- | ------------------------------------------------------------------------ |
| BullMQ                     | Schedule only (`mail-process` job)                                       |
| Mastra **workflows**       | Ordered, idempotent pipelines                                            |
| Mastra **agents + skills** | All judgment                                                             |
| Hub Supervisor             | Interactive face of the same registrations                               |
| Server / `@tsu-stack/core` | Persist, contracts, allow-lists, monotonic stage — **not** content regex |

### Mastra guidance (aligned)

- **Workflow** owns sequence and “done.”
- **Agent** owns open-ended judgment (labels, match, extract, score).
- **Tools** for strict I/O (e.g. HTTP fetch page text), not “is this a job?”
- **Skills** for progressive disclosure of domain rules (`apps/agent/skills/`).

### Spine

```text
mail_message
  → mail-process-workflow
       1. Load: mail, enabled smart filters, few-shot corrections, job prefs
       2. AI classify → systemLabels + rule:{slug}
       3. Branch:
          · job_notifier → harvest sub-flow
          · CRM labels   → match/create app AI → stage AI → monotonic apply → audit
          · noise/empty  → labels only
       4. Sparse notifications (existing kinds)
```

**Harvest sub-flow:**

```text
AI extract jobs (body + HTML, any source)
  → for each listing (bounded):
       optional fetch-job-page tool + AI enrich (title, company, applyUrl, applyMethod, …)
       AI score vs job_preference
       if passed → insert Application (stage saved, matchScore, urls, …)
  → optional batch notify job_alerts_ready
```

### Hub parity

| Surface               | Behavior                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| Ingress / queue       | `enqueueMailProcess({ messageId, userId, forceReprocess? })`             |
| `/dashboard` hub chat | Same workflow + agents as tools; e.g. reprocess, harvest, explain labels |

**Do not** implement a second classify/harvest path in the web app.

---

## Components

### Workflows

| Id                      | Role                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `mail-process-workflow` | Single entry per message                                       |
| `mail-job-harvest`      | Nested or follow-on extract → enrich → score → writes          |
| Reply                   | Step or thin workflow on CRM branch when product wants a draft |

### Agents + skills

| Agent                         | Skills / tools                                                             |
| ----------------------------- | -------------------------------------------------------------------------- |
| `mailClassifier`              | `mail-classification` + dynamic `user-smart-filters`                       |
| `crmApplicationMatcher` (new) | skill: match or create application from mail + open apps                   |
| `crmStageAdvisor` (new)       | skill: propose stage/outcome; code applies monotonic rail                  |
| `jobNotifierExtractor`        | multi-source harvest skill (any notifier)                                  |
| `jobPageEnricher`             | `fetch-job-page` + AI structured fields/URLs                               |
| `jobPreferenceScorer`         | `job-preference-match`                                                     |
| `mailReply`                   | reply skill; **no** heuristic success path                                 |
| `hubSupervisor`               | **all** career agents + `mail-process` (+ existing stack agents/workflows) |

### Shared skills tree

```text
apps/agent/skills/
  write-skills/              # meta authoring
  mail-classification/
  job-notifier-harvest/      # multi-source
  job-preference-match/
  crm-application-match/     # new
  crm-stage-policy/          # new (allowed transitions; AI proposes)
  mail-reply/                # new or extend agent instructions
```

Dynamic skill each classify run: `user-smart-filters` from tenant `mail_smart_rule` rows (title, description, keywords as **semantic hints only**).

### Hub product tools (minimum)

- List/get mail; list applications; get job prefs
- Run `mail-process` / force reprocess by `messageId`
- Optional: run harvest-only when already labeled `job_notifier`

---

## Data contracts (AI I/O)

### Classify output (AI)

- `systemLabel`: one of system enum or null
- `smartRuleSlugs`: zero or more **allowed** tenant slugs
- `confidence`, `reason`

Server assembles `labels = system + rule:{slug}` via allow-list only (anti-invention), **not** keyword rematch.

### Harvest job (AI)

- `listingUrl` (required `http(s)` after Zod/`URL` parse)
- `title`, `companyName`, optional location, salary, description
- `applyUrl`, `applyMethod`, `workMode`, `source` (when known)

No domain-specific rank tables. AI chooses the best listing URL from the mail for unknown sources.

### CRM match (AI)

- `kind`: match_existing | create_new | skip
- `applicationId?`, `companyName`, `title`, `reason`

### Stage proposal (AI)

- `targetStage?`, `targetOutcome?`, `reason`
- Code: only apply if monotonic advance (or product-defined terminal outcome rules)

---

## Explicit removals (judgment)

Delete or quarantine to tests-only (must not be imported from server/agent hot paths):

| Area          | Examples                                                                                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classify      | `heuristicClassifyMail`, `isJobAlertDigestMail`, `isNoiseMail`, `suppressCareerLabelsForJobAlertDigest`                                                                                                                      |
| Smart filters | `matchSmartRuleLabels` keyword includes; production use of `applySmartRulesToClassifyResult`                                                                                                                                 |
| CRM           | `extractMailApplicationHints`, `resolveMailApplicationMatch` string match                                                                                                                                                    |
| Harvest       | `harvestJobsFromMailBody/HtmlAnchors`, `extractJobListingUrls`, `isLikelyJobListingUrl`, `rankJobUrl`, LinkedIn-only canonicalize logic as **judgment**, `scoreJobAgainstPreference` rules scorer, garbage-title regex gates |
| Reply         | `heuristicMailReplyDraft` as success path                                                                                                                                                                                    |

**Allowed residual deterministic code:** Zod schemas, enum membership, smart-filter slug allow-list, monotonic stage rank, `new URL()` / `http(s)` check, HTML strip for fetch tool I/O prep (not “is job”).

---

## Idempotency & errors

| Concern             | Rule                                               |
| ------------------- | -------------------------------------------------- |
| Classify            | Skip if `classifiedAt` set unless `forceReprocess` |
| Harvest             | Dedup Applications by tenant + listing URL         |
| CRM                 | One active `mail_crm_apply` per message            |
| No BYO / agent down | No regex fallback; unlabeled; hard log             |
| Partial harvest     | Persist successes; log low-match / enrich failures |
| Hub                 | Surface workflow/tool errors plainly in chat       |

---

## Phasing

| Phase  | Deliverable                                                                                  |
| ------ | -------------------------------------------------------------------------------------------- |
| **P0** | `mail-process` shell; hub registers career agents/workflows; **purge** dead judgment modules |
| **P1** | CRM AI match/create + stage advisor; remove string-match CRM                                 |
| **P2** | Harvest multi-source AI-only extract/enrich/score; drop domain URL catalogs                  |
| **P3** | Reply AI-only                                                                                |
| **P4** | Hub tools (reprocess, explain), notify polish, redacted eval fixtures                        |

Implementation plans should follow this order; architecture is one spine.

---

## Verification

1. Redacted corpus fixtures through AI classify (including smart-filter injection).
2. Multi-source digests (LinkedIn, Jack & Jill, unknown HTML notifiers) through harvest without domain regex.
3. Hub “reprocess this message” produces the same DB effects as the queue.
4. Grep/CI gate: no new content-judgment regex on mail/CRM/harvest hot paths.
5. Mastra Studio: hub can invoke `mail-process` and specialists.

---

## Out of scope

- ATS form bots / auto-apply forms
- Soft-save below-threshold applications (unless later product lock)
- Multiple concurrent job preference profiles
- Headless browser crawl as default (HTTP fetch tool remains default)

---

## Migration notes

- Existing labels/apps remain; reprocess is opt-in (`forceReprocess`) or ops scripts that call **AI** workflows only.
- Feature work currently on `feature/career-mail-assistant-p0` should converge to this spine on main (or merge worktree then implement phases).
- Update hub supervisor instructions: remove “career on roadmap” — wire real agents/workflows.

---

## Open product defaults (locked for implementers)

| Topic                                  | Default                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| Parallel page enrich                   | Prefer sequential first for simplicity; optional parallel later with same AI step   |
| Create app when CRM AI says create_new | Yes, with notes attribution to message id                                           |
| Stage map as soft prior                | Skill may list preferred label→stage defaults; AI may deviate; code still monotonic |

---

## References

- [Mastra agents vs workflows](https://mastra.ai/docs) — workflow owns order; agent owns judgment
- [Mastra agent skills](https://mastra.ai/docs/agents/skills) / [workspace skills](https://mastra.ai/docs/workspace/skills)
- Product skills under `apps/agent/skills/` on career-mail worktree (to land on main with P0)
