# 28 — Mail classify persist

**What to build:** Repository method to apply classification (`labels`, `classifiedAt`) tenant-scoped.

**Status:** done

- [x] `mailMessageRepository.applyClassification(id, userId, labels)`
- [x] Skip re-classify when `classifiedAt` already set
