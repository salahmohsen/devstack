# Status Morph Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a presentational `StatusMorphToggle` in `@tsu-stack/ui` (SmoothUI-style morphing status dot) and wire it into the portfolio status icon button with optimistic toggle + opposite-color hover preview.

**Architecture:** Non-interactive morph lives in `packages/ui` (motion spring + hover-device / reduced-motion gates). `PortfolioStatusButton` in `apps/web` keeps the outline icon `Button` + tooltip + `IconSwap` loading, owns optimistic `active` state, and passes `active` into the morph. No nested buttons. Menu Switches unchanged.

**Tech Stack:** React, `motion/react`, Tailwind v4 theme `bg-success` / `bg-destructive`, existing coss `Button` / `Tooltip` / `IconSwap`.

**Spec:** `docs/superpowers/specs/2026-08-18-status-morph-toggle-design.md`

**Branch:** Implement on **`main`** (user preference — do not create a worktree for this plan).

**Skills:** @better-ui (motion restraint, reduced motion), @.agents/ui.md (packages/ui extraction). Do **not** add unit tests unless the user asks.

---

## File map

| Path                                                  | Role                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| `packages/ui/components/status-morph-toggle.tsx`      | **Create** — presentational morph dot                       |
| `apps/web/src/shared/ui/list-item-action-buttons.tsx` | Replace `LiveStatusDot`; optimistic `PortfolioStatusButton` |

No package.json export map change needed (`./components/*` already covers the new file).

---

### Task 1: `StatusMorphToggle` in packages/ui

**Files:**

- Create: `packages/ui/components/status-morph-toggle.tsx`

- [ ] **Step 1: Implement presentational morph**

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { useMediaQuery } from "@tsu-stack/ui/hooks/use-media-query";
import { cn } from "@tsu-stack/ui/lib/utils";

export type StatusMorphToggleProps = {
  /** Idle color + which opposite color to preview on hover. */
  active: boolean;
  className?: string;
  /**
   * Idle circle size. `sm` ≈ 8px (matches former LiveStatusDot size-2).
   * Morph scales proportionally (taller/narrower on hover).
   */
  size?: "sm" | "md";
};

const SIZE = {
  sm: { idle: 8, hoverW: 6, hoverH: 14 },
  md: { idle: 10, hoverW: 7, hoverH: 18 }
} as const;

/**
 * Presentational status morph (SmoothUI Dot Morph–inspired).
 * Not a button — parent owns press / aria-pressed / disabled.
 *
 * **Hover hit-area:** outer span should fill the parent icon button
 * (consumer passes `className="absolute inset-0 size-full"`) so morph +
 * opposite-color preview fire on whole-control hover, not only the 8px dot.
 */
export function StatusMorphToggle({
  active,
  className,
  size = "sm"
}: StatusMorphToggleProps): React.ReactElement {
  const shouldReduceMotion = useReducedMotion();
  const isHoverDevice = useMediaQuery("(hover: hover) and (pointer: fine)");
  const [isHovered, setIsHovered] = useState(false);
  const dims = SIZE[size];

  const morph =
    !shouldReduceMotion && isHoverDevice && isHovered
      ? { borderRadius: 999, width: dims.hoverW, height: dims.hoverH }
      : { borderRadius: 999, width: dims.idle, height: dims.idle };

  // Hover previews the opposite state color.
  const previewActive = isHovered && isHoverDevice && !shouldReduceMotion ? !active : active;

  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      data-slot="status-morph-toggle"
      data-active={active ? "" : undefined}
      onMouseEnter={() => {
        if (isHoverDevice) setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.span
        aria-hidden
        className={cn("inline-block", previewActive ? "bg-success" : "bg-destructive")}
        initial={false}
        animate={morph}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 600, damping: 22, duration: 0.25 }
        }
      />
    </span>
  );
}
```

Notes:

- Do **not** render `<button>` or accept `onClick`.
- Do **not** import SmoothUI / SmoothButton.
- Keep `"use client"` because of hooks + motion.
- Prefer `useMediaQuery` from `packages/ui/hooks/use-media-query.ts` (confirm the package export path; raw `matchMedia` only if the hook cannot take a freeform query).

- [ ] **Step 2: Typecheck ui package**

```bash
pnpm --filter @tsu-stack/ui exec tsc --noEmit -p tsconfig.json
```

Expected: clean (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add packages/ui/components/status-morph-toggle.tsx
git commit -m "feat(ui): add StatusMorphToggle presentational morph"
```

---

### Task 2: Wire PortfolioStatusButton with optimistic state

