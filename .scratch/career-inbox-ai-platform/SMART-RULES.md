# Smart rules — guide

**Route:** `/dashboard/settings/rules`  
**Tickets:** `57`–`58`  
**Migration:** `packages/db/migrations/20260729233906_rainy_mathemanic/`

## Model

| Field                            | Role                                                  |
| -------------------------------- | ----------------------------------------------------- |
| `slug`                           | Label id → `rule:{slug}` on messages                  |
| `title` / `description` / `icon` | Hub category display                                  |
| `keywords[]`                     | Case-insensitive substring match on from/subject/body |
| `enabled`                        | Off rules skip match + hub nav                        |

## Surfaces

| Layer       | Location                                                        |
| ----------- | --------------------------------------------------------------- |
| Core        | `packages/core/src/mail/smart-rules.ts` — match + merge helpers |
| DB          | `mail_smart_rule` table + `mailSmartRuleRepository`             |
| API         | `mailSmartRules` router — list / create / update / delete       |
| Classify    | `run-mail-classify` loads enabled rules, merges `rule:` labels  |
| Settings UI | `/dashboard/settings/rules`                                     |
| Mail hub    | Enabled rules as category cards (before Unsorted / All)         |

## Classify

1. System heuristic / LLM for career labels
2. Keyword match for enabled smart rules (always, even on agent path)
3. Labels merge: system + existing non-system + `rule:`

Unsorted = no system career labels **and** no `rule:` labels.

## Ops

```bash
vp run db:migrate   # apply mail_smart_rule
```

Create a rule in Settings → Rules with keywords, then re-classify or wait for new mail.
