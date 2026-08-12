# Job source label + New jobs / package actions

**Date:** 2026-08-12  
**Status:** Accepted (grilled lock A–G)  
**Goal:** Stop harvest structured-output failures on unknown platforms; align New jobs + package CTAs around real job descriptions; polish list actions.

## Decisions (locked)

### Sources

| #   | Decision                                                                              |
| --- | ------------------------------------------------------------------------------------- |
| B   | Platform enum stays closed; free-text only as display label                           |
| A   | New nullable column `application.source_label` / `sourceLabel`                        |
| C   | Server owns platform via `inferApplicationSource` (model must not invent enum values) |
| B   | Label: **code host map first**; model `sourceLabel` only if still null                |
| —   | Coerce invalid model `source` strings so structured output never fails the stream     |

### New jobs / package

| #   | Decision                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------- |
| —   | Empty JD = `!description?.trim()` only                                                                        |
| C   | No Track & package / Prepare application without JD; **Track only** still allowed                             |
| A   | Primary group: `[ Add job description \| View listing? \| ⋯ ]` or `[ Track & package \| View listing? \| ⋯ ]` |
| C   | After save JD: toast with **Track & package** action (no auto-run)                                            |
| A   | Hide “Update job description” in ⋯ while primary is Add job description                                       |
| D   | Row click opens side panel; Dismiss is `variant="destructive"`                                                |
| E   | Tracked list Group separators: View listing \| Edit \| ⋯                                                      |
| F   | Remove duplicate meta “View listing” text when action button present                                          |
| G   | Panel **Prepare application** gated the same way as New jobs package                                          |

## Implementation notes

- Harvest: strip/coerce invalid `source` in `coerceHarvestedJobInput`; always re-infer platform from URL/email on persist; set `sourceLabel` from host map then optional model label when platform is `other`.
- Web: fix `useItemsNavigation` wiring on New jobs (match Tracked jobs: `isItemOpen` as `Record`, local open state).
- `UpdateDescriptionDialog`: correct update input shape `{ id, data }`; optional `onSaved` for toast CTA.

## Non-goals

- User-managed custom source catalog
- Free-string `sourceTags`
- Auto package on description save