**Files:**

- Modify: `apps/web/src/shared/ui/list-item-action-buttons.tsx`

- [ ] **Step 1: Imports + remove `LiveStatusDot`**

```ts
import { useEffect, useState } from "react";
import { StatusMorphToggle } from "@tsu-stack/ui/components/status-morph-toggle";
```

Delete the private `LiveStatusDot` function. Drop `Circle` from the lucide-react import (it is only used by `LiveStatusDot` today).

- [ ] **Step 2: Optimistic PortfolioStatusButton**

Replace `PortfolioStatusButton` body roughly with:

```tsx
function PortfolioStatusButton({
  inPortfolio,
  isLoading,
  onToggle,
  className
}: {
  inPortfolio: boolean;
  isLoading?: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const [active, setActive] = useState(inPortfolio);
  useEffect(() => {
    setActive(inPortfolio);
  }, [inPortfolio]);

  const hint = active ? "On your public profile" : "Not on your public profile";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon"
            variant="outline"
            disabled={isLoading}
            onClick={(event) => {
              event.stopPropagation();
              setActive((v) => !v);
              onToggle();
            }}
            aria-label={hint}
            aria-pressed={active}
            data-slot="button"
            className={cn("relative", className)}
          />
        }
      >
        <IconSwap
          state={isLoading ? "b" : "a"}
          aria-hidden
          className="relative size-full"
          iconClassName="relative size-full"
          iconA={
            <StatusMorphToggle active={active} size="sm" className="absolute inset-0 size-full" />
          }
          iconB={<Loader2 className="size-4 animate-spin" />}
        />
      </TooltipTrigger>
      <TooltipPopup>{hint}</TooltipPopup>
    </Tooltip>
  );
}
```

**Hover hit-area lock:** `StatusMorphToggle` must fill the icon button (`absolute inset-0` / `size-full` through `IconSwap`) so morph + opposite-color preview run when the pointer is anywhere on the outline button — not only when it touches the 8px dot.

**Behavior locks:**

- Tooltip + `aria-pressed` / `aria-label` track **optimistic** `active` (not stale `inPortfolio` mid-flight).
- Parent mutation still via `onToggle()`; when query cache / error rolls `inPortfolio`, `useEffect` resyncs.
- Overflow menu Switch rows unchanged.
- After click while still hovering, the control may remain morphing with the _new_ opposite preview until mouse leave; “settles to circle” applies once hover ends (or on touch / reduced motion).

- [ ] **Step 3: Typecheck web**

```bash
pnpm --filter @tsu-stack/web exec tsc --noEmit -p tsconfig.json
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/shared/ui/list-item-action-buttons.tsx
git commit -m "feat(web): optimistic StatusMorphToggle on portfolio status"
```

---

### Task 3: Browser verification (on main)

**Surfaces:** Dashboard experiences / projects / stacks list rows that show the portfolio status icon in the action `Group`.

- [ ] **Step 1: Hard-refresh an experiences (or projects) list with both in-portfolio and out-of-portfolio items**

- [ ] **Step 2: Idle colors**

1. In-portfolio → green circle.
2. Not in portfolio → red circle.

- [ ] **Step 3: Hover (desktop pointer)**

1. Hover **anywhere on the outline icon button** (not only the 8px dot) → morph + opposite color.
2. Hover green → morph taller/narrower + turn red (preview).
3. Hover red → morph + turn green.
4. Leave without click → back to idle circle + original color.
5. Click while still hovering → optimistic state flips; may stay morphing with the _new_ opposite preview until mouse leave; circle settles when hover ends.

- [ ] **Step 4: Optimistic click**

1. Click green → settles to red circle without waiting for network (optimistic).
2. Tooltip flips to “Not on your public profile”.
3. Confirm server success keeps red; force a failure path if easy and confirm resync back to green + toast.

- [ ] **Step 5: Loading + a11y**

1. While mutation pending, spinner still replaces the morph (`IconSwap`).
2. Touch / narrow: no morph required; color still toggles.
3. Menu “In portfolio” / Featured Switch rows still work as before.

- [ ] **Step 6: Polish commit only if needed**

```bash
git add -A
git commit -m "fix(ui): polish StatusMorphToggle after verify"
```

(Skip empty commit.)

---

## Done when

- `StatusMorphToggle` exported from `@tsu-stack/ui/components/status-morph-toggle`.
- Portfolio status button uses it with optimistic active + opposite-color hover morph.
- No nested buttons; menu Switches untouched; no SmoothUI package install.
