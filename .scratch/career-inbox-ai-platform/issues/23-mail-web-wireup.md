# 23 — Wire web mail UI to real API

**What to build:** Replace mock list/reader data with oRPC + TanStack Query. Prefer real empty state over mock fallback. Keep hub category chrome; counts can be zero until aggregate endpoint exists.

**Blocked by:** 22

**Status:** done

- [x] Slice-local `api/` query wrappers for mail list/get
- [x] Category page loads list from API by category id
- [x] Reader loads body from get (or list detail fields)
- [x] Empty state when no messages (no silent mock data)
- [x] Mock file reduced to fixtures/dev helpers only if still useful
