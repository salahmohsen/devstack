# Jobs hardening plan 2 — silence + mail on job

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quiet tracked jobs nudge at 7 days and suggest Ghosted at 14 days. Job card shows linked mail. Manual assign. Undoable stage AI via existing CRM apply.

**Architecture:** Reuse `mail_message.applicationId` and `mail_crm_apply`. No new link table. Notifications for silence. Spec: `docs/superpowers/specs/2026-08-20-devhub-jobs-hardening-from-freehire-design.md`.

**Tech Stack:** existing notification enums, application_activity, oRPC mail + applications routers.

**Depends on:** Plan 1 on the same branch (`feat/jobs-hardening-from-freehire`).

**Skills:** `@.agents/end-to-end-features.md`, `@.agents/orpc.md`, `@.agents/core.md`, `@.agents/testing.md` (tests requested), `@humanizer` for notification copy.

## Global Constraints

- Mail maps to **application id**, never posting id. Manual assign writes `mail_message.applicationId` (tenant-scoped: both rows `userId === session.userId`).
- Silence clock: tracked + `outcome` null. Quiet = no `stageChangedAt` bump and no linked mail `receivedAt` in the window.
- Day 7: notify “this has been quiet”. Day 14: notify again and **suggest** Ghosted (one tap in UI). **Never auto-set `outcome`.**
- Linking a mail or changing stage clears silence state (delete flags / activity so the clock restarts).
- Stage AI = existing classify / `mail_crm_apply`. Visible and undoable. Monotonic: reuse `resolveMonotonicStage` in `packages/core/src/mail/crm-effects.ts`. AI may move stage forward or set outcome; may not move interview back to saved.
- Do not invent a second link table.
- Notification kinds are core contracts: add to `NotificationKindSchema` and labels/defaults together.
- Humanizer on user-facing notification strings: no em dashes, no hype.
- Conventional commits. Tests in `src/**/__tests__/*.test.ts`. Never migrate production.

## File map

| File                                                           | Responsibility                                 |
| -------------------------------------------------------------- | ---------------------------------------------- |
| `packages/core/src/application/silence.ts`                     | Pure 7d/14d clock                              |
| `packages/core/src/notification-settings/{types,constants}.ts` | New kinds                                      |
| `packages/db/src/schema/application-activity.schema.ts`        | `silence_nudged`, `ghosted_suggested`          |
| `packages/api` + `apps/server/src/queues`                      | Daily tick (follow `job-inbox-liveness-queue`) |
| `packages/api` mail + applications routers                     | List/assign/unassign                           |
| Tracked job info panel + Career Inbox                          | Mail list, assign picker, Mark ghosted         |

---

### Task 1: Silence clock

**Files:**

- Create: `packages/core/src/application/silence.ts`
- Create: `packages/core/src/application/__tests__/silence.test.ts`
- Modify: `packages/core/src/application/index.ts`
- Modify: `packages/core/src/notification-settings/types.ts`
- Modify: `packages/core/src/notification-settings/constants.ts`
- Modify: `packages/db/src/schema/application-activity.schema.ts` — add enum values `silence_nudged`, `ghosted_suggested`
- Modify: `packages/db/src/schema/mail-message.schema.ts` — index `mail_message_application_id_idx` on `applicationId`
- Modify: `packages/core/src/application/utils.ts` `formatApplicationActivitySummary` for the new kinds
- Modify: `apps/web/src/pages/dashboard/settings/ui/notification-settings.tsx` `KIND_GROUPS` (add both new kinds under Mail & career)
- Modify: notification settings DB default JSON if stored as full channel map
- Create: `packages/api/src/lib/application/silence-tick.ts`
- Create: `apps/server/src/queues/application-silence-queue.ts` (clone liveness queue cadence: daily is enough; 12h is acceptable)
- Modify: `apps/server/src/index.ts` to start the queue
- Modify: Tracked jobs info panel / list to show “Mark ghosted?” when metadata/activity says suggested
- Generate db migration for enum values (local DATABASE_URL only)

**Interfaces:**

- Consumes: `stageChangedAt`, latest linked mail `receivedAt`, existing silence activity, `now`
- Produces:

```ts
export const SILENCE_NUDGE_MS = 7 * 24 * 60 * 60 * 1000;
export const SILENCE_GHOST_MS = 14 * 24 * 60 * 60 * 1000;

export type SilencePhase = "quiet" | "nudge7" | "suggestGhost14";

export function silencePhase(input: {
  now: Date;
  stageChangedAt: Date;
  lastLinkedMailAt: Date | null;
  lastSilenceNudgeAt: Date | null;
  lastGhostSuggestAt: Date | null;
}): SilencePhase;
```

Clock start = max(`stageChangedAt`, `lastLinkedMailAt ?? 0`). If age < 7d → `quiet`. If age ≥ 7d and no nudge yet → `nudge7`. If age ≥ 14d and no ghost suggest yet → `suggestGhost14`. If already nudged but < 14d → `quiet` (do not re-nudge). Never return a phase that would auto-write `outcome`.

New notification kinds (exact):

- `application.silence_nudge`
- `application.ghosted_suggest`

Labels: `Quiet tracked job`, `Suggest mark ghosted`.
Descriptions: `When a tracked job has had no stage change and no linked mail for 7 days.` / `When a tracked job has been quiet for 14 days. Suggests Ghosted; does not set it.`
Defaults: `{ app: true, email: false }` both.

- [ ] **Step 1:** TDD `silencePhase` with frozen `now`:

