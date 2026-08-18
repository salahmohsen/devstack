# Application Materials Menu + Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename menu **Review materials** → **Materials**, expose Preview/Download/Copy per material (nested submenus), and redesign the info-panel Materials section as action cards with coss labeled `Group` buttons.

**Architecture:** One pure helper (`material-actions.ts`) owns material availability, action lists, meta labels, and clipboard formatters. Menu and panel consume it; preview still uses page-level `openMaterialPreview` / `ApplicationMaterialPreviewDialog`. No new API routes.

**Tech Stack:** React, coss `Menu`/`ContextMenu` nested `Sub`, coss `Group`/`GroupSeparator`, lucide icons, sonner toasts, existing resume/cover download URLs.

**Spec:** `docs/superpowers/specs/2026-08-18-application-materials-menu-panel-design.md`

**Skills:** @coss (Group / Menu nested Sub), @better-ui (concentric radii, press scale, icon stroke), @.agents/ui.md for composition. Do **not** add unit tests unless the user asks (repo testing policy).

---

## File map

| Path                                                                           | Role                                                                          |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `apps/web/src/features/applications/lib/material-actions.ts`                   | **Create** — materials list, actions, meta, clipboard formatters, copy runner |
| `apps/web/src/features/applications/index.ts`                                  | Re-export helper symbols used by pages                                        |
| `apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-entry-actions.tsx` | Nested Materials → material → actions; remove local `materialsFor`            |
| `apps/web/src/pages/dashboard/tracked-jobs/ui/application-info-panel.tsx`      | Materials action cards + Group; keep status rows for recruiter/sent           |
| `apps/web/src/features/applications/lib/apply-package.ts`                      | Optional comment tweak only (CTA comment still says “Review materials”)       |

---

### Task 1: Shared `material-actions` helper

**Files:**

- Create: `apps/web/src/features/applications/lib/material-actions.ts`
- Modify: `apps/web/src/features/applications/index.ts`
- Modify: `apps/web/src/features/applications/lib/apply-package.ts` (comment only)

- [ ] **Step 1: Implement helper**

```ts
import { type ApplicationOutput } from "@tsu-stack/core";

export type ApplicationMaterialKind = "resume" | "cover-letter" | "outreach";

export type MaterialActionId = "preview" | "download" | "copy";

export type MaterialDescriptor = {
  kind: ApplicationMaterialKind;
  label: string;
  /** Short card meta from spec. */
  meta: string;
};

export type MaterialAction = {
  id: MaterialActionId;
  label: string;
};

export function materialsFor(app: ApplicationOutput): MaterialDescriptor[] {
  const items: MaterialDescriptor[] = [];
  if (app.resumeId) {
    items.push({ kind: "resume", label: "Resume", meta: "PDF" });
  }
  if (app.coverLetterR2Key || app.coverLetterBody?.trim()) {
    const hasPdf = Boolean(app.coverLetterR2Key);
    const hasBody = Boolean(app.coverLetterBody?.trim());
    const meta = hasPdf && hasBody ? "PDF + text" : hasPdf ? "PDF" : "Text";
    items.push({ kind: "cover-letter", label: "Cover letter", meta });
  }
  if (app.outreachSubject?.trim() || app.outreachBody?.trim()) {
    items.push({ kind: "outreach", label: "Outreach email", meta: "Subject + body" });
  }
  return items;
}

export function actionsFor(
  kind: ApplicationMaterialKind,
  app: ApplicationOutput
): MaterialAction[] {
  if (kind === "resume") {
    return [
      { id: "preview", label: "Preview" },
      { id: "download", label: "Download" }
    ];
  }
  if (kind === "cover-letter") {
    const actions: MaterialAction[] = [{ id: "preview", label: "Preview" }];
    if (app.coverLetterR2Key) actions.push({ id: "download", label: "Download" });
    if (app.coverLetterBody?.trim()) actions.push({ id: "copy", label: "Copy" });
    return actions;
  }
  // outreach
  return [
    { id: "preview", label: "Preview" },
    { id: "copy", label: "Copy" }
  ];
}

/** Cover letter body only — never PDF header meta. */
export function formatCoverLetterCopy(app: ApplicationOutput): string | null {
  const body = app.coverLetterBody?.trim();
  return body ? body : null;
}

/** Full email for paste: Subject line + blank line + body. */
export function formatOutreachCopy(app: ApplicationOutput): string | null {
  const subject = app.outreachSubject?.trim() ?? "";
  const body = app.outreachBody?.trim() ?? "";
  if (!subject && !body) return null;
  return `Subject: ${subject || "(no subject)"}\n\n${body}`;
}
```

Keep `ApplicationMaterialKind` in sync with `application.slice.ts` — either re-export the slice type from the helper and update the slice to import from the feature lib, **or** leave the slice type and import `ApplicationMaterialKind` from the slice inside the helper. Prefer: define the kind union in `material-actions.ts` and change `application.slice.ts` to `export type { ApplicationMaterialKind } from "@/features/applications/lib/material-actions"` (or from the barrel) so there is one source of truth.

