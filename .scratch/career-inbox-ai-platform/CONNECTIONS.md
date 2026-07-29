# Connections — Settings guide

**Route:** `/dashboard/settings/connections`  
**Ticket:** `54`

## Product rule

| Flow               | Scopes                          | Where                              |
| ------------------ | ------------------------------- | ---------------------------------- |
| Google **sign-in** | `openid email profile`          | Sign-in page (when Google env set) |
| **Gmail connect**  | `gmail.readonly` + `gmail.send` | Settings → Connections             |
| GitHub             | Existing portfolio scopes       | Sign-in or Connections             |

Never request Gmail scopes at login. Users grant mail access only when they choose Connect Gmail.

## Setup

1. Google Cloud Console → OAuth client
2. Redirect: `{VITE_SERVER_URL}/auth/callback/google`
3. Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Gmail sync (wave 12)

- **Sync inbox** on Connections when Gmail scopes are granted
- First pull: recent `in:inbox` (25). Later pulls: History API deltas via stored `historyId`
- Messages land as `provider=gmail` with idempotent `providerMessageId`
- Classify is enqueued when Redis is available

## Next

Scheduled / push Gmail sync · smart rules CRUD · email notification channel
