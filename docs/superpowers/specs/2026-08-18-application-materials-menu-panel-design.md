# Application materials menu + side panel

**Date:** 2026-08-18  
**Status:** Approved for implementation

## Goals

- Rename context/row menu **Review materials** → **Materials**.
- Give each material explicit actions (Preview / Download / Copy) instead of preview-only clicks.
- Add **Copy** for cover letter body (job-site form paste) and outreach full email.
- Redesign the info-panel **Materials** section as action cards with coss grouped buttons.
- Keep menu and panel actions consistent via one shared helper.

## Non-goals

- New PDF generation, storage, or download API routes.
- Editing materials from the panel (still Edit / Prepare again / package sheet).
- Changing Send outreach flow.
- List + preview-pane materials browser (rejected in brainstorm).

## Action model

Shared helper decides which materials exist and which actions each supports.

| Material       | Exists when                             | Preview                                      | Download        | Copy                                                                                |
| -------------- | --------------------------------------- | -------------------------------------------- | --------------- | ----------------------------------------------------------------------------------- |
| Resume         | `resumeId`                              | Linked resume PDF dialog                     | Resume PDF URL  | —                                                                                   |
| Cover letter   | `coverLetterR2Key` or `coverLetterBody` | PDF embed when R2 key; else body text dialog | PDF when R2 key | Clipboard = stored `coverLetterBody` only (no PDF title / name·date·company header) |
| Outreach email | `outreachSubject` or `outreachBody`     | Subject + body dialog (existing)             | —               | Clipboard = full email: `Subject: …` + blank line + body                            |

Copy cover letter requires non-empty `coverLetterBody`. If only an R2 PDF exists with empty body, hide Copy (Preview/Download remain).

## Menu (⋮ / context)

When apply-package entry state is `accepted` and at least one material exists:

```text
Materials
  ├─ Resume
  │    ├─ Preview
  │    └─ Download
  ├─ Cover letter
  │    ├─ Preview
  │    ├─ Download   (if PDF)
  │    └─ Copy       (if body)
  └─ Outreach email
       ├─ Preview
       └─ Copy
```

- Missing materials omit their submenu.
- Preview continues to use page-level `ApplicationMaterialPreviewDialog` / `openMaterialPreview` (must not mount dialogs inside Menu).
- Download uses existing `resumeDownloadUrl` / `coverLetterDownloadUrl` (anchor or equivalent).
- Copy runs clipboard write then toast success / error.

## Side panel Materials

**Visibility (unchanged gate):** show the Materials section when `!isDiscovery` and at least one material exists (`resumeId` / cover letter / outreach body). Do **not** require apply-package `accepted` for the panel — that gate applies only to the menu Materials submenu. Shared helpers unify _actions_, not section visibility.

Replace the current DetailRow Preview/Download strip with **action cards**:

- One card per available material: icon, title, short meta (table below).
- Actions in a coss `Group` / `ButtonGroup` of labeled outline `size="sm"` buttons separated by `GroupSeparator` (same pattern as `p-group-1` and tracked-jobs list actions).
- Include Outreach email (panel today largely omits outreach content).
- Recruiter email and outreach-sent timestamps stay as status detail rows, not action cards.
- Reuse the same preview dialog host and download URLs as the menu.
- Copy feedback: existing app toast (`toast.success` / `toast.error`).

### Card meta labels

| Material       | Condition           | Meta             |
| -------------- | ------------------- | ---------------- |
| Resume         | `resumeId`          | `PDF`            |
| Cover letter   | R2 + body           | `PDF + text`     |
| Cover letter   | R2 only             | `PDF`            |
| Cover letter   | body only           | `Text`           |
| Outreach email | subject and/or body | `Subject + body` |

### better-ui constraints

- Concentric radii: card outer radius = inner Group radius + card padding.
- Press feedback: `active:scale-[0.96]` on action buttons where motion is allowed.
- Icons: outline lucide, `currentColor`, stroke weight matched to adjacent label (~1.5–2).
- No staggered enter animation on panel open (high-frequency surface).

## Shared helper (implementation seam)

Place a small pure module at `apps/web/src/features/applications/lib/material-actions.ts` and re-export from `features/applications` as needed:

- `materialsFor(app)` → list of available materials with labels/kinds/meta.
- `actionsFor(material, app)` → ordered actions `{ id: "preview" | "download" | "copy", label }`.
- `formatCoverLetterCopy(app)` → body string or null.
- `formatOutreachCopy(app)` → full-email string or null.

Menu and panel both call these; do not fork action availability.

## Files likely touched

- `apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-entry-actions.tsx` — nested Subs; rename label; copy handlers.
- `apps/web/src/pages/dashboard/tracked-jobs/ui/application-info-panel.tsx` — Materials cards + Group.
- New helper module (feature lib).
- Possibly thin re-exports from `features/applications/index.ts`.

## Out of scope

- Icon-only Group or primary+overflow menu variants (rejected).
- Separate copy-subject / copy-body for outreach (full email only).
- Stripping greeting/sign-off from cover letter copy.
