---
name: crm-stage-policy
description: >
  Use when proposing an Applications pipeline stage or terminal outcome from career mail labels
  and current application state. Code still enforces no stage downgrade.
version: 1.0.0
tags:
  - mail
  - crm
  - stages
---

# CRM stage policy

Propose `targetStage` and optional `targetOutcome` for an open application after mail classification.

## Stages (board order)

`saved` → `applied` → `screening` → `interview` → `offer`

## Soft priors from system labels

| Label                            | Typical stage |
| -------------------------------- | ------------- |
| application / application_status | applied       |
| recruiter                        | screening     |
| interview                        | interview     |
| offer                            | offer         |

You may deviate when the mail body clearly indicates a different stage.  
**Never** propose a stage earlier than current stage (monotonic advance) — if the mail only re-states past progress, return the current stage or omit targetStage.

## Outcomes

Only propose terminal `targetOutcome` (`rejected` | `withdrawn` | `ghosted` | `accepted`) when the mail clearly closes the loop. Prefer stage advance for process updates.

## Output

- `targetStage` optional
- `targetOutcome` optional
- `reason` short audit string
