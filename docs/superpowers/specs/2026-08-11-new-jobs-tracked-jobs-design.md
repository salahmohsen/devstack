# New jobs + Tracked jobs — Design

**Date:** 2026-08-11  
**Status:** Accepted (product decisions locked; ready for implementation plan)  
**Goal:** Split AI job **discovery** (mail harvest inbox) from the seeker **pipeline CRM**, with a first-class **agent’s take**, multi-note **activity timeline**, and clear promote/dismiss/package actions.

**Related**

- [Seeker Applications CRM](./2026-07-28-seeker-applications-crm-design.md)
- [Career Mail Assistant P0](./2026-07-31-career-mail-assistant-design.md)
- [Career mail AI-first pipeline](./2026-08-04-career-mail-ai-first-pipeline-design.md)
- [Application apply package](./2026-08-04-application-apply-package-design.md)
- ADR-0024 stages + outcomes

---

## Problem

1. Mail **job harvest** inserts applications at `stage=saved` mixed with manual saves and hub creates — no discovery inbox.
2. “Why this job” exists only as `matchReasons` mashed into a single `notes` string (`AI harvest from mail…`).
3. **Notes** are one text blob — not multi-comment + system events like a modern activity feed.
4. Product language “Applications” does not distinguish **new matches** vs **pipeline tracking**.

---

## Product decisions (locked)

| #   | Topic               | Decision                                                                                                                                                              |
| --- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Inbox model         | **`trackingStatus`**: `inbox` \| `tracked` \| `dismissed`. Pipeline **stages** apply only when **tracked**.                                                           |
| 2   | Nav IA              | **Separate sidebar items** — not tabs on one page.                                                                                                                    |
| 3   | Rename              | **Applications → Tracked jobs** (`/dashboard/tracked-jobs`). **Delete** route `/dashboard/applications` entirely (no redirect).                                       |
| 4   | New surface         | **New jobs** (`/dashboard/new-jobs`) — AI discoveries awaiting decision.                                                                                              |
| 5   | New jobs actions    | **Track** · **Track & package** as **Button Group**; **Dismiss** separate **destructive**; all icons use **icon-motion** (see UI section).                            |
| 6   | Dismiss             | Soft archive `dismissed`; row kept for URL dedup; not on Tracked board. **Recoverable** via New jobs → filter/subview **Dismissed** (not a third sidebar item in v1). |
| 7   | Agent’s take        | Generated **at harvest** (with score); 1–3 sentences; soft-fail if take fails.                                                                                        |
| 8   | Activity            | Unified **`application_activity`** (`note` + system kinds).                                                                                                           |
| 9   | CRM status mail     | Creates/updates **tracked** only — not New jobs.                                                                                                                      |
| 10  | Manual / hub create | Default **`tracked`** + stage `saved`.                                                                                                                                |
| 11  | Harvest create      | **`inbox`** + stage `saved` + `matchScore` + `agentTake` + provenance + **source tags**.                                                                              |
| 12  | Historical rows     | Migrate existing apps → **`tracked`** (no inbox flood).                                                                                                               |
| 13  | Low match           | Still hard-skip below `minMatchScore` (no soft-save in this epic).                                                                                                    |
| 14  | Source tags         | Multi-tag chips per job: **channel** (how found) + **platform** (listing host). Extensible for future discovery sources.                                              |

---

## Information architecture

```text
Dashboard sidebar (Dashboard group)
  …
  New jobs          → /dashboard/new-jobs
  Tracked jobs      → /dashboard/tracked-jobs   (was Applications)
  …
```

| Route                     | Purpose         | Primary UI                        |
| ------------------------- | --------------- | --------------------------------- |
| `/dashboard/new-jobs`     | Discovery inbox | List/cards + agent take + actions |
| `/dashboard/tracked-jobs` | Pipeline CRM    | Board + list (existing)           |

**Remove completely:** `/dashboard/applications` (and nested route tree under that path). No redirect, no alias — old bookmarks 404 (or app global 404). Update every internal link.

Deep links / notifications: harvest ready → `/dashboard/new-jobs` (not tracked).

---

## Domain model

### `application.trackingStatus`

```ts
applicationTrackingStatusEnum = ["inbox", "tracked", "dismissed"] as const;
```

| Value       | Meaning                 | Board                   | New jobs list                                                     |
| ----------- | ----------------------- | ----------------------- | ----------------------------------------------------------------- |
| `inbox`     | Unreviewed discovery    | Hidden                  | Shown                                                             |
| `tracked`   | User is tracking        | Open rows on board/list | Hidden                                                            |
| `dismissed` | Soft-rejected discovery | Hidden                  | Hidden from default inbox; **visible under New jobs → Dismissed** |

