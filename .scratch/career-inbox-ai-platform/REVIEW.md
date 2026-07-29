# Review queue — wave 8 guide

**Tickets:** `41`–`46`  
**Route:** `/dashboard/review`

## Goal

Durable **Assist** queue for reply drafts (and later other confirmations). Users edit, confirm, or discard. **Full** autonomy marks `sent` (outbound still stubbed).

## Flow

```text
Career mail classified (system labels)
  → heuristic reply draft (pending review_item)
  → /dashboard/review list + editor
  → Confirm (assist) | Confirm→sent stub (full) | Discard

Mail reader “Draft with agent”
  → same createReplyDraftFromMail (idempotent)
  → navigate to Review
```

## Out of scope this wave

- Real Resend outbound send of replies
- Mastra reply agent / job context tools
- App notification bell for draft_ready
