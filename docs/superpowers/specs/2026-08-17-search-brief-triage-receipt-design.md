# Search brief must not invent New jobs triage

**Date:** 2026-08-17  
**Status:** locked from local RCA  
**Hardening:** after implementation run [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md)

## Problem

Asking “what are my jobs goals?” correctly calls `getSearchBrief` and paints `search-brief.md`. The same bubble also shows a **Cancelled** New jobs triage card (inbox rows + “No longer pending”).

Stored `uiMessages` for that turn have only `getSearchBrief`. The model did not call `listNewJobs` or `proposeNewJobsTriage`.

`HubCancelledTriageReceipt` runs on every assistant bubble. `cancelledTriageCardInputFromParts` was built to recover a card when `listNewJobs` ran and the HITL tool never mounted. On a silent card-only turn it falls through to **current inbox** rows. Today already short-circuits (`getDailyBrief` / `openDailyBrief`). Search brief does not. History remount then stamps the fake card `cancel`.

## Success

- A `getSearchBrief`-only turn shows the File Diff and **no** New jobs triage card.
- A silent assistant message with inbox rows and no `listNewJobs` / triage leak does **not** invent a receipt.
- Processor-leak recovery still hydrates from `listNewJobs` on **this** message, or from fallback **only** when leak text is on the message.
- A real `proposeNewJobsTriage` part still owns the turn (helper returns null).
- Spoken pile status still returns null.

## Non-goals

- Changing when the model calls `listNewJobs` / `proposeNewJobsTriage`.
- Redesigning the live Confirm card.
- Resetting inbox rows.

## Approach

Same class as the Today skip already in this helper:

1. Return null when the message has `getSearchBrief` / `get-search-brief`.
2. Use `fallbackJobs` only when this message has triage-processor leak text. Empty + inbox is not a leak.

`HubCancelledTriageReceipt` can keep passing inbox as the fallback argument. The helper decides whether that argument is allowed.
