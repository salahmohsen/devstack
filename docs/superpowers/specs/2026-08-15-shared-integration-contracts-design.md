# Shared integration contracts — Design

**Date:** 2026-08-15  
**Status:** Ready for plan (grill locked; spec review approved)  
**Goal:** One catalog, one job-preference module, and frozen notification/logo/SLA ownership so onboarding and later programs cannot fork.

**Related**

- Program map — `2026-08-15-product-program-map.md`
- Onboarding hardening — `2026-08-15-onboarding-hardening-design.md` (consumes this catalog)
- Owner onboarding (2026-07-26) — still owns apply transaction / PDF keys
- AI settings redesign — `2026-08-04-ai-settings-redesign-design.md` (AI is **not** a catalog card)

**Design skills (implementation of this spec’s UI)**

| Skill               | Role                                                                  |
| ------------------- | --------------------------------------------------------------------- |
| **coss**            | Integration cards, Account linked-sign-in rows, job-preference fields |
| **impeccable**      | Operate mode — scanable settings, not a marketing page                |
| **transitions.dev** | Save/Test text-state swap; Failed → Save                              |
| **`.agents/ui.md`** | Settings Frame / existing integration card primitives                 |

---

## Problem

1. Connect and Settings already share `ConnectionsIntegrations`, but Resend is `extra` from mail settings, and the “Gmail” card still models **Google-account** states (`partial` = sign-in only).
2. Account tells users linked apps live under Integrations.
3. Job preferences already share a form; Settings still says “Jobs.”
4. Later mail/notification work will invent a Company table or a second notification shape unless ownership is frozen now.

---

## Product decisions (grill lock)

| #   | Decision                                                                                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Catalog members: **Gmail, GitHub, Resend**. Not AI. Not job prefs. Not mail rules.                                                                                                                                                                                                                                                                |
| 2   | Groups: **Emails** (Gmail, Resend) and **Developer** (GitHub).                                                                                                                                                                                                                                                                                    |
| 3   | Gmail card = inbox capability only. Disconnect Gmail is a **scopes-only** API: always strip Gmail scopes, never delete the Google account, always return `gmail_scopes_removed`. Today `disconnectProvider({ provider: "google" })` only strips scopes when Google is the last login; otherwise it **unlinks**. That is wrong for the Gmail card. |
| 4   | Google identity lives only on **Settings → Account → Linked sign-in**.                                                                                                                                                                                                                                                                            |
| 5   | Google login/register stays `openid email profile`. Gmail scopes only via Connect Gmail (`linkSocial` + `GMAIL_CONNECT_SCOPES`).                                                                                                                                                                                                                  |
| 6   | Configured = **capability** (below). Server-unavailable: hide on onboarding Connect, show in Settings.                                                                                                                                                                                                                                            |
| 7   | Onboarding omits the Connect step when every **available** catalog item is configured.                                                                                                                                                                                                                                                            |
| 8   | Job preferences: one module, one form (`JobPreferenceFields`). Settings nav label **Job preferences**. Min match = range slider on that form.                                                                                                                                                                                                     |
| 9   | Future **ghosted SLA** is a field on job preferences, not mail settings. Do not add the field in this spec.                                                                                                                                                                                                                                       |
| 10  | Notifications: one item per landed job; extend existing `AppNotificationItem`; stop batch `mail.job_alerts_ready`. **Do not implement in this spec.**                                                                                                                                                                                             |
| 11  | `companyLogoUrl` nullable on the **application** row. No Company table this wave. **Do not implement in this spec.**                                                                                                                                                                                                                              |

---

## Configured predicates

| Item   | Configured                               | Still show on onboarding       | Hide on onboarding                          |
| ------ | ---------------------------------------- | ------------------------------ | ------------------------------------------- |
| Gmail  | `gmailConnected === true` (Gmail scopes) | Google linked but sign-in only | Scopes granted, or Google OAuth env missing |
| GitHub | Better Auth GitHub account linked        | Not linked                     | Linked, or GitHub OAuth env missing         |
| Resend | Tenant `hasResendApiKey`                 | No tenant key                  | Tenant key saved                            |

Resend `available` is **always `true`** for catalog purposes. There is no server-env gate that hides the BYO card. Platform `RESEND_API_KEY` is **not** “user configured” and must not set `available: false`. Inbound address / webhook secret are later mail setup, not the catalog gate.

Shared helper in `packages/core` (e.g. `catalogItemState(...)`) must be the only place these rules live. Web Connect skip and Settings badges import it.

