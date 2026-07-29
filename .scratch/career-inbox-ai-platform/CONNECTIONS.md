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

## Next

Gmail History API sync into `mail_message` (separate tickets).
