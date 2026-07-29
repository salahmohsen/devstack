# Review queue — wave 8 guide

**Tickets:** `41`–`46`  
**Route:** `/dashboard/review`

## Goal

Durable **Assist** queue for reply drafts (and later other confirmations). Users edit, **Send reply**, or discard. **Full** autonomy auto-sends after draft creation.

## Flow

```text
Career mail classified (system labels)
  → heuristic reply draft (pending review_item)
  → Assist: /dashboard/review → edit → Send reply (Resend)
  → Full: auto-send with BYO/platform Resend key

Mail reader “Draft with agent”
  → same createReplyDraftFromMail (idempotent)
  → navigate to Review (unless Full already sent)
```

## Send config

| Preference | Source                                             |
| ---------- | -------------------------------------------------- |
| API key    | Settings → Mail BYO key, else `RESEND_API_KEY`     |
| From       | Settings → Mail inbound address, else `EMAIL_FROM` |

## Out of scope (later)

- Mastra reply agent / job context tools
- App notification bell for `draft_ready`
- Threading headers / In-Reply-To