- [ ] **Step 2: Re-export from feature barrel**

In `apps/web/src/features/applications/index.ts`, export:

```ts
export {
  materialsFor,
  actionsFor,
  formatCoverLetterCopy,
  formatOutreachCopy,
  type ApplicationMaterialKind,
  type MaterialAction,
  type MaterialActionId,
  type MaterialDescriptor
} from "@/features/applications/lib/material-actions";
```

- [ ] **Step 3: Update apply-package comment**

In `apply-package.ts`, change “Review materials” → “Materials” in the CTA comment.

- [ ] **Step 4: Typecheck the web package (or IDE) — no new unit tests**

```bash
pnpm --filter @tsu-stack/web exec tsc --noEmit -p tsconfig.json
```

Expected: clean (or only pre-existing unrelated errors).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/applications/lib/material-actions.ts \
  apps/web/src/features/applications/index.ts \
  apps/web/src/features/applications/lib/apply-package.ts \
  apps/web/src/pages/dashboard/tracked-jobs/_lib/application.slice.ts
git commit -m "feat(web): shared application material actions helper"
```

---

### Task 2: Nested Materials menu actions

**Files:**

- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-entry-actions.tsx`

- [ ] **Step 1: Remove local `materialsFor`; import shared helpers + download URLs + toast**

```ts
import { toast } from "sonner";
import {
  // existing imports…
  materialsFor,
  actionsFor,
  formatCoverLetterCopy,
  formatOutreachCopy,
  coverLetterDownloadUrl,
  resumeDownloadUrl
} from "@/features/applications";
```

- [ ] **Step 2: Add clipboard + download handlers**

```ts
async function copyText(label: string, value: string | null) {
  if (!value) {
    toast.error(`Nothing to copy for ${label}`);
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  } catch {
    toast.error("Could not copy");
  }
}

function triggerDownload(href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = "";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function runMaterialAction(
  app: ApplicationOutput,
  kind: ApplicationMaterialKind,
  actionId: MaterialActionId
) {
  if (actionId === "preview") {
    openMaterialPreview(app.id, kind);
    return;
  }
  if (actionId === "download") {
    if (kind === "resume" && app.resumeId) {
      triggerDownload(resumeDownloadUrl(app.resumeId));
      return;
    }
    if (kind === "cover-letter" && app.coverLetterR2Key) {
      triggerDownload(coverLetterDownloadUrl(app.id));
      return;
    }
    toast.error("Download unavailable");
    return;
  }
  if (actionId === "copy") {
    if (kind === "cover-letter") {
      void copyText("cover letter", formatCoverLetterCopy(app));
      return;
    }
    if (kind === "outreach") {
      void copyText("outreach email", formatOutreachCopy(app));
      return;
    }
  }
}
```

Wire `openMaterialPreview` from the store inside the component (handlers can close over it).

- [ ] **Step 3: Replace single-level Materials Sub with nested Subs**

Replace the accepted-state block that maps materials to preview-only Items with:

```tsx
{
  materials.length > 0 ? (
    <Sub>
      <SubTrigger>
        <FileTextIcon aria-hidden="true" />
        Materials
      </SubTrigger>
      <SubPopup>
        {materials.map((material) => (
          <Sub key={material.kind}>
            <SubTrigger>
              {material.kind === "outreach" ? (
                <MailIcon aria-hidden="true" />
              ) : (
                <FileTextIcon aria-hidden="true" />
              )}
              {material.label}
            </SubTrigger>
            <SubPopup>
              {actionsFor(material.kind, app).map((action) => (
                <Item
                  key={action.id}
                  onClick={() => runMaterialAction(app, material.kind, action.id)}
                >
                  {action.label}
                </Item>
              ))}
            </SubPopup>
          </Sub>
        ))}
      </SubPopup>
    </Sub>
  ) : null;
}
```

Confirm nested `Sub` works for both Menu and ContextMenu slots (same `ApplicationActionSlots`). If ContextMenu nested Sub misbehaves in browser verify (Task 4), fall back is still nested Subs — fix slot adapters only if needed.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-entry-actions.tsx
git commit -m "feat(web): nested Materials menu with preview download copy"
```

---

### Task 3: Side panel Materials action cards + coss Group

**Files:**

- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/application-info-panel.tsx`

- [ ] **Step 1: Imports**

Add:

```ts
import {
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  MailIcon
  // existing icons…
} from "lucide-react";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { toast } from "sonner";
import {
  materialsFor,
  actionsFor,
  formatCoverLetterCopy,
  formatOutreachCopy,
  coverLetterDownloadUrl,
  resumeDownloadUrl,
  type MaterialActionId,
  type ApplicationMaterialKind
} from "@/features/applications";
import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
```

