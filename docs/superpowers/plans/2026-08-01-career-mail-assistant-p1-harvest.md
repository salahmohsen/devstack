# Career Mail Assistant P1 — Job harvest (shipped)

**Branch:** `feature/career-mail-assistant-p0`  
**Commit:** `98b52c6`  
**Date:** 2026-08-01

## Goal

When a mail is labeled `job_notifier`, harvest job listings into Applications (match-filtered).

## Architecture

```text
classify → labels include job_notifier
  → enqueue mail-job-harvest
  → runMailJobHarvest:
       harvestJobsFromMailBody (links + card parse)
       optional HTTP enrich (applyMethod / applyUrl)
       scoreJobAgainstPreference
       applicationRepository.create (dedupe by url)
       emit mail.job_alerts_ready
```

### Mastra

| Piece                       | Role                                              |
| --------------------------- | ------------------------------------------------- |
| `jobPageExtractor` agent    | Structured extract (Studio / future LLM refine)   |
| `mail-job-harvest-workflow` | Extract jobs from mail body (Studio)              |
| Server worker               | **Production path** — DB + fetch + score + notify |

Primary production path is **server** (same as classify orchestration). Email body parse is primary because LinkedIn pages often block fetch.

## How to verify

1. Redis + server running (`REDIS_URL` set) so harvest worker starts
2. Settings → Jobs: set keywords e.g. `frontend`, work mode remote, min match 40
3. Sync/classify a LinkedIn job alert mail (or re-classify after clearing `classified_at`)
4. Expect Applications created + notification `mail.job_alerts_ready`
5. Unit: `npx vitest run src/mail/__tests__/job-harvest.test.ts` in packages/core

## Follow-ups

- Re-harvest admin button / clear classifiedAt for backfill
- Stronger LLM refine via agent.generate when title unknown
- Google redirect unwrapping with multi-hop fetch
- Junction table for N apps ↔ 1 mail (today first app only linked on message)
