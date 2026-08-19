# Tracked Jobs Blobatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace tracked-jobs company `AgentAvatar`s with blobatar faces that stay static/idle when unselected and animate with a surprised expression when selected.

**Architecture:** Add a page-local `CompanyAvatar` wrapper around `Blobatar` under tracked-jobs UI. Swap the three call sites (list, board, info panel). Keep shared `@tsu-stack/ui` `AgentAvatar` for hub chat and other surfaces.

**Tech Stack:** `blobatar` (`blobatar/react`, `blobatar/expression`, `blobatar/motion.css`), React, existing tracked-jobs selection state.

**Spec:** `docs/superpowers/specs/2026-08-19-tracked-jobs-blobatar-design.md`

**Branch:** Implement on **`main`** (do not create a worktree for this plan).

**Skills:** Do **not** add unit tests unless the user asks. Verify in the browser on tracked jobs list + board selection.

---

## File map

| Path                                                                      | Role                                                             |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `apps/web/package.json` (+ lockfile)                                      | Add `blobatar` dependency                                        |
| `apps/web/src/pages/dashboard/tracked-jobs/ui/company-avatar.tsx`         | **Create** — Blobatar wrapper (`selected` → animate + surprised) |
| `apps/web/src/pages/dashboard/tracked-jobs/ui/list.tsx`                   | Swap `AgentAvatar` → `CompanyAvatar`                             |
| `apps/web/src/pages/dashboard/tracked-jobs/ui/board.tsx`                  | Swap `AgentAvatar` → `CompanyAvatar`                             |
| `apps/web/src/pages/dashboard/tracked-jobs/ui/application-info-panel.tsx` | Swap + selected variant; loosen `rounded-full` clip on eyebrow   |

---

### Task 1: Install `blobatar` on `@tsu-stack/web`

**Files:**

- Modify: `apps/web/package.json`
- Modify: lockfile (via Vite+)

- [ ] **Step 1: Add the dependency**

From repo root:

```bash
vp add blobatar --filter @tsu-stack/web
```

If `vp add` fails in this environment, fall back to:

```bash
pnpm add blobatar --filter @tsu-stack/web
```

- [ ] **Step 2: Confirm install**

```bash
rg '"blobatar"' apps/web/package.json
```

