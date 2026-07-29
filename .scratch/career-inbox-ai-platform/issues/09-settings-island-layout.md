# 09 — Settings layout: island nav + content pane

**What to build:** Settings refactored to the **surface + darker island** convention. Island lists Profile, Account, Invites, Domain (existing). Content pane hosts the current `Outlet`. Tabs-only chrome may remain as secondary or be replaced by island nav — island is the primary navigation pattern per program design.

**Blocked by:** 07, 08

**Status:** ready-for-agent

**Parent:** Career Inbox + AI platform — Shell wave.

- [ ] Settings pages use surface + island layout
- [ ] Existing routes still work: profile, account, invites, domain
- [ ] Active section highlighted in island
- [ ] Mobile-friendly: island collapses or stacks without blocking content (reasonable v1)
- [ ] No new AI/Notifications sections required yet (those are later tickets)
- [ ] Fade-in: island then content on enter
