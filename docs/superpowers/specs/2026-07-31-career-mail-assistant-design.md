# Career Mail Assistant — Design Lock

**Date:** 2026-07-31  
**Status:** **Locked** (high-recommendation set; user: lock only high recommended)  
**Map:** `.scratch/job-alert-mail-applications/map.md`  
**Related:** Career Inbox AI platform (2026-07-29), Applications CRM (2026-07-28)

---

## Product intent

Career Inbox is a **Career Mail Assistant**, not a job-only sorter and not a full Gmail clone.

```text
every mail
  → cheap prefilter + classify
  → noise            → demote (no notify)
  → needs action     → hub card + notify
  → job_notifier     → links → crawl → score prefs → Applications
  → career labels    → existing CRM / reply paths
```

Grounded on real Gmail corpus (≥200). Features must stay efficient on that mix (noise-heavy + LinkedIn digests).

---

## Frozen decisions (high recommended only)

### 1. Ingress source vs alert platform

| Concept            | Meaning                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| **MailProvider**   | `gmail` \| `resend` \| `manual` — already on `mail_message.provider`                                            |
| **JobAlertOrigin** | LinkedIn / Google / Indeed / … — derived at classify/extract time; map into `application.source` where possible |

**Lock:** Keep provider as-is. Do not overload provider with “linkedin”. Surface provider on list later as small fix (not P0-blocking).

### 2. Label / kind model

**Keep** system career labels: `application` | `recruiter` | `interview` | `offer`.

**Add** system labels (or classify kinds persisted as labels):

| Label                | Meaning                                                       |
| -------------------- | ------------------------------------------------------------- |
| `job_notifier`       | Board/job-alert digest promoting roles                        |
| `noise`              | Product noise, board marketing, non-career                    |
| `application_status` | “Application sent / update” — CRM path, **not** new job crawl |

**Needs action** is a **computed hub filter** (or denormalized flag), not only a label: message needs user action (reply, apply nudge, status confirm, jobs-ready batch).

**Lock:**

- **Needs action** = first-class hub card
- **Noise** = system hub card driven by `noise` label (not smart-rule-only)
- Smart rules remain for user custom buckets

### 3. Pipeline architecture

**Lock:**

1. Classify runs on every new mail (idempotent; skip if already classified unless re-run).
2. Cheap prefilter before LLM (sender domain denylist/allow patterns from corpus).
3. After `job_notifier`: **separate job-harvest queue/workflow** (not inline forever in classify).
4. Multi-job digest → **N Applications** (one per job link / job id).
5. Dedup: canonical listing URL or board job id per tenant.
6. Crawl: Mastra **orchestrates**; tool default = **HTTP fetch + extract**, not web search. Browser/search only as fallback (P1+).
7. Origin-specific unwrap (Google redirect, Indeed `jk`, LinkedIn `/jobs/view/{id}`) as optimisations on generic link extract.

### 4. Job preferences + match %

**Lock:** Re-open `job_preference` (deferred in Applications CRM v1).

| Item                        | Decision                                                                    |
| --------------------------- | --------------------------------------------------------------------------- |
| Shape                       | One active profile per user                                                 |
| Work modes                  | Multi-select: `remote` \| `hybrid` \| `onsite` (UI: On-site)                |
| Also                        | locations[], roleKeywords[], excludeKeywords[], optional salaryMin+currency |
| `minMatchScore`             | Default **60**                                                              |
| Below threshold (auto path) | **Hard skip** — no Application row                                          |
| Manual create               | **Unrestricted** (no pref filter)                                           |
| Application                 | `matchScore` 0–100 nullable; optional breakdown later                       |

### 5. Apply method + dual URLs

**Lock:**

| Field         | Decision                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------- |
| `url`         | Listing / source URL (LinkedIn etc.) — keep column name                                      |
| `applyUrl`    | External apply destination; null if Easy Apply / unknown                                     |
| `applyMethod` | `easy_apply` \| `external` \| `email` \| `unknown`                                           |
| Badges        | Derived from enum                                                                            |
| Primary CTA   | external+applyUrl → applyUrl; easy_apply → url; email → email path; else url                 |
| Auto-apply    | **Only** `applyMethod === email` with recruiter address (v1 composition can be Assist draft) |
| ATS form bots | **Out of scope**                                                                             |

### 6. Notifications (sparse)

**Notify (app bell ± email channel):**

| Kind                    | When                                                   |
| ----------------------- | ------------------------------------------------------ |
| `mail.needs_action`     | Recruiter/interview/offer or explicit action           |
| `mail.apply_nudge`      | Saved/expiring apply nudge                             |
| `mail.job_alerts_ready` | Batch: N apps created from a digest (“3 of 8 matched”) |
| Review draft ready      | Existing                                               |

**Do not notify:** noise filed, each link crawl step, below-threshold skips.

### 7. UI integration

**Lock:** Extend existing Career Inbox shell (hub cards, island, list/reader, Review, Applications, Settings). No second mail app.

| Surface      | P0+ expectation                                                    |
| ------------ | ------------------------------------------------------------------ |
| Hub          | Needs action, Noise, existing career cards, Unsorted, All          |
| List row     | Action chip + short “Why” when classified                          |
| Reader       | Assistant strip (label, harvest status, CTAs)                      |
| Applications | Match % badge; Easy Apply / External badges; listing + apply links |
| Settings     | **Jobs** prefs; AI autonomy for classify/harvest                   |

### 8. Explicitly deferred (not locked now)

- Agent-chat job submit
- Full auto-send email apply composition polish
- Product Gmail backfill depth number (script already can pull 200)
- Match score weight tuning / LLM scoring
- Headless browser crawl
- Soft-save low-match applications
- Multiple preference profiles

---

## Domain pipeline (canonical)

```text
Ingress (gmail | resend)
  → mail_message
  → classify queue → labels + needsAction?
       ├─ noise → hub Noise
       ├─ application_status → CRM effect (existing path)
       ├─ recruiter | interview | offer | application → CRM / reply as today
       └─ job_notifier → harvest queue
              → extract links → fetch+extract each
              → score vs job_preference
              → if ≥ minMatchScore: Application {
                    stage: saved,
                    url, applyUrl, applyMethod,
                    matchScore, source, …
                 }
              → batch notify job_alerts_ready
```

---

## Eval fixtures (from real corpus — required for quality)

| Fixture                                | Expected                        |
| -------------------------------------- | ------------------------------- |
| LinkedIn `jobalerts-noreply` multi-job | job_notifier → N scored apps    |
| LinkedIn “application was sent”        | application_status — no harvest |
| Google `notify-noreply` job alert      | job_notifier + unwrap redirects |
| Wuzzuf profile marketing               | noise                           |
| OpenAI/GitHub/Airbnb product mail      | noise                           |
| Apply nudge / expiring                 | needs_action apply_nudge        |

---

## Implementation phasing

| Phase  | Scope                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------ |
| **P0** | Labels + classify routing + Needs action/Noise hub + notify kinds + schema (prefs, matchScore, apply fields) |
| **P1** | Job harvest workflow (extract, fetch, score, create apps) + Applications UI badges                           |
| **P2** | Settings Jobs UI polish, mute sender, backfill depth, eval scorers                                           |

---

## Success criteria

1. Noise-heavy inbox does not dominate Needs action or notifications.
2. Job digests become **matching** Applications with match % and apply kind.
3. User always sees correct **listing** vs **apply** link.
4. Corrections improve classify over time (existing learning path).
5. No second mail product; one Career OS surface.
