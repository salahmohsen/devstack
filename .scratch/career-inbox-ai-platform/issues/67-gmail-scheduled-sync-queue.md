# 67 — Scheduled Gmail sync queue

**Wave:** 17

- BullMQ queue `gmail-sync`
- Tick every 15m → fan-out user jobs
- Worker runs existing `syncGmailInbox`
