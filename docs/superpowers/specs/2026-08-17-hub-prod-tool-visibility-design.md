# Hub production tool visibility

**Date:** 2026-08-17  
**Status:** locked from production RCA  
**Hardening:** after implementation run [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md)

## Problem

Production hub chat looked like tools “don’t render.” Three stacked causes:

1. The model narrates “Let me pull the stack list” and `onIterationComplete` stops with **zero** tool parts (OM window already ≥ 30k tokens).
2. When `listStacks` does run, it has **no standalone toolkit UI**. Working-strip tools hide `ToolFallback`; Agent Activity `collapseOnComplete` leaves `Thought for 0s`.
3. Apply-package structured output (`skills[].band`) **crashes the stream** when the model omits `band` or uses “must-have”.

`listHubMessages.uiMessages` already maps `tool-invocation` → `tool-<name>`. This is not a history-mapper bug.

## Success

- Everyday “pull / filter / show my stacks / skills I use” **calls `listStacks` this turn**.
- Prelude lines (“Let me pull…”) do not stay as the only visible answer.
- A completed `listStacks` paints a catalog (grouped chips), like the experience timeline.
- The latest assistant’s Agent Activity stays open after complete (not a 28px `Thought for 0s` row).
- Job-skill structured output accepts missing/alias `band`; sanitize still drops garbage (`maybe`).
- Unauth `:4111/chat/hub-supervisor` stays 401.

## Non-goals

- Resetting the user’s 30k-token production thread from the server.
- Custom catalog UIs for every `list*` tool (experiences already have one; stacks were the prod pain).
- Changing the Mastra memory mapper.

## Approach

Same class as Today / inspect:

- Detector in `@tsu-stack/core` (`userTurnAsksStackCatalog`).
- `HubStackCatalogProcessor` + `onIterationComplete` continue while the list is missing.
- Hide promised-catalog prelude text in the hub thread.
- Standalone `listStacks` / `list-stacks` toolkit renderer.
- `collapseOnComplete` only for **older** assistant messages.
- Loose LLM schema for `LinkedJobSkillsPayloadSchema`; keep `sanitizeLinkedJobSkills` as the strict gate (default missing band → `required`; map must-have / nice-to-have).
