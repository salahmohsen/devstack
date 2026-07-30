# 78 — Gmail Pub/Sub OIDC push verify

**Wave:** 24 (production hardening)

## Goal

Prove Gmail push requests come from Google Pub/Sub (OIDC JWT), not anonymous clients.

## Shipped when

- Verify Google JWKS JWT on `POST /webhooks/gmail-push`
- Config: `GMAIL_PUSH_OIDC_AUDIENCE` (push URL), optional `GMAIL_PUSH_OIDC_EMAIL`
- Shared secret still accepted as alternate credential
- Production requires **at least one** of OIDC audience or shared secret (`GMAIL_PUSH_REQUIRE_AUTH` default on in prod)
- Opaque 200 responses; failures 401
- CONNECTIONS.md updated

## Non-goals

- Full GCP IAM policy management
