# Contact Type Deterministic Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drop stored contact icons; expand contact types; render all contact icons from a single web utility typed by Drizzle `ContactSchemaSelect["type"]`.

**Architecture:** Schema enum is source of truth. Migration adds five enum values and drops `contact.icon`. Core Zod + repos + agent stop accepting/writing icons. Web owns `getContactIcon` / `ContactIcon` with an exhaustive `Record<ContactType, IconType>`.

**Tech Stack:** Drizzle + Postgres enums, Zod (`@tsu-stack/core`), react-icons (fa6), Vite+ unit tests, TanStack Form (profile settings)

**Spec:** `docs/superpowers/specs/2026-08-11-contact-type-deterministic-icons-design.md`

---

## File map

| Path                                                          | Responsibility                              |
| ------------------------------------------------------------- | ------------------------------------------- |
| `packages/db/src/schema/contact.schema.ts`                    | Enum + table (no `icon`)                    |
| `packages/db/migrations/<ts>_contact_type_icons/`             | ADD VALUE ×5 + DROP COLUMN icon             |
| `packages/db/src/repositories/contact.repository.ts`          | Upsert without icon                         |
| `packages/db/src/repositories/onboarding-apply.repository.ts` | Remove default-icon helpers                 |
| `packages/core/src/profile/types.ts`                          | Zod contact schemas without icon; enum sync |
| `packages/core/src/onboarding/constants.ts`                   | Delete `CONTACT_TYPE_DEFAULT_ICONS`         |
| `packages/core/src/onboarding/utils.ts`                       | Delete `withContactDefaultIcons`            |
| `packages/core/src/onboarding/types.ts`                       | Contact shape without icon                  |
| `packages/core/src/onboarding/__tests__/utils.test.ts`        | Remove icon-fill tests                      |
| Agent resume-import schemas/steps                             | No icon field                               |
| `apps/web/src/shared/lib/contact-icon.tsx`                    | **New** utility + component                 |
| `apps/web/src/shared/ui/contact-button.tsx`                   | Use `ContactIcon`                           |
| `apps/web/src/pages/home-page/ui/profile-social-links.tsx`    | Use utility; drop local map                 |
| Profile settings + onboarding review                          | Remove IconPicker for contacts              |

---

### Task 1: DB schema + migration

**Files:**

- Modify: `packages/db/src/schema/contact.schema.ts`
- Create: `packages/db/migrations/20260811120000_contact_type_deterministic_icons/migration.sql`

- [ ] **Step 1: Update Drizzle schema**

```ts
// contact.schema.ts
export const contactTypeEnum = pgEnum("contact_type_enum", [
  "website",
  "email",
  "phone",
  "location",
  "linkedin",
  "github",
  "x",
  "youtube",
  "instagram",
  "discord",
  "bluesky",
  "mastodon",
  "telegram"
]);

// In table columns: remove `icon: text("icon").notNull(),`
```

- [ ] **Step 2: Hand-write migration SQL** (Postgres cannot drop enum values; only ADD + drop column)

```sql
ALTER TYPE "contact_type_enum" ADD VALUE IF NOT EXISTS 'instagram';--> statement-breakpoint
ALTER TYPE "contact_type_enum" ADD VALUE IF NOT EXISTS 'discord';--> statement-breakpoint
ALTER TYPE "contact_type_enum" ADD VALUE IF NOT EXISTS 'bluesky';--> statement-breakpoint
ALTER TYPE "contact_type_enum" ADD VALUE IF NOT EXISTS 'mastodon';--> statement-breakpoint
ALTER TYPE "contact_type_enum" ADD VALUE IF NOT EXISTS 'telegram';--> statement-breakpoint
ALTER TABLE "contact" DROP COLUMN IF EXISTS "icon";
```

Note: If `ADD VALUE IF NOT EXISTS` is unsupported on your Postgres version, use the project’s existing `DO $$ BEGIN … EXCEPTION` pattern or plain `ADD VALUE` (fails if re-run). Prefer matching nearby migrations under `packages/db/migrations/`.

- [ ] **Step 3: Apply migration locally**

Run: `pnpm db:migrate` (or project’s documented migrate command from root/package)

