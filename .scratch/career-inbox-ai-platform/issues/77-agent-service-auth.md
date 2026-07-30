# 77 — Agent service secret auth

**Wave:** 24 (production hardening)

## Goal

Authenticate all service-to-agent HTTP calls so the Mastra worker is not an open multi-tenant surface.

## Shipped when

- `AGENT_SERVICE_SECRET` env (server + agent)
- Agent middleware rejects `/api/*` workflow/agent calls without valid Bearer (timing-safe)
- Production refuses unauthenticated agent API if secret unset (503)
- Dev may run without secret with a one-time warning
- All server/API callers send `Authorization: Bearer …`
- Docs in CONNECTIONS / agent AGENTS.md

## Non-goals

- Full user JWT on agent (service identity only)
- Public Studio without secret (Studio must use the same secret header in prod)
