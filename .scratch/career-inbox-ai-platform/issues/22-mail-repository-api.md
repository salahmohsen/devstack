# 22 — Mail repository + oRPC list/get

**What to build:** Repository `findByUserId` with category/label filters; default **exclude** `system_notification` purpose. Protected oRPC list + get for session tenant. Map rows to core output schemas.

**Blocked by:** 21

**Status:** done

- [x] `mailMessageRepository`: findByUserId (filters), findByIdForUser, create (for ingress later)
- [x] Category filter: applications/recruiters/interviews/offers via system labels; unsorted = no career/rule labels; all = non-system
- [x] `mail` router: `list`, `get` registered on app router
- [x] Typed NOT_FOUND on get when missing / wrong tenant