Use store `openMaterialPreview` for Preview (same dialog host as menu). Prefer extracting a small local `MaterialsActionCards` component in the same file to keep the panel readable.

- [ ] **Step 2: Replace Materials `dl` / DetailRows with cards**

Spec visibility: `!isDiscovery && hasMaterials` (unchanged). Inside the section:

```tsx
<div className="space-y-2.5">
  {materialsFor(item).map((material) => {
    const actions = actionsFor(material.kind, item);
    const Icon = material.kind === "outreach" ? MailIcon : FileTextIcon;
    return (
      <div
        key={material.kind}
        className="rounded-xl border border-border/80 bg-muted/20 p-3 dark:bg-muted/10"
      >
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-muted/60">
            <Icon className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{material.label}</p>
            <p className="text-xs text-muted-foreground">{material.meta}</p>
          </div>
        </div>
        <Group aria-label={`${material.label} actions`}>
          {actions.map((action, index) => (
            <Fragment key={action.id}>
              {index > 0 ? <GroupSeparator /> : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="active:scale-[0.96]"
                onClick={() => runPanelMaterialAction(item, material.kind, action.id)}
                // download may use render={<a href… download />} when preferred
              >
                {action.id === "preview" ? <EyeIcon className="size-3.5" aria-hidden /> : null}
                {action.id === "download" ? (
                  <DownloadIcon className="size-3.5" aria-hidden />
                ) : null}
                {action.id === "copy" ? <CopyIcon className="size-3.5" aria-hidden /> : null}
                {action.label}
              </Button>
            </Fragment>
          ))}
        </Group>
      </div>
    );
  })}

  {/* Status rows — not action cards */}
  {(item.recruiterEmail || item.outreachSentAt) && (
    <dl className="space-y-2.5 pt-1">
      {item.recruiterEmail ? <DetailRow label="Recruiter">{item.recruiterEmail}</DetailRow> : null}
      {item.outreachSentAt ? (
        <DetailRow label="Outreach sent">{formatWhen(item.outreachSentAt)}</DetailRow>
      ) : null}
    </dl>
  )}
</div>
```

**better-ui:** outer card `rounded-xl` + `p-3` → Group buttons use default `rounded-lg` so corners stay concentric. Icon stroke `1.75` beside regular labels. Press scale on Group buttons.

Reuse the same `runMaterialAction` / clipboard logic as the menu — extract a tiny shared `runApplicationMaterialAction` into `material-actions.ts` **only if** duplication is awkward; otherwise duplicate the thin click wiring in both files to avoid forcing `"use client"` / toast into the pure helper. Prefer a small `copyMaterialToClipboard` async helper next to formatters that returns `{ ok: boolean }` and let UI toast — keeps helper free of sonner.

Recommended clipboard helper addition in Task 1 if not already done:

```ts
export async function writeClipboardText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Remove obsolete resume/cover DetailRow Preview/Download markup** from Materials; leave Details-section fallback resume row for `!hasMaterials` as today.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/dashboard/tracked-jobs/ui/application-info-panel.tsx \
  apps/web/src/features/applications/lib/material-actions.ts
git commit -m "feat(web): materials action cards with coss Group"
```

---

### Task 4: Browser verification

**Surfaces:** Tracked jobs board/list ⋮ menu, context menu, application info panel.

- [ ] **Step 1: Start web app if needed; open an application with accepted materials (resume + cover + outreach)**

- [ ] **Step 2: Menu checks**

1. ⋮ → **Materials** (not “Review materials”).
2. Resume → Preview opens PDF dialog; Download downloads.
3. Cover letter → Preview; Download; Copy → toast “Copied”; paste into a text field is body only (no “Cover Letter” / name·date header).
4. Outreach → Preview; Copy → paste is `Subject: …` then blank line then body.
5. Right-click context menu: same nesting.

- [ ] **Step 3: Panel checks**

1. Materials section shows three action cards with meta labels.
2. Each card’s actions are a single joined Group (not loose ghost buttons).
3. Preview / Download / Copy match menu behavior.
4. Recruiter / Outreach sent still appear as status rows when present.
5. Desktop + a narrow panel width: Group stays usable (no overflow clipping of labels if possible; wrap card padding if needed).

- [ ] **Step 4: Edge cases**

1. Cover letter with PDF but empty body → no Copy action.
2. Body-only cover letter → Preview text dialog + Copy; no Download.
3. Discovery / new-jobs panel: Materials section still gated by `!isDiscovery`.

- [ ] **Step 5: Final commit only if verification prompted polish fixes**

```bash
git add -A
git commit -m "fix(web): polish materials menu and panel after verify"
```

(Skip empty commit if nothing changed.)

---

## Done when

- Menu label is **Materials** with nested per-material actions matching the action model table.
- Panel uses action cards + coss labeled Group.
- Cover letter Copy = `coverLetterBody`; outreach Copy = full email string.
- Preview dialogs still hosted at page level.
- Spec requirements covered; no new backend routes.