**Stages** (`saved` → … → `offer`) and **outcomes** unchanged (ADR-0024).

The `stage` column remains **NOT NULL** on all rows (inbox/dismissed keep `saved` as storage default). **Pipeline semantics** (board columns, drag, monotonic CRM stage rails, `updateStage`) apply **only** when `trackingStatus = tracked`.

### Open pipeline set (critical)

**Open tracked** (board, list “open”, CRM matcher candidates, hub `list-open-applications`):

```text
trackingStatus = 'tracked' AND outcome IS NULL
```

| Consumer                                 | Must use open-tracked |
| ---------------------------------------- | --------------------- |
| Tracked board / list open filter         | Yes                   |
| `applicationRepository.findOpenByUserId` | Yes (update query)    |
| CRM `crmApplicationMatcher` open list    | Yes                   |
| Hub tool `list-open-applications`        | Yes                   |
| Stage rails / package accept stage bump  | Only if tracked       |

**CRM `match_existing`:** if AI returns a non-tracked id, **promote to tracked first** then apply stage (user got real apply/status mail for that listing). Never stage-mutate pure inbox/dismissed without promote.

**CRM create:** always pass **`trackingStatus: tracked` explicitly** (do not rely only on DB default).

### `trackingStatus` transitions (v1)

| From → To                         | Allowed                                                                                 | Side effects                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `inbox` → `tracked`               | `promote` / Track & package                                                             | activity `promoted`                                                                    |
| `inbox` → `dismissed`             | `dismiss`                                                                               | activity `dismissed`                                                                   |
| `tracked` → `inbox` / `dismissed` | **No** in v1                                                                            | Close tracked via **outcome** (ADR-0024)                                               |
| `dismissed` → `tracked`           | **Yes** — **Track** / **Track & package** from Dismissed view                           | activity `promoted` (metadata: `{ from: "dismissed" }`)                                |
| `dismissed` → `inbox`             | **Yes** — **Restore to New jobs** (undo dismiss)                                        | activity optional `restored` or reuse `promoted`-style with metadata `{ to: "inbox" }` |
| Already `tracked` + promote       | Idempotent OK                                                                           | no-op or soft success                                                                  |
| Already `dismissed` + dismiss     | Idempotent OK                                                                           | —                                                                                      |
| `updateStage` / `setOutcome`      | **Only** if `tracked` (and open rules as today)                                         | activity events                                                                        |
| Hard delete                       | Allowed when UI/API exposes it (tracked today; optional on dismissed); CASCADE activity | —                                                                                      |

**Dismissed recovery actions (from Dismissed view)**

| Action                          | Effect                                                |
| ------------------------------- | ----------------------------------------------------- |
| **Restore**                     | `dismissed` → `inbox` (back on New jobs default list) |
| **Track** / **Track & package** | `dismissed` → `tracked` (+ package HITL if package)   |
| Optional later                  | Hard delete                                           |

### URL dedup / `createIfAbsentByUrl` conflict policy

Unique `(userId, url)` where url not null remains.

| Caller                  | Existing row   | Behavior                                                                                   |
| ----------------------- | -------------- | ------------------------------------------------------------------------------------------ |
| **Harvest**             | any status     | `created: false` — do not overwrite take/status                                            |
| **Hub / manual create** | `inbox`        | **Promote to tracked** (merge non-empty fields if product wants); treat as success tracked |
| **Hub / manual create** | `dismissed`    | **Promote to tracked** (intentional save beats prior dismiss)                              |
| **Hub / manual create** | `tracked`      | return existing (current conflict behavior)                                                |
| **CRM create**          | usually no URL | insert with `tracked`; if URL ever set, same as hub promote rules                          |

### New / updated columns on `application`

| Column            | Type                         | Notes                                        |
| ----------------- | ---------------------------- | -------------------------------------------- |
| `trackingStatus`  | enum NOT NULL                | Default `tracked` for back-compat migrations |
| `agentTake`       | text null                    | 1–3 sentence narrative fit                   |
| `sourceMessageId` | text null                    | Optional FK → `mail_message.id` (SET NULL)   |
| `sourceTags`      | text[] NOT NULL default `{}` | Multi source chips (see below)               |

