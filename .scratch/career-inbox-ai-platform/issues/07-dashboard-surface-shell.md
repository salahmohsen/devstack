# 07 — Shared dashboard surface shell (main card)

**What to build:** Dashboard content areas that opt in share a **main surface card** shell (outer chrome unchanged). Settings (and later Mail) can compose this shell so section content sits on one consistent elevated surface. Minimal staggered fade-in support is available for children (island → content later).

**Blocked by:** None — foundation done.

**Status:** done

**Parent:** Career Inbox + AI platform — Shell wave.

- [x] Reusable surface shell component (app-local or `packages/ui` only if truly app-agnostic) using coss/`@tsu-stack/ui` Card or equivalent
- [x] Settings layout uses the surface shell without breaking existing tabs/routes
- [x] Fade-in utility or motion tokens for section enter (minimal, no bounce)
- [x] No Mail routes required yet — shell must be reusable for hub + settings
- [x] Matches design: main surface card inside dashboard content area
