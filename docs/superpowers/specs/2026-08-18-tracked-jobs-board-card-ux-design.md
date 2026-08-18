# Tracked jobs board card UX

**Date:** 2026-08-18  
**Status:** Approved for implementation

## Goals

- Column card lists use coss `ScrollArea` so scrollbars auto-hide when the pointer is not over the area (built-in; no custom hide logic).
- More vertical space and cleaner alignment for board cards.
- One visible primary CTA per card, driven by apply-package / outreach readiness.
- Concise, consistent action labels across the primary button, ⋮ menu, and right-click menu.

## Primary CTA rules

Shared helper `getApplicationPrimaryAction(app)`:

| Priority | Condition                        | Label            | Behavior                  |
| -------- | -------------------------------- | ---------------- | ------------------------- |
| 1        | No package + has job description | **Prepare**      | Generate apply package    |
| 2        | No package + no JD               | **Add JD**       | Open edit sheet           |
| 3        | Draft package                    | **Review**       | Open package sheet        |
| 4        | Accepted + `canSendOutreach`     | **Send**         | Open send-outreach dialog |
| 5        | Has listing/apply URL            | **Open listing** | `window.open` listing URL |
| 6        | Else                             | _(hidden)_       | —                         |

Full actions remain available via ⋮ and right-click. Overlapping menu items use the same labels (`Prepare`, `Review`, `Send`, `Open listing`).

## Layout

- Stage column body: `ScrollArea` with `fill` (replace `overflow-y-auto`).
- Card: tighter header, badges, then primary button; remove redundant text apply links from the board card (list view unchanged this pass).
- Polish: concentric radii (column `rounded-xl` + `p-1.5` → cards `rounded-lg`), press scale on primary button.

## List view

- List action strip uses the same `ApplicationPrimaryActionButton` (`layout="inline"`, `size="default"`) so height matches Edit / overflow controls in the `Group`.
- ⋮ menu still includes Open listing when the strip primary is Prepare / Review / Send.

## Out of scope

- New AI workflows beyond existing generate / package / send-outreach.
