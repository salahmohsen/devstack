# Contact type deterministic icons

**Date:** 2026-08-11  
**Status:** Design approved (brainstorm)  
**Related:** profile contacts, onboarding resume import, public portfolio social links

## Problem

Contact rows store a free-form `icon` string (IconPicker id) in Postgres while:

- Public social UI already maps **type → react-icons** and ignores DB `icon`
- `ContactButton` uses **type letter**, not stored icon
- Profile settings still expose **IconPicker** per contact (noise and dual source of truth)

Icons should be **deterministic from contact type**, not stored or customized.

## Goals

1. No contact icon in the database
2. Icon derived only from `contact.type` via a single web utility
3. Utility typed from **Drizzle** `ContactSchemaSelect["type"]`
4. Expand type enum with common socials
5. Remove contact IconPicker / icon fields from forms, API, onboarding, agent normalize
6. Unify all contact icon rendering on the utility

## Non-goals

- Custom per-contact icons
- Changing stacks/project IconPicker behavior
- Multi-value contacts per type (keep unique `(userId, type)`)

## Decisions

| Topic                             | Decision                                                  |
| --------------------------------- | --------------------------------------------------------- |
| Approach                          | Type-only + web `getContactIcon` / `<ContactIcon />`      |
| New types                         | `instagram`, `discord`, `bluesky`, `mastodon`, `telegram` |
| DB `icon` column                  | **Drop** via migration                                    |
| Utility location                  | `apps/web` (React icons); not in core                     |
| Type source                       | `ContactSchemaSelect["type"]` from `@tsu-stack/db/types`  |
| Icon library                      | react-icons (fa6 / brands), match existing social row     |
| Core `CONTACT_TYPE_DEFAULT_ICONS` | **Remove** (no IconPicker string map for contacts)        |

## Contact types (closed enum)

```
website | email | phone | location
linkedin | github | x | youtube
instagram | discord | bluesky | mastodon | telegram
```

Sources of truth:

1. Drizzle `contactTypeEnum` in `packages/db/src/schema/contact.schema.ts`
2. Core Zod `contactTypeSchema` must stay **identical** string set
3. Web map: `Record<ContactSchemaSelect["type"], IconType>` with `satisfies` for exhaustiveness

## Utility (web)

**Path:** `apps/web/src/shared/lib/contact-icon.tsx` (or `.ts` + thin component)

```ts
import type { ContactSchemaSelect } from "@tsu-stack/db/types";

export type ContactType = ContactSchemaSelect["type"];

export function getContactIcon(type: ContactType): IconType;
export function ContactIcon(props: { type: ContactType; className?: string }): JSX.Element;
```

Suggested icons:

| Type      | Icon                   |
| --------- | ---------------------- |
| website   | FaGlobe                |
| email     | FaEnvelope             |
| phone     | FaPhone                |
| location  | FaMapMarkerAlt         |
| linkedin  | FaLinkedin             |
| github    | FaGithub               |
| x         | FaXTwitter             |
| youtube   | FaYoutube              |
| instagram | FaInstagram            |
| discord   | FaDiscord              |
| bluesky   | Brand or FaAt fallback |
| mastodon  | FaMastodon             |
| telegram  | FaTelegram             |

## Call sites

| Area                       | Action                                                          |
| -------------------------- | --------------------------------------------------------------- |
| `profile-social-links.tsx` | Remove local `socialIcon`; use utility                          |
| `contact-button.tsx`       | Replace `IconLetter` with `ContactIcon`                         |
| Profile settings           | Remove IconPicker field; type select + value only               |
| Onboarding review          | No icon field; type drives display                              |
| Core onboarding utils      | Remove `withDefaultContactIcons` / `CONTACT_TYPE_DEFAULT_ICONS` |
| Resume import normalize    | Stop setting `icon`                                             |
| Contact repository         | Insert/update without `icon`                                    |
| API / Zod                  | Drop `icon` from contact input/output schemas                   |

## Migration order

1. **DB migration**
   - Add enum values: `instagram`, `discord`, `bluesky`, `mastodon`, `telegram`
   - Drop column `contact.icon`
2. **packages/db** types + repository
3. **packages/core** schemas + delete default-icon helpers/tests updates
4. **packages/api** if any contact DTOs
5. **apps/agent** resume-import normalize / extract schemas
6. **apps/web** utility + UI + forms

Prefer **one coordinated deploy** of API + web + migration (column drop is breaking for old clients that POST `icon` — acceptable if only this monorepo consumes the API).

## Testing

- Unit: exhaustive type map compiles; optional test that every `contactTypeSchema.options` entry has a defined icon key (or rely on TS only)
- Update core onboarding tests that assert icon fill behavior → delete or rewrite
- Manual: profile settings add/edit contact; public profile social row shows brand icons

## Success criteria

- [ ] No `icon` on contact table or contact API/forms
- [ ] All contact icons rendered via web utility
- [ ] New types selectable and display correct icons
- [ ] Typecheck fails if a new enum value lacks an icon entry