Expected: migration applies; `\d contact` has no `icon`

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/contact.schema.ts packages/db/migrations/20260811120000_contact_type_deterministic_icons
git commit -m "feat(db): expand contact types and drop contact.icon"
```

---

### Task 2: Contact repository + onboarding-apply

**Files:**

- Modify: `packages/db/src/repositories/contact.repository.ts`
- Modify: `packages/db/src/repositories/onboarding-apply.repository.ts`

- [ ] **Step 1: Update `UpsertContactItem`**

Remove `icon: string`. Update `.set({ value })` and `insert` values to omit `icon`.

- [ ] **Step 2: Onboarding apply**

Delete `withContactDefaultIcon` / any `CONTACT_TYPE_DEFAULT_ICONS` copy. Insert/update contacts with `type` + `value` only.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/repositories/contact.repository.ts packages/db/src/repositories/onboarding-apply.repository.ts
git commit -m "refactor(db): stop writing contact icons"
```

---

### Task 3: Core Zod + onboarding helpers

**Files:**

- Modify: `packages/core/src/profile/types.ts`
- Modify: `packages/core/src/onboarding/constants.ts`
- Modify: `packages/core/src/onboarding/utils.ts`
- Modify: `packages/core/src/onboarding/types.ts`
- Modify: `packages/core/src/onboarding/__tests__/utils.test.ts`
- Grep exports in `packages/core/src/index.ts` / onboarding index if needed

- [ ] **Step 1: Sync `contactTypeSchema`**

```ts
export const contactTypeSchema = z.enum([
  "website",
  "email",
  "phone",
  "location",
  "linkedin",
  "github",
  "x",
  "youtube",
  "instagram",
  "discord",
  "bluesky",
  "mastodon",
  "telegram"
]);
```

Remove `icon` from `contactOutputSchema` and `contactInputSchema`. Update `satisfies` against `ContactSchemaSelect` / Insert (types no longer include icon).

- [ ] **Step 2: Delete default icon machinery**

- Remove `CONTACT_TYPE_DEFAULT_ICONS` from `onboarding/constants.ts`
- Remove `withContactDefaultIcons` from `onboarding/utils.ts` and any exports
- Remove `icon` from onboarding contact Zod types
- Delete/rewrite tests in `utils.test.ts` that assert icon filling

- [ ] **Step 3: Run core unit tests**

Run: `pnpm --filter @tsu-stack/core test:unit`  
Expected: PASS (no icon tests)

- [ ] **Step 4: Commit**

```bash
git add packages/core
git commit -m "refactor(core): contact types without icon; drop default icon map"
```

---

### Task 4: Agent resume-import

**Files:**

- Modify: `apps/agent/src/mastra/workflows/resume-import-workflow/extract-output.schema.ts`
- Modify: `apps/agent/src/mastra/workflows/resume-import-workflow/normalize.step.ts`
- Grep: `icon` under resume-import-workflow

- [ ] **Step 1: Remove icon from extract/normalize contact shapes**

Contacts are `{ type, value }` only (plus any non-icon fields still required).

- [ ] **Step 2: Stop calling `withContactDefaultIcons` if still imported**

- [ ] **Step 3: Commit**

```bash
git add apps/agent/src/mastra/workflows/resume-import-workflow
git commit -m "refactor(agent): resume import contacts without icons"
```

---

### Task 5: Web contact-icon utility

**Files:**

- Create: `apps/web/src/shared/lib/contact-icon.tsx`
- Optional test: only if package already tests pure maps; else rely on TS exhaustiveness

- [ ] **Step 1: Implement utility**

```tsx
import type { ContactSchemaSelect } from "@tsu-stack/db/types";
import type { IconType } from "react-icons";
import {
  FaDiscord,
  FaEnvelope,
  FaGithub,
  FaGlobe,
  FaInstagram,
  FaLinkedin,
  FaMapMarkerAlt,
  FaMastodon,
  FaPhone,
  FaTelegram,
  FaXTwitter,
  FaYoutube
} from "react-icons/fa6";
// Bluesky: use available brand icon if present in fa6; else FaAt
import { FaAt } from "react-icons/fa6";

export type ContactType = ContactSchemaSelect["type"];

export const CONTACT_TYPE_ICONS = {
  website: FaGlobe,
  email: FaEnvelope,
  phone: FaPhone,
  location: FaMapMarkerAlt,
  linkedin: FaLinkedin,
  github: FaGithub,
  x: FaXTwitter,
  youtube: FaYoutube,
  instagram: FaInstagram,
  discord: FaDiscord,
  bluesky: FaAt, // swap if FaBluesky exists in installed react-icons
  mastodon: FaMastodon,
  telegram: FaTelegram
} as const satisfies Record<ContactType, IconType>;

export function getContactIcon(type: ContactType): IconType {
  return CONTACT_TYPE_ICONS[type];
}

export function ContactIcon({ type, className }: { type: ContactType; className?: string }) {
  const Icon = getContactIcon(type);
  return <Icon className={className} aria-hidden />;
}
```