Expected: a semver range for `blobatar` (current published major is `1.x`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add blobatar dependency"
```

---

### Task 2: Create `CompanyAvatar`

**Files:**

- Create: `apps/web/src/pages/dashboard/tracked-jobs/ui/company-avatar.tsx`

- [ ] **Step 1: Implement the wrapper**

```tsx
"use client";

import { Blobatar } from "blobatar/react";
import { surprised } from "blobatar/expression";
import "blobatar/motion.css";

import { cn } from "@tsu-stack/ui/lib/utils";

export type CompanyAvatarProps = {
  companyName: string;
  size?: number;
  /** When true: idle loop + surprised expression. When false: static idle. */
  selected?: boolean;
  className?: string;
  "aria-label"?: string;
};

/**
 * Tracked-jobs company face via blobatar.
 * Unselected → static idle; selected → animate="always" + surprised.
 * Transparent backdrop (library default — do not pass background="none").
 */
export function CompanyAvatar({
  companyName,
  size,
  selected = false,
  className,
  "aria-label": ariaLabel
}: CompanyAvatarProps) {
  const label = ariaLabel ?? companyName;
  const shared = {
    name: companyName,
    size,
    title: companyName,
    "aria-label": label,
    className: cn("shrink-0", className)
  } as const;

  // Split branches so TypeScript keeps Blobatar's static vs animated prop union.
  if (selected) {
    return <Blobatar {...shared} animate="always" expression={surprised} />;
  }

  return <Blobatar {...shared} />;
}
```

Notes for the implementer:

- Do **not** pass `background="none"` — omit `background` (or `false`) for transparent.
- Do **not** wrap in `overflow-hidden rounded-full` (that clips the silhouette).
- Importing `blobatar/motion.css` from this module is enough; do not duplicate the CSS import at call sites.
- Unselected omits `expression` (library default is idle, byte-identical).

- [ ] **Step 2: Typecheck the new file in context**

```bash
vp run --filter @tsu-stack/web check
```

Expected: no type errors from `company-avatar.tsx`. If the spread `as const` fights the animated union, drop the shared object and duplicate the few props in each branch.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/dashboard/tracked-jobs/ui/company-avatar.tsx
git commit -m "feat(web): add CompanyAvatar blobatar wrapper"
```

---

### Task 3: Wire list + board + info panel

**Files:**

- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/list.tsx`
- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/board.tsx`
- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/application-info-panel.tsx`

- [ ] **Step 1: Update `list.tsx`**

Replace import:

```tsx
import { CompanyAvatar } from "./company-avatar";
```

(remove `AgentAvatar` import from `@tsu-stack/ui/components/agent-avatar`)

Replace the avatar JSX (~lines 219–225):

```tsx
<CompanyAvatar
  companyName={app.companyName}
  size={32}
  selected={selected}
  className="mt-0.5 size-8 outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
  aria-label={app.companyName}
/>
```

- [ ] **Step 2: Update `board.tsx`**

Same import swap. Replace avatar JSX (~lines 117–122):

```tsx
<CompanyAvatar
  companyName={app.companyName}
  size={28}
  selected={avatarAnimated}
  className="mt-0.5 size-7 outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
  aria-label={app.companyName}
/>
```

(`avatarAnimated` remains `viewItem?.id === app.id`.)

- [ ] **Step 3: Update `application-info-panel.tsx`**

Import swap. Replace eyebrow avatar (~lines 377–383) and loosen circle clip:

```tsx
eyebrow={
  <CompanyAvatar
    companyName={item.companyName}
    size={44}
    selected
    className="size-11 outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
    aria-label={item.companyName}
  />
}
eyebrowClassName="size-11 overflow-visible rounded-none bg-transparent"
```

(`selected` is always true here — the panel only shows the open/selected job.)

`ItemInfoPanel` defaults the eyebrow shell to `overflow-hidden rounded-xl` and `[&_img]:size-full`. Override overflow/radius so the silhouette is not clipped. If static (or reduced-motion) faces still look squashed in the panel, also neutralize the `[&_img]` sizing utilities on that eyebrow shell.

- [ ] **Step 4: Grep for leftover AgentAvatar under tracked-jobs**

```bash
rg 'AgentAvatar|agent-avatar' apps/web/src/pages/dashboard/tracked-jobs
```

Expected: no matches.

- [ ] **Step 5: Check**

```bash
vp run --filter @tsu-stack/web check
```

Expected: pass (or only pre-existing unrelated failures).

- [ ] **Step 6: Commit**

```bash
git add \
  apps/web/src/pages/dashboard/tracked-jobs/ui/list.tsx \
  apps/web/src/pages/dashboard/tracked-jobs/ui/board.tsx \
  apps/web/src/pages/dashboard/tracked-jobs/ui/application-info-panel.tsx
git commit -m "feat(web): use blobatar on tracked jobs avatars"
```

---

### Task 4: Browser verification

**Files:** none (manual)

- [ ] **Step 1: Run web (and API if needed)**

```bash
# from repo root — use the project's usual dev entry if already documented
vp run --filter @tsu-stack/web dev
```

- [ ] **Step 2: Exercise tracked jobs**

1. Open `/dashboard/tracked-jobs` list view.
2. Confirm each row shows a distinct blobatar for different company names (transparent backdrop).
3. Select a row → that avatar animates and shows **surprised**; others stay static idle.
4. Switch to board view → select a card → same selected behavior; deselected cards static.
5. Confirm the side panel eyebrow avatar is animated + surprised while open.
6. Deselect / close panel → previously selected list/board avatar returns to static idle.
7. Spot-check hub chat still uses the old canvas `AgentAvatar` (unchanged).

- [ ] **Step 3: Commit only if verification required follow-up fixes**

If CSS/class tweaks are needed (outline clipping, sizing), commit them separately:

```bash
git commit -m "fix(web): polish tracked jobs blobatar sizing"
```

---

## Done when

- [x] Spec success criteria met (blobatars from `companyName`; selected = animate + surprised; hub `AgentAvatar` untouched; npm package, not `blobatar.dev` HTTP).
- [ ] Browser verification steps above passed.