**Legacy `source` (single enum):** keep for one release as **primary platform** mirror of the first platform tag (or `null`). New writes always set `sourceTags`; optional sync `source` from platform tag for old UI. Prefer reading **`sourceTags`** everywhere new.

**`notes` column:** harvest **must not** write the old `AI harvest from mail…` template. After Activity UI ships, **new user notes → `application_activity` only**; form/sheet freeform `notes` becomes legacy (read or hidden). Optional migrate later.

Keep `matchScore` as numeric badge.

**`matchReasons`:** store on `discovered` activity metadata (`matchReasons: string[]`); do not re-stuff into `notes`. Optional later UI chips; not required for v1 card (agent take is primary).

Indexes: existing `(userId)`, `(userId, stage)`; **add** `(userId, trackingStatus)` (and activity indexes below). Optional GIN on `sourceTags` if filtering by tag later.

### Source tags (multi)

Jobs often have **two axes** of provenance:

| Axis         | Meaning                   | Examples                                                      |
| ------------ | ------------------------- | ------------------------------------------------------------- |
| **Channel**  | How we discovered the job | `mail`, `hub`, `manual`, later `extension`, `rss`, `api`      |
| **Platform** | Where the listing lives   | `linkedin`, `indeed`, `company_website`, `glassdoor`, `other` |

**Storage:** one column `sourceTags: text[]` of allowlisted slugs (both axes in one set).  
**UI:** chips on New jobs cards and detail (and Tracked if present).

#### Allowlist (v1 + reserved)

```ts
// Channel
"mail" | "hub" | "manual";
// Platform (align with ApplicationSource enum)
"linkedin" | "indeed" | "company_website" | "referral" | "recruiter" | "other";
// Future channels (reserved names, not required in v1)
// "extension" | "rss" | "api" | "import"
```

Unknown tags rejected at write (Zod). Display labels: title-case / map (`company_website` → “Company site”).

#### Write rules by path

| Path                      | Tags written                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Mail job harvest**      | Always **`mail`** + platform from `inferApplicationSource(listingUrl, fromEmail)` e.g. LinkedIn alert → `["mail", "linkedin"]` |
| **Hub create** (JD paste) | **`hub`** + optional platform if URL known                                                                                     |
| **Manual sheet**          | **`manual`** + optional platform if user/URL implies                                                                           |
| **CRM mail create**       | **`mail`** + **`recruiter`** or **`other`** (status mail, not harvest)                                                         |

#### Examples

| Discovery                             | `sourceTags`              |
| ------------------------------------- | ------------------------- |
| LinkedIn weekly jobs email → harvest  | `mail`, `linkedin`        |
| Indeed digest email                   | `mail`, `indeed`          |
| Greenhouse link in email              | `mail`, `company_website` |
| Hub propose-from-JD with LinkedIn URL | `hub`, `linkedin`         |
| Manual add without URL                | `manual`                  |
| Later: browser extension on LinkedIn  | `extension`, `linkedin`   |

#### Dedup / merge (future)

If the same URL is seen again from a new channel, v1 harvest still `created: false`. Later: optional **tag union** on existing row without changing `trackingStatus` (out of scope unless cheap).

### `application_activity`

| Column          | Type            | Notes                                                            |
| --------------- | --------------- | ---------------------------------------------------------------- |
| `id`            | text PK         | UUID                                                             |
| `userId`        | text FK         | Tenant                                                           |
| `applicationId` | text FK CASCADE | Parent app                                                       |
| `kind`          | enum            | See below                                                        |
| `body`          | text null       | Note text; optional                                              |
| `metadata`      | jsonb           | `{ fromStage, toStage, matchScore, matchReasons, messageId, … }` |
| `actorUserId`   | text null       | Null = system / AI                                               |
| `createdAt`     | timestamptz     | Timeline order                                                   |

**Kinds (v1)**

| kind                | When                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `discovered`        | Harvest create                                                                               |
| `promoted`          | Track / Track & package / hub promote-on-conflict                                            |
| `dismissed`         | Dismiss                                                                                      |
| `restored`          | Restore from Dismissed → inbox                                                               |
| `note`              | User note                                                                                    |
| `stage_changed`     | Board drag, API updateStage, CRM stage apply, package accept stage bump, outreach stage bump |
| `outcome_set`       | Close (API or CRM)                                                                           |
| `package_generated` | Apply package success (optional if cheap)                                                    |

Indexes: `(applicationId, createdAt)`, `(userId, applicationId)`.

### Activity emission matrix (all writers)