Verify fa6 exports for Bluesky (`SiBluesky` from `react-icons/si` is fine if fa6 lacks it).

- [ ] **Step 2: Typecheck web**

Run: `pnpm --filter @tsu-stack/web exec tsc --noEmit` (or project check)  
Expected: no errors on this file

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/shared/lib/contact-icon.tsx
git commit -m "feat(web): add ContactType → icon utility from Drizzle type"
```

---

### Task 6: Unify public + shared contact UI

**Files:**

- Modify: `apps/web/src/shared/ui/contact-button.tsx`
- Modify: `apps/web/src/pages/home-page/ui/profile-social-links.tsx`

- [ ] **Step 1: ContactButton**

```tsx
import { ContactIcon } from "@/shared/lib/contact-icon";
// ...
<ContactIcon type={contact.type} className={className} />;
```

Remove `IconLetter`.

- [ ] **Step 2: profile-social-links**

- Remove local `socialIcon()` and duplicate brand imports used only for contacts
- `icon: <ContactIcon type={c.type} />` (or `createElement(getContactIcon(c.type))`)
- Keep GitHub profile enrichment icons as-is or also use `getContactIcon("github")` for consistency
- Extend `SOCIAL_CONTACT_TYPES` / title/handle helpers for new types (`instagram`, `discord`, …) so new contacts show on public profile when present

**Href helpers:** add `normalizeHref` cases for new types (https URLs, telegram `https://t.me/…`, discord invite URLs, etc.) — value remains free-form string; normalize when safe.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/shared/ui/contact-button.tsx apps/web/src/pages/home-page/ui/profile-social-links.tsx
git commit -m "fix(web): render contact icons from type utility"
```

---

### Task 7: Profile settings + onboarding forms

**Files:**

- Modify: `apps/web/src/pages/dashboard/settings/ui/profile-settings.tsx`
- Modify: `apps/web/src/pages/dashboard/onboarding/ui/review-step.tsx`
- Grep: `contacts[.*].icon`, `IconPicker` near contacts

- [ ] **Step 1: Profile settings**

- Remove `form.AppField name={\`contacts[${i}].icon\`}` and IconPicker
- On add contact: `{ type: nextType, value: "" }` only
- Show static `<ContactIcon type={currentType} />` next to type select (read-only visual), updating when type changes
- Ensure `CONTACT_TYPES` comes from updated `contactTypeSchema.options`

- [ ] **Step 2: Onboarding review**

Same: no icon field; type list includes new options; preview uses `ContactIcon`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/dashboard/settings/ui/profile-settings.tsx apps/web/src/pages/dashboard/onboarding/ui/review-step.tsx
git commit -m "fix(web): remove contact IconPicker; type-driven icons in forms"
```

---

### Task 8: Sweep + verify

- [ ] **Step 1: Repo-wide grep**

```bash
rg -n "contact\.icon|contacts\[.*\]\.icon|withContactDefaultIcons|CONTACT_TYPE_DEFAULT_ICONS|icon: z\.string" \
  packages/core packages/db packages/api apps/web apps/agent \
  --glob '!**/.worktrees/**' --glob '!**/migrations/**'
```

Expected: no remaining contact-icon product paths (migrations history ok)

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @tsu-stack/core test:unit
pnpm --filter @tsu-stack/db test:unit   # if any
# web typecheck / check as used in CI
```

- [ ] **Step 3: Manual smoke**

1. Profile settings: add Instagram + Telegram contacts, save, reload
2. Public portfolio: icons match types
3. Re-check domain/settings still ok (unrelated)

- [ ] **Step 4: Final commit if sweep fixes remain**

```bash
git commit -m "chore: finish contact icon removal sweep"
```

---

## Execution notes

- Deploy API + migrate + web together (dropped column + removed request field)
- Unique `(userId, type)` still one row per type — new types don’t change that
- IconPicker remains available for stacks/other features; only **contacts** stop using it

## Success criteria (from spec)

- [ ] No `icon` on contact table or contact API/forms
- [ ] All contact icons via web utility
- [ ] New types selectable with correct icons
- [ ] New enum value without map entry fails typecheck