```ts
it("is quiet under 7 days", () => {
  expect(
    silencePhase({
      now: new Date("2026-08-20"),
      stageChangedAt: new Date("2026-08-18"),
      lastLinkedMailAt: null,
      lastSilenceNudgeAt: null,
      lastGhostSuggestAt: null
    })
  ).toBe("quiet");
});

it("nudges at 7 days once", () => {
  expect(
    silencePhase({
      now: new Date("2026-08-20"),
      stageChangedAt: new Date("2026-08-13"),
      lastLinkedMailAt: null,
      lastSilenceNudgeAt: null,
      lastGhostSuggestAt: null
    })
  ).toBe("nudge7");
});

it("does not re-nudge after a 7d notify before 14d", () => {
  expect(
    silencePhase({
      now: new Date("2026-08-20"),
      stageChangedAt: new Date("2026-08-12"),
      lastLinkedMailAt: null,
      lastSilenceNudgeAt: new Date("2026-08-19"),
      lastGhostSuggestAt: null
    })
  ).toBe("quiet");
});

it("suggests ghost at 14 days", () => {
  expect(
    silencePhase({
      now: new Date("2026-08-20"),
      stageChangedAt: new Date("2026-08-01"),
      lastLinkedMailAt: null,
      lastSilenceNudgeAt: new Date("2026-08-08"),
      lastGhostSuggestAt: null
    })
  ).toBe("suggestGhost14");
});

it("linked mail resets the clock", () => {
  expect(
    silencePhase({
      now: new Date("2026-08-20"),
      stageChangedAt: new Date("2026-08-01"),
      lastLinkedMailAt: new Date("2026-08-19"),
      lastSilenceNudgeAt: new Date("2026-08-08"),
      lastGhostSuggestAt: null
    })
  ).toBe("quiet");
});
```

- [ ] **Step 2:** Worker: list `trackingStatus=tracked` AND `outcome IS NULL`. For each, load latest linked mail `receivedAt` and latest silence activities. On `nudge7`: insert `app_notification` kind `application.silence_nudge`, href to tracked job, activity `silence_nudged`. On `suggestGhost14`: notify `application.ghosted_suggest` + activity `ghosted_suggested`. Copy:

Nudge title: `This job has been quiet`
Nudge body: `No stage change and no linked mail for 7 days.`
Ghost title: `Still quiet after 14 days`
Ghost body: `You can mark this as ghosted. We will not do it for you.`

- [ ] **Step 3:** UI: when latest activity kind is `ghosted_suggested` (and outcome still null), show a one-tap **Mark ghosted** that calls the existing set-outcome path. Do not call it from the worker.

- [ ] **Step 4:** On stage change repository method and on mail `applicationId` set/clear: do not delete history; the next tick uses `stageChangedAt` / mail `receivedAt` so the phase returns `quiet`. If a `ghosted_suggested` chip would linger, hide it when `silencePhase` is no longer `suggestGhost14` (compute on read in the get-by-id payload: `silencePhase`).

- [ ] **Step 5:** Drizzle enum add: if `db:generate` cannot add PG enum values cleanly, write a SQL migration `ALTER TYPE application_activity_kind ADD VALUE IF NOT EXISTS 'silence_nudged';` (and ghosted). Local DATABASE_URL only.

- [ ] **Step 6:** Commit:

```bash
git commit -m "feat(web): silence nudges for quiet tracked jobs"
```

---

### Task 2: Mail thread on job + assign

**Files:**

- Modify: `packages/api/src/routers/applications.router.ts` — include linked mails on get-by-id (and list if cheap)
- Modify: `packages/api/src/routers` mail router — `assignApplication` / `unassignApplication`
- Modify: `packages/db/src/repositories/mail-message.repository.ts`
- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/application-info-panel.tsx`
- Modify: `apps/web/src/pages/dashboard/mail/mail-category-page.tsx` (assign picker lives here, not a new mail page)
- Reuse `mail_crm_apply` undo; do not duplicate stage mutation

**Interfaces:**

- Consumes: `mail_message.applicationId`, `resolveMonotonicStage`
- Produces:

```ts
// applications.getById extra
linkedMails: Array<{
  id: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  receivedAt: Date;
  labels: string[];
}>

// mail.assignApplication
input: { mailId: string; applicationId: string }
errors: NOT_FOUND | FORBIDDEN (wrong user)

// mail.unassignApplication
input: { mailId: string }
```

Both mutations: `WHERE id = mailId AND userId = session.userId`. Target application must be same `userId`. Setting `applicationId` also stamps CRM apply audit if you already do that on classify; do **not** auto-run stage AI on manual assign.

- [ ] **Step 1:** Query mails by `applicationId` for the job sheet, newest first, cap 50.

- [ ] **Step 2:** Assign / unassign mutations as above. Unassign sets `applicationId` null.

- [ ] **Step 3:** Job sheet: list subject, from, relative date; click opens Career Inbox message. Empty: `No mail linked yet.`

- [ ] **Step 4:** Career Inbox: picker of this tenant’s tracked (and inbox) applications (`title — companyName`). Confirm writes `applicationId`. Show current link + Unassign.

- [ ] **Step 5:** If classify CRM apply runs, keep existing undo UI. Do not add a second apply engine. Confirm `apply-mail-crm-effect.ts` still uses `resolveMonotonicStage` (already does). No backward stage from AI.

- [ ] **Step 6:** Commit:

```bash
git commit -m "feat(web): attach mail to applications"
```

---

## Verification

- Core silence helper tests
- Assign is tenant-scoped (wrong user → error, no row change)
- Worker never writes `application.outcome`
- `vp check` touched packages