Every stage/status change must append activity — not only oRPC UI paths.

| Writer                              | Events                                                        |
| ----------------------------------- | ------------------------------------------------------------- |
| Harvest create                      | `discovered`                                                  |
| `promote` / hub promote-on-conflict | `promoted`                                                    |
| `dismiss`                           | `dismissed`                                                   |
| `addNote`                           | `note`                                                        |
| API `updateStage`                   | `stage_changed`                                               |
| API `setOutcome`                    | `outcome_set`                                                 |
| CRM apply (create + stage)          | create as tracked; `stage_changed` / `outcome_set` as applied |
| Package accept stage saved→applied  | `stage_changed`                                               |
| Outreach send stage bump            | `stage_changed`                                               |

Prefer a single repository helper `appendApplicationActivity` / wrap stage updates so CRM and API cannot drift.

---

## Harvest behavior (delta)

Current: `runMailJobHarvest` → `createIfAbsentByUrl` with `stage: saved`, notes template with match reasons.

**New:**

```text
matchPassed job
  → agentTake = narrative from take step (or null on soft-fail)
  → platform = inferApplicationSource(listingUrl, fromEmail)  // e.g. linkedin
  → sourceTags = unique(["mail", platform])
  → createIfAbsentByUrl({
      trackingStatus: "inbox",
      stage: "saved",
      matchScore,
      agentTake,
      sourceMessageId: messageId,
      sourceTags,                 // e.g. ["mail", "linkedin"]
      source: platform,           // legacy single enum mirror
      // no synthetic notes blob
      …listing fields
    })
  → if created:
       activity discovered {
         metadata: { matchScore, matchReasons, messageId, sourceTags }
       }
  → notify href: /dashboard/new-jobs
```

**Agent’s take generation (at harvest)**

- Implementation: **extra LLM call after score** in harvest workflow (or dedicated take step); soft-fail does **not** fail job create. Batching optional.
- Input: job title/company/description/location + preference summary + compact portfolio signals (opted-in experiences/projects/stacks names) when available in agent context.
- Output: 1–3 sentences, product tone — e.g.  
  _“A fast-paced, AI-powered development team in Cairo building scalable applications with Next.js and NestJS — right in line with your React ecosystem expertise and AI tool workflows.”_
- Not a bullet dump of keywords; not a resume rewrite.
- Soft-fail: app still created; UI shows empty take + optional “Regenerate take” later (v1.1 OK).

**Dedup:** unique `(userId, url)` unchanged — dismissed/inbox rows still block re-insert (harvest `created: false`).

**CRM path:** create/update always **`trackingStatus: tracked`** (explicit). Match set = open-tracked only; non-tracked match id → promote then stage.

---

## Actions (New jobs)

| Action              | Server                                                         | Activity                                 | UX                                                                        |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| **Track**           | `inbox` **or** `dismissed` → `tracked` (idempotent if tracked) | `promoted`                               | Primary group; toast; optional navigate to tracked detail                 |
| **Track & package** | promote then existing generate-apply-package HITL              | `promoted` (+ later `package_generated`) | Same group; package HITL after promote                                    |
| **Dismiss**         | `inbox` → `dismissed`                                          | `dismissed`                              | Separate destructive; leaves **New** list (still in **Dismissed** filter) |
| **Restore**         | `dismissed` → `inbox`                                          | `restored` (or metadata on activity)     | Dismissed filter only; outline/secondary + animated icon                  |

Open listing URL remains a secondary control (external link).

Errors: `NOT_FOUND` (wrong tenant / missing); `INVALID_STATE` (dismiss on tracked, stage on non-tracked, restore on non-dismissed).

### Action button chrome (locked)

Match existing dashboard patterns — **not** three equal ghost buttons.

**References in app**

| Pattern                                | Where                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Group` + `GroupSeparator` + `Button`  | `apps/web/src/shared/ui/header-actions.tsx` (batch/sort), `applications-page.tsx` (Board \| List), onboarding bulk select |
| Destructive + `IconShake mode="hover"` | `header-actions.tsx` Delete batch                                                                                         |
| `IconRotate mode="hover"`              | Settings/menu items, mobile nav                                                                                           |
| `IconMorph` / other icon-motion        | `@tsu-stack/ui/components/icon-motion`                                                                                    |

**Layout (card footer / detail header)**

```text
[ Track | Track & package ]     [ Dismiss ]
     ↑ Button Group (positive)     ↑ separate, destructive
