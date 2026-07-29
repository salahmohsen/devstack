# 07 — Shared dashboard surface shell (main card)

**What to build:** Dashboard content areas that opt in share a **main surface card** shell (outer chrome unchanged). Settings (and later Mail) can compose this shell so section content sits on one consistent elevated surface. Minimal staggered fade-in support is available for children (island → content later).

**Blocked by:** None — foundation done.

**Status:** ready-for-agent

**Parent:** Career Inbox + AI platform — Shell wave.

- [ ] Reusable surface shell component (app-local or `packages/ui` only if truly app-agnostic) using coss/`@tsu-stack/ui` Card or equivalent
- [ ] Settings layout uses the surface shell without breaking existing tabs/routes
- [ ] Fade-in utility or motion tokens for section enter (minimal, no bounce)
- [ ] No Mail routes required yet — shell must be reusable for hub + settings
- [ ] Matches design: main surface card inside dashboard content area
