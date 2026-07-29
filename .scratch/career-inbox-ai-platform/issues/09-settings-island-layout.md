# 09 — Settings layout: island nav + content pane

**What to build:** Settings refactored to the **surface + darker island** convention. Island lists Profile, Account, Invites, Domain (existing). Content pane hosts the current `Outlet`. Tabs-only chrome may remain as secondary or be replaced by island nav — island is the primary navigation pattern per program design.

**Blocked by:** 07, 08

**Status:** done

**Parent:** Career Inbox + AI platform — Shell wave.

- [x] Settings pages use surface + island layout
- [x] Existing routes still work: profile, account, invites, domain
- [x] Active section highlighted in island
- [x] Mobile-friendly: island collapses or stacks without blocking content (reasonable v1)
- [x] No new AI/Notifications sections required yet (those are later tickets)
- [x] Fade-in: island then content on enter
