# 17 — Settings island: AI page

**What to build:** `/dashboard/settings/ai` with island nav entry. Form: add/edit provider (name, key), model per feature (classify, reply, resumeImport, stacks, hubChat, scorer), mail reply Assist|Full. Uses existing settings shell + TanStack form patterns.

**Blocked by:** 16

**Status:** done

- [x] Route + nav item (Sparkles icon)
- [x] Load/save via oRPC query/mutation wrappers
- [x] Autonomy control clearly labeled (not under Notifications)
- [x] Keys shown masked after save