Onboarding `hideConfigured` means: hide if **configured or OAuth-unavailable** (the “Hide on onboarding” column). Settings still shows unavailable cards.

---

## Information architecture

```text
Settings → Integrations
  Emails
    [Gmail card]   connect scopes · sync · disconnect Gmail
    [Resend card]  API key · test · inbound URL (existing Resend UI)
  Developer
    [GitHub card]  connect · refresh · disconnect

Settings → Account
  Linked sign-in   (status only this wave — no link/unlink actions)
    Google  linked | not linked     (identity only)
    GitHub  linked as login | …     (if used to sign in)
  Sessions / username / (later) danger zone

Settings → Job preferences   (was Jobs)
  same JobPreferenceFields + min-match range slider

Onboarding → Connect
  same catalog, hideConfigured=true
  if visible.length === 0 → skip step
```

Resend moves from “`extra` slot” to a **first-class catalog item** in the same component tree as Gmail/GitHub. New connections in the future are added once in the catalog registry.

---

## Module ownership

| Concern                       | Owner                                                                | Consumers                                 |
| ----------------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| Catalog registry + predicates | `packages/core/src/connections/` (+ mail-settings `hasResendApiKey`) | API status, web catalog                   |
| Catalog UI                    | `apps/web/src/features/connections/` including Resend card           | Settings Integrations, onboarding Connect |
| Resend save/test API          | existing `mail-settings` router                                      | Resend catalog card only                  |
| Linked sign-in UI             | Account settings                                                     | Account page only                         |
| Job preference form           | `apps/web/src/features/job-preference/`                              | Settings, onboarding jobs step            |
| Job preference contract       | `packages/core/src/job-preference/`                                  | API, agent, web                           |

Do not duplicate cards in `pages/dashboard/onboarding/`.

---

## Frozen later schemas (do not ship here)

### Notification item

Keep `AppNotificationItem`. Later program 6 adds optional:

- `imageUrl: string | null` — company logo for job kinds
- `tags: string[]` — short chips under the body

Replace uses of `mail.job_alerts_ready` as a **batch**. One notification per landed application. Popover may stack; each row opens that job (`applicationId`).

### Company logo

Later: `application.companyLogoUrl` (`text`, nullable). Writers: harvest, listing refresh, mail-notifier extract. Readers: job cards, toasts, notification popover. No Company table.

### Ghosted SLA

Later: integer days (or hours) on `job_preference`. Mail→CRM program owns the worker. This spec only forbids a second settings page.

---

## Save → test → Failed

Wave 0 plan owns the flash reset. Any catalog card that uses `StatusSubmitButton` must follow: Failed + field change → idle **Save** / **Test**.

---

## Out of scope

- Onboarding step machine, review, merge apply
- Implementing notification stacks, logos, or SLA
- Gmail scopes on register/login
- Testimonials, account delete
- New visual registries except the min-match range slider (beui), because the shared form is the first place that field exists

---

## Implementation notes

1. Extend `ConnectionsStatusOutput` (or a sibling `IntegrationsCatalogOutput`) with Resend `{ configured: hasResendApiKey, available: true }` so Connect skip does not ad-hoc-fetch mail settings in two shapes.
2. Split the current Gmail card’s `partial` copy: Settings Gmail says “Not connected” when scopes are missing, even if Google login exists. Google login status is the Account row. Keep the **predicate** that sign-in-only still shows Gmail on onboarding Connect.
3. Add `disconnectGmail` (or `disconnectProvider` mode `gmail_only`) that **always** strips Gmail scopes and never deletes the Google account. Test: Google login survives when GitHub or password is also linked. Do not reuse today’s `disconnectProvider("google")` from the Gmail card.
4. Rename Settings nav + page title only; route path may stay `/dashboard/settings/jobs` if changing it is noisy — product copy is **Job preferences**.
5. Range slider: **replace** the existing single-thumb `SliderField` on `minMatchScore`. Still one threshold 0–100, default 60 — not a two-thumb range.
6. This spec ships the catalog helper, grouped cards, Resend-on-status, Gmail scopes-only disconnect, Account status rows, and the slider rename. **Omitting the onboarding Connect step** (session/stepper) is onboarding hardening — do not rewrite `onboarding-session-store.ts` here.

---

## Testing

- Core predicates: Gmail partial vs connected; Resend platform key vs tenant key; unavailable hidden for onboarding filter.
- Catalog: Settings shows unavailable cards; onboarding Connect does not.
- Catalog helper: all available configured → `visible.length === 0` (onboarding uses this to omit the step).
- Job preference form still upserts the same oRPC contract after rename + slider.