```

- **Positive cluster:**

  ```tsx
  <Group>
    <Button size="sm" /* primary or default */>
      <IconMorph mode="hover" iconA={<BookmarkPlus />} iconB={<Check />} />
      Track
    </Button>
    <GroupSeparator />
    <Button size="sm" variant="secondary">
      <IconRotate mode="hover">{/* Package / Sparkles */}</IconRotate>
      Track & package
    </Button>
  </Group>
  ```
  - Exact icons: lucide (e.g. `BookmarkPlus` / `Package` or `Sparkles`) — pick to match nearby CRM CTAs; motion wrappers required.
  - Loading: `Button` `loading` prop on the pressed action only; disable sibling group buttons while pending.

- **Dismiss (not inside the Group):**

  ```tsx
  <Button size="sm" variant="destructive" …>
    <IconShake mode="hover">
      <X /> {/* or Ban / Trash2 — prefer Ban/X for soft dismiss, not hard delete trash */}
    </IconShake>
    Dismiss
  </Button>
  ```
  - Soft dismiss → **do not** use trash-as-hard-delete metaphor if the rest of the app uses trash only for permanent delete; prefer **X / Ban** + destructive styling so it’s scary enough but not “erase forever”.

- **Spacing:** outer `flex items-center gap-2` (same as `HeaderActions` / applications header): group, then dismiss.
- **Responsive:** on narrow cards, group can wrap under take text; keep group intact (don’t stack Track / Track & package as full-width separate primaries).
- **a11y:** `Group` has `role="group"`; dismiss `aria-label` if icon-only on xs (prefer label visible `sm+` if space tight).

---

## API

Extend `applications` router (and/or thin aliases). All tenant-scoped.

**Output / list:** include `trackingStatus`, `agentTake`, `sourceMessageId`, `sourceTags`, `matchScore`, legacy `source`. List input: optional `trackingStatus` filter; board default = `tracked`. Optional later: filter by `sourceTags`.

| Procedure                    | Behavior                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `list`                       | Filter `trackingStatus`; default **tracked** for board compatibility                   |
| `listInbox`                  | Convenience: `trackingStatus=inbox` only                                               |
| `promote`                    | `{ id }` → tracked + activity; from `inbox` **or** `dismissed` (or idempotent tracked) |
| `dismiss`                    | `{ id }` → dismissed + activity; only from inbox                                       |
| `restore`                    | `{ id }` → inbox + activity; only from dismissed                                       |
| `listActivity`               | `{ applicationId }` ordered by `createdAt`                                             |
| `addNote`                    | `{ applicationId, body }` → activity `note` (any status user can view)                 |
| `updateStage` / `setOutcome` | Reject unless `tracked`; append activity                                               |
| create                       | Explicit `trackingStatus: tracked`                                                     |

Hub `create-application` tool: ensure **tracked** (not inbox); on URL conflict with inbox/dismissed → promote per policy above.

Supersedes CRM design nav item “`/dashboard/applications` after Resumes” — that route is **deleted**; primary nav is New jobs + Tracked jobs only.

---

## UI

### New jobs (`/dashboard/new-jobs`)

- **Not** a stage board.
- **Segment / filter** on the page (not a third sidebar item):

  | Filter            | Query                        |
  | ----------------- | ---------------------------- |
  | **New** (default) | `trackingStatus = inbox`     |
  | **Dismissed**     | `trackingStatus = dismissed` |

  Prefer coss `Tabs` or the same `Group` + outline/default pattern as Board/List on applications — label with optional count badges (`New (3)` · `Dismissed (12)`).

- Cards/rows: company, title, location, match %, **source tags** (chips, e.g. Mail · LinkedIn), **agent take** (2–3 lines clamp + expand), relative time.
- Actions on **New**: **Group** [Track | Track & package] + separate **Dismiss** (`variant="destructive"`, `IconShake`); animated icons per Action button chrome.
- Actions on **Dismissed**: **Group** [Track | Track & package] + **Restore** (`variant="outline"` / secondary, not destructive) — undo dismiss to inbox.
- Empty **New**: “No new matches. Job alert digests that pass your preferences will show up here.”
- Empty **Dismissed**: “No dismissed jobs.”
- Detail side panel: take, JD, links, **Activity** timeline + composer (same for both filters).

### Tracked jobs (`/dashboard/tracked-jobs`)

- Existing board + list; copy rename Applications → Tracked jobs.
- Query only `trackingStatus=tracked`.
- Detail: same Activity timeline + composer; show agent take if present (read-only).
- **Import from job description:** opens a **Dialog** (coss `Dialog` / `DialogPopup`), **not** a Sheet or bottom sheet. Paste job description / URL → hub propose flow; HITL card stays inside the dialog. CTA label: **Import from job description** (spell out; avoid “JD” in UI). See [Hub agent tools HITL](./2026-08-11-hub-agent-tools-hitl-design.md) § Dual surface UX.

### Activity UI (both)

Inspired by comment timelines:

```text
Activity
  · [system] Discovered from mail · 1w ago
  · [user] note body · 2m ago  [⋯]
  · [system] Moved to Applied · 2m ago
  · composer: Write a note…
