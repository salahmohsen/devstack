# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary work happens for two peer audiences:

- **Signed-in operator** — the tenant who runs Career Inbox, applications, resumes, stacks, AI providers, and apply packages from the dashboard.
- **Public visitor** — someone on `/{username}` or a verified custom domain evaluating the portfolio and public GitHub surface.

The product purpose is the apply assistant. The public site is how that work is shown, not a lesser audience.

## Product Purpose

DEVSTACK is a job-apply assistant: ingest career mail, track applications, generate apply packages, and talk to a hub agent — then publish the resulting evidence on a public portfolio/repos site owned by the same account.

Success is a closed loop: a real hiring signal in mail can become a tracked application, a drafted package, and an up-to-date public profile without leaving the tenant’s own keys and data.

## Positioning

The product is the apply assistant (hub chat, mail, HITL, apply packages). The public site exists to show the work. A neighboring portfolio builder or a generic inbox would not own that loop.

## Operating Context

- Invite-gated signup after the first user; empty DB bootstraps the first operator.
- Multi-tenant: private rows scoped by Better Auth `userId`; public RPCs resolve `username` and/or Host → `userId`.
- Dashboard, auth, and path portfolios live on the primary app host. Optional verified custom domains map Host → that tenant’s public site.
- Operators terminate TLS; the app verifies domain ownership and routes by Host.
- Local and self-hosted Docker (Dokploy) are the running environments. Dev is `pnpm dev` / Vite Plus.

## Capabilities and Constraints

Confirmed:

- Career Inbox (optional BYO Resend), applications CRM, resumes, experiences, projects, stacks, notifications, smart mail rules.
- BYO AI: per-tenant sealed provider keys in Settings → AI. No platform-funded model budget. Missing keys degrade AI features; CRUD still works.
- Career mail requires the user’s Resend key and sender address. Inbound additionally requires their webhook secret; transactional auth/product mail uses optional operator Resend configuration.
- Public GitHub surface uses that tenant’s OAuth token server-side, never a global env PAT.

Terminology that must stay: `username` (path + Better Auth identity), invite, custom domain, tenant `userId`, BYO AI, BYO Resend.

Undecided (do not invent): pricing, licensing, open registration, a single marketing homepage strategy beyond the existing community landing.

## Brand Commitments

- **Public name:** DEVSTACK (navbar wordmark).
- **Internal/code:** `tsu-stack`, `personal-hub`.
- **Email / SEO:** use DEVSTACK (not DevHub or DEV-STACK).
- Voice: product UI, short, task-first. Do not add promotional claims.

## Evidence on Hand

- Live product in this repo: dashboard settings, Career Inbox, public portfolio/repos, invite email templates.
- Design/program specs under `docs/superpowers/specs/` and glossary in `CONTEXT.md`.
- No customer testimonials, press, benchmarks, or pricing pages. Future work must not fabricate them.

## Product Principles

1. The apply loop is the product; the public site is how the work is shown.
2. Operator and visitor surfaces are both first-class; neither may ship as an afterthought.
3. Tenant-owned secrets and data: BYO keys, no implied platform AI or mail budget.
4. Use the glossary’s words (`username`, invite, custom domain, BYO). Do not rename them in UI for flavor.
5. Do not invent social proof, customers, or capabilities the app does not have.

## Accessibility & Inclusion

No product-specific standard was set in init. Default to the existing app’s keyboard/focus patterns and WCAG-oriented component work; do not claim a formal certification.
