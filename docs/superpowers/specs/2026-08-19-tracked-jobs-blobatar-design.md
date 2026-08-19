# Tracked jobs blobatar avatars

## Goal

Replace the custom canvas `AgentAvatar` on tracked jobs with [blobatar](https://github.com/Alain00/blobatar) company faces. Keep selection feedback via animation, and strengthen it with a surprised expression while selected.

## Scope

**In**

- Tracked jobs list row avatar (`list.tsx`)
- Tracked jobs board card avatar (`board.tsx`)
- Application info panel eyebrow avatar (`application-info-panel.tsx`)
- Local wrapper component under tracked-jobs UI
- `blobatar` dependency on `apps/web` plus required `blobatar/motion.css` import

**Out**

- Shared `packages/ui` `AgentAvatar` (hub chat, personality picker, etc.)
- New jobs list / other dashboard surfaces
- Self-hosted blobatar HTTP endpoint
- Changing seed source away from company name

## Behavior

| State      | Render                                | Expression  | Notes                                  |
| ---------- | ------------------------------------- | ----------- | -------------------------------------- |
| Unselected | Static (`<img>` path inside Blobatar) | `idle`      | No idle motion; dense list stays cheap |
| Selected   | `animate="always"`                    | `surprised` | Breathe/bob/blink/glance + pose morph  |

- Deterministic `name` = `companyName` (same seed string used today).
- Transparent backdrop (blobatar default): omit `background`, or pass `background={false}` — do not invent a `"none"` string.
- Respect library `prefers-reduced-motion` handling (static under reduce).
- Selection definition unchanged: list row / board card whose id is the open side-panel item. The info panel avatar is for that open item, so it uses the **selected** variant while the panel is showing the job.
- Preserve existing call-site `size` and outline `className` values (list 32, board 28, panel 44).

## Component shape

Add `CompanyAvatar` next to tracked-jobs UI (e.g. `apps/web/src/pages/dashboard/tracked-jobs/ui/company-avatar.tsx`):

```tsx
import { Blobatar } from "blobatar/react";
import { idle, surprised } from "blobatar/expression";
import "blobatar/motion.css";

type CompanyAvatarProps = {
  companyName: string;
  size?: number;
  selected?: boolean;
  className?: string;
  "aria-label"?: string;
};

// selected → animate="always" + surprised; else static idle
```

Call sites swap `AgentAvatar` → `CompanyAvatar`, mapping existing `animated={selected}` / `avatarAnimated` to `selected`.

## Dependency

- Install `blobatar` in `apps/web` only (page-local concern; do not put it in `@tsu-stack/ui` for this change).
- Import `blobatar/motion.css` from the wrapper module (or a single tracked-jobs entry import) so animation CSS is present when any `CompanyAvatar` mounts.

## Accessibility

- Keep an accessible name via `title` / `aria-label` from `companyName` (blobatar `title` and/or host `aria-label`).
- Expressions are decorative and must not change the accessible name.
- Reduced motion: library goes fully static; surprised pose may still apply without morph.

## Success criteria

1. Tracked jobs list/board/panel show blobatars derived from `companyName`.
2. Unselected avatars are static idle; selected avatars animate and show surprised.
3. Hub chat and other `AgentAvatar` call sites are unchanged.
4. No new network dependency on `blobatar.dev` at runtime (use the npm package).

## Non-goals / YAGNI

- Per-stage expressions, hover-only animation on the grid, or expression bursts with timers.
- Rewriting `AgentAvatar` to wrap blobatar.
- Pinning traits / hue / tone for brand locks.
