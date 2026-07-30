# Review queue — guide

**Tickets:** `41`–`46` (queue), `47`–`49` (send), `69`–`70` (Mastra reply)  
**Route:** `/dashboard/review`

## Goal

Durable **Assist** queue for reply drafts (and later other confirmations). Users edit, **Send reply**, or discard. **Full** autonomy auto-sends after draft creation.

## Flow

```text
Career mail classified (system labels)
  → mail-reply-workflow (LLM) or heuristic fallback
  → pending review_item
  → Assist: /dashboard/review → edit → Send reply (Resend)
  → Full: auto-send with BYO/platform Resend key

Mail reader “Draft with agent”
  → same createReplyDraftFromMail (idempotent)
  → navigate to Review (unless Full already sent)
```

## Reply draft sources (wave 18)

| Source      | When                                                |
| ----------- | --------------------------------------------------- |
| `llm`       | `AGENT_WORKER_URL` + `mail-reply-workflow` succeeds |
| `heuristic` | Agent down, missing key, timeout, or invalid output |

Job context (linked application company/title/stage) is injected when present; missing job context still drafts (send stays Assist-gated).

## Send config

| Preference | Source                                             |
| ---------- | -------------------------------------------------- |
| API key    | Settings → Mail BYO key, else `RESEND_API_KEY`     |
| From       | Settings → Mail inbound address, else `EMAIL_FROM` |

## Reply CRM tools (wave 21)

`list-open-applications` + `get-application` (tenant `userId` via requestContext). Agent may call tools before structured draft.

## Out of scope (later)

- Evidence search tools
- Threading headers / In-Reply-To
- Per-user model override for reply feature
