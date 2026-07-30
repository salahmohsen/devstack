# 71 — Retrieval-ranked few-shot (lexical)

**Wave:** 19

- `scoreCorrectionSimilarity` + `selectCorrectionsForFewShot` in core
- Classify loads candidate pool (40), injects top-K similar corrections
- Weak scores → newest-K fallback
