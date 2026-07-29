# 37 — Mail → application match contracts

**What to build:** Pure heuristics in `packages/core` to extract company/title hints from mail and resolve match vs create vs ambiguous against open applications.

**Blocked by:** 31–33

**Status:** done

**Parent:** Career Inbox — Match unlinked mail (wave 7).

- [x] `extractMailApplicationHints` (from/domain/subject)
- [x] `normalizeCompanyKey` + free-mail domain skip
- [x] `resolveMailApplicationMatch` (matched | create | ambiguous | insufficient)
- [x] Exported from mail index