```

Use existing timeline primitives under `packages/ui` where they fit coss/Base UI; no full AI Elements migration.

### Sidebar / routes / copy

- Replace Applications item with **New jobs** + **Tracked jobs** (New jobs above Tracked).
- **Delete** TanStack route file(s) for `/dashboard/applications` (and children if any under that segment). No redirect table entry.
- Move/rename page modules from `pages/dashboard/applications/` → e.g. `pages/dashboard/tracked-jobs/` (and `new-jobs/`) so the old path is not left half-alive.
- Mail label routes (`/dashboard/mail/applications`) stay **mail** UX (Career Inbox category) — different product surface; only rename copy if confusing.
- P1 link inventory (must not keep `/dashboard/applications`):
  - Sidebar, command palette
  - Harvest notification `href`
  - CRM stage notification `href`
  - Hub create success / import JD navigations
  - Any “View applications” CTAs → Tracked or New jobs as appropriate

---

## Migration

1. Add enum + columns + `application_activity` table + Drizzle migration.
2. Backfill `trackingStatus = 'tracked'` for all existing rows.
3. Backfill `sourceTags`: if `source` set → `ARRAY[source::text]`; else `{}`. Do **not** invent `mail` for historical rows (unknown channel).
4. Do **not** bulk-move historical harvest rows into inbox.
5. Optional one-off: parse legacy notes starting with `AI harvest` into `agentTake` / ignore — nice-to-have, not required.

---

## Non-goals (this epic)

- Soft-save below minMatchScore
- **Third sidebar item** for Dismissed (use in-page filter under New jobs instead)
- Per-mail multi-app `sourceMessageId` graph beyond first link patterns
- Replacing board stages with Kanban for New jobs
- Changing monotonic CRM stage rails

---

## Success criteria

1. Harvested matchPassed jobs appear **only** under New jobs until Track/Dismiss.
2. Tracked board never shows `inbox` / `dismissed` rows.
3. Agent’s take visible on New jobs cards when generation succeeded.
4. User can add multiple notes interleaved with stage/discover events.
5. Track & package reuses apply-package HITL without a second pipeline.
6. `/dashboard/applications` gone; nav + all internal hrefs use new-jobs / tracked-jobs only.
7. LinkedIn job-alert harvest shows at least **Mail** + **LinkedIn** source tags.
8. New discovery channels can add tags without schema redesign (extend allowlist).

---

## Implementation phasing

| Phase  | Scope                                                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0** | Schema + migration + list filters + harvest writes inbox/take + activity discovered                                                                  |
| **P1** | New jobs page + New/Dismissed filter + promote/dismiss/restore/track&package + sidebar + **delete applications route** + fix all hrefs/notifications |
| **P2** | Activity list + addNote + stage/outcome activity hooks on tracked                                                                                    |
| **P3** | Polish (empty states, regenerate take, optional hard delete from dismissed)                                                                          |

---

## Open follow-ups (not blocking)

- Soft-save low matches as dismissed/inbox variant (still hard-skip below `minMatchScore`)
- ~~Badge count of **inbox only** on sidebar~~ — done
- ~~Agent take regenerate mutation~~ — done
- ~~Auto-purge dismissed older than N days~~ — **30 days**, daily BullMQ tick (`dismissed-application-purge`)

---

## References (current code)

| Concern            | Path                                                         |
| ------------------ | ------------------------------------------------------------ |
| Harvest persist    | `apps/server/src/queues/run-mail-job-harvest.ts`             |
| Harvest workflow   | `apps/agent/src/mastra/workflows/mail-job-harvest-workflow/` |
| Application schema | `packages/db/src/schema/application.schema.ts`               |
| Tracked jobs UI    | `apps/web/src/pages/dashboard/tracked-jobs/`                 |
| Sidebar            | `apps/web/src/widgets/layout/ui/sidebar.tsx`                 |
