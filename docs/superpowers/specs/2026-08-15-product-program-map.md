# Product program map — 2026-08-15

**Status:** Grill locked (session 2026-08-15). Authoring model **A**.  
**Authoring rule:** Write a full spec only for the next program. Later programs stay titled slots until their turn.  
**Do not** implement this map as one change.

## Authoring model

1. Lock order + cross-program contracts here.
2. Write **only the next spec** → plan → implement → harden if the program is AI/dashboard.
3. Install a registry component in the **first spec that needs it**, not in a “add every demo” pass.
4. Parallelize only when two specs share no files and no schema. Safe later pairs: profile preview + account delete. Never parallel onboarding with mail→CRM.

Implementation UI for dashboard/onboarding work uses **impeccable** (operate), **coss**, and **transitions.dev**. Motion conventions (program 2) are written before more chrome lands.

## Ship order

| #   | Program                                | Doc                                                                                                       | When to write the full spec                                                    |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 0   | Production extract + save-button reset | [plan](../plans/2026-08-15-onboarding-extract-and-save-reset.md)                                          | Done (plan, not a design spec)                                                 |
| 1   | Shared contracts                       | [spec](./2026-08-15-shared-integration-contracts-design.md)                                               | Now                                                                            |
| 2   | Motion conventions                     | titled slot                                                                                               | After onboarding ships, before visual sweep                                    |
| 3   | Onboarding hardening                   | [spec](./2026-08-15-onboarding-hardening-design.md)                                                       | Now (depends on 0 + 1)                                                         |
| 3b  | Hub onboarding playbook                | [spec](./2026-08-15-hub-onboarding-playbook-design.md)                                                    | After 1 (catalog) + 3 apply/merge; can share the branch                        |
| 3c  | Hub HITL card family                   | [spec](./2026-08-15-hub-hitl-card-family-design.md) · [plan](../plans/2026-08-15-hub-hitl-card-family.md) | After 3b locks; restyle existing JD/triage/approval first, then playbook cards |
| 4   | Inbox chrome                           | titled slot                                                                                               | After 3                                                                        |
| 5   | Mail → job CRM                         | titled slot                                                                                               | After 4                                                                        |
| 6   | Notifications + logos                  | titled slot                                                                                               | After 1 contracts + 5                                                          |
| 7   | Profile live preview + layout          | titled slot                                                                                               | After 3 (independent of 5)                                                     |
| 8   | Testimonials                           | titled slot                                                                                               | After 7 (same preview component)                                               |
| 9   | Account delete                         | titled slot                                                                                               | Anytime after 1; tiny                                                          |
| 10  | Visual sweep                           | titled slot                                                                                               | After 2; attach leftover chrome continuously                                   |

Implement **0 → 1 → 3 → 3b → 3c** next. Program 2 can be a short skill/doc between 3 and 10. 3c can start on existing hub cards before playbook tools land.

## Titled slots (not specified yet)

### 2 — Motion conventions

Decide skill vs project markdown. Must tell agents to load **transitions.dev** plus project motion rules. Then audit existing motion. Do not invent a third animation system in onboarding beyond stepper / confetti / review pane transitions.

### 4 — Inbox chrome

Swipeable list, sticky header, collapsible mail nav, flush list chrome, custom-rule label instead of Noise, rules-form copy. Uses the same mail classify `rule:{slug}` labels that already exist.

### 5 — Mail → job CRM

Pin, delete, retag, link mail ↔ job, AI activity titles, monotonic stage moves, ghosted SLA from job preferences, harden after ship. Must not invent a second preference surface.

Today letter **story** (deltas, classify summaries, takes on land) is specified in [2026-08-17-today-letter-story-design.md](./2026-08-17-today-letter-story-design.md). That spec does **not** ship delete.

### 6 — Notifications + logos

Per-landed-job notifications (kill `mail.job_alerts_ready` batch), toast layout, stack popover, kind icons, `companyLogoUrl` on the application row. Contracts already frozen in spec 1.

### 7 — Profile live preview + layout

Preview stays visible in edit mode (live, on top). New preview layout. Same component as public/settings preview.

### 8 — Testimonials

Write / owner approve or dismiss / notify / marquee on profile. Dismiss = later soft-delete. Delete = hard delete. Feature flag in settings.

### 9 — Account danger zone

Delete account card. Hard delete rules. Separate from Integrations.

### 10 — Visual sweep

Overflow actions on side panels, morphing tabs, animated icons, 404 glitch, infinite-scroll loader (not the Users demo app dump), scroll-spy on project analysis, date wheel, agent home shader, message-scroller. Punch-list after the motion skill.

## Explicitly out of Wave 0–3

- Jalco code Diff Viewer as resume comparison (wrong primitive)
- Copy-pasting the chaotic-pixels Users demo into `/components/ui`
- Replacing every lucide icon with animate-ui
- Gmail scopes on Google login/register
- Company table
- Auto-downgrade of application stages
- Testimonials, mail swipe, pin/delete mail

## Frozen cross-program contracts

Owned by [shared contracts](./2026-08-15-shared-integration-contracts-design.md). Later specs may not contradict:

- Catalog = Gmail, GitHub, Resend. AI is not a catalog card.
- Emails group = Gmail + Resend. Google identity lives on Account.
- “Configured” = capability (Gmail scopes, GitHub OAuth, Resend tenant key).
- One job-preference form/module. Future ghosted SLA is a field there.
- One notification item shape; one `companyLogoUrl` on the application row.
