# 06 — Logging hygiene and first `evlog map` baseline for web

**Status:** done

**Branch:** `chore/upgrade-evlog-cli` (foundation wave)

- [x] Spot-check: request middleware patterns unchanged; no new double-emit wrappers added
- [x] `evlog map` runs for web with `--framework tanstack-start`
- [x] Baseline score recorded: **53/100** (needs work); 42 entry points; health live probe suppressed via disable comment
- [x] Health liveness uses `evlog-map-disable-next-line` (deliberately silent)
- [x] No drive-by logging spam to raise score (remaining FIX FIRST are files/resume routes for later)

**Baseline (2026-07-29):** `vp run log:map` → score **53**, grade needs work, ▲53→76 if top 3 file routes instrumented.
