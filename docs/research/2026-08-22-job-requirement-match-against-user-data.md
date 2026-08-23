# How Freehire and competitors rate job requirements against user data

**Date:** 2026-08-22  
**Question:** How do production career products score a listing’s requirements against a seeker’s catalog, and what should DevHub’s Match (Have / Close / Missing) copy instead of treating capability phrases like `frontend development` as missing skills?  
**Companion:** [Job-tailored resumes](./2026-08-22-job-tailored-resumes-ats-and-humans.md) (ATS vs humans). Product lock: [Hub job context](../superpowers/specs/2026-08-22-hub-job-context-design.md) frozen #17–#18. Source study: `/tmp/freehire-analysis/freehire` ([strelov1/freehire](https://github.com/strelov1/freehire)).

---

## Executive recommendation

Ship **two layers**. Do not merge them.

1. **Inspect Match (now, $0, dict-only).** Canonical **tool tokens** only. Exact / Close / Missing. Unknown and capability phrases **leave the denominator** — they are not Missing chips and they do not create stacks. `%` = Have / checkable tokens. LLM never computes this bar.
2. **Fit / apply-kit (already planned).** Huntr/Freehire 3-stage: qualifications and responsibilities vs evidence. Role phrases (`frontend development`, `ui/ux design`) live here or in the five-bullet take, never as catalog rows.

Do **not**: infer Have from “they have React so they do frontend development”; create a stack named that phrase; write a create-and-assign-to-job RPC; pull Lightcast/ESCO as a vendor.

The screenshot bug is **ingest**, not the classifier: a phrase was stored as a listing skill. Freehire never emits it. Jobscan would put it in a lower-weight soft-skill bucket. LinkedIn would treat it as a qualification line, not a skill-endorsement chip.

---

## Freehire (primary: source)

Three surfaces. They disagree on purpose.

### 1. Deterministic job↔profile match (`GET /jobs/{slug}/match`)

Source: `internal/jobmatch/jobmatch.go`, `internal/skilladjacency/skilladjacency.go`, `docs/API.md`.

- Input: job skills and profile skills as **canonical slugs** from `internal/skilltag`. No LLM.
- Each job skill is **exact** (held), **adjacent** (a curated neighbour is held, with `via`), or **missing**.
- Coverage: `round((exact + 0.5 * adjacent) / total * 100)`. Adjacent is half a Have, not zero.
- Adjacency is tiny and conservative: PyTorch↔TensorFlow, Postgres↔MySQL↔MariaDB, AWS↔GCP↔Azure, React↔Vue↔Angular, Kafka↔RabbitMQ, FastAPI/Flask/Django, Express↔Nest. **No role inference.** React does **not** make `frontend development` adjacent.
- Empty job skills → hide the bar (unverifiable), never 0%.

DevHub Close families are a subset of this table (cloud, SPA, plus JS↔TS). Frozen #16 says Close does **not** count toward `%`. Freehire counts it at 0.5. That is the only numeric delta worth a lock amendment.

### 2. Skill tagging at ingest (`internal/skilltag`)

Source: `internal/skilltag/AGENTS.md`, `dictionaries.go`, `interchangeable.go`, `canonicalize.go`.

- Curated alias → canonical. **Emit nothing for unknowns. Never guess.**
- Canonicals are tools and named methods (`react`, `postgresql`, `tdd`, `a11y` as alias of `accessibility`). There is a `// frontend` comment grouping React/Vue/… — **there is no canonical `frontend-development`.**
- Two alias kinds, not one:
  - **Search fold** (many-to-one): `spring boot` → `spring` so facets do not fragment. Must not rewrite a CV through this table (would invent Spring Boot from Spring).
  - **Interchangeable surfaces** (same skill, other spelling): `React.js`/`ReactJS`, `k8s`/`Kubernetes`, `a11y`/`accessibility`. Safe to rewrite.
- Ambiguous English (`go`, `react` as a verb) is gated: weak tokens need nearby technology before they count.

This is the production rule DevHub harvest currently violates when a listing stores `frontend development` as a skill tag.

### 3. LLM 3-stage fit (`POST /jobs/{slug}/fit`) — not the inspect bar

Source: `openspec/specs/job-fit-analysis/spec.md`, `openspec/specs/tailor-job-match/spec.md`.

- Stage 1 extracts **requirement lines** and classifies each `covered` | `synonym-only` | `missing-but-have` | `missing-gap`, with required/preferred and evidence strength (`metric` | `scope` | `responsibility` | `keyword`).
- Prompt is **grounded** in the deterministic exact/adjacent/missing list. The model must not recompute skills.
- **Unverifiable rule:** a requirement that names **none** of the vacancy’s canonical skills (example in spec: “strong communication skills”) is **excluded from the denominator**. Cached status may be shown labelled as from the earlier analysis. It is not Missing.
- Required outweighs preferred inside Requirements Coverage (40 of 100 on the **tailored PDF** score). Other weights: keyword 30, title 20, seniority 10.
- Server owns overall score; hard-constraint ceiling can cap an optimistic model. Skills coverage dimension must stay consistent with the dict match.

DevHub already locked this as apply-package 3-stage, not land/Find now.

---

## Competitors (first-party / vendor docs)

| Product                                                                                 | What it scores                                                                                                                                                                   | Soft / role phrases                                                                                                                                             | Catalog write                                                                                                            |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Jobscan** ([match rate docs](https://www.jobscan.co/resume-scanner))                  | Weighted: hard skills, then education (only if JD asks an advanced degree), job title, **soft skills**, other keywords. Count in JD vs count on resume.                          | Separate, lower-weight bucket. “Office management / patient care” style phrases are keywords to **phrase on the resume**, not skills to add to a stack catalog. | None. Diagnostic for tailoring.                                                                                          |
| **LinkedIn Job Match** ([help](https://www.linkedin.com/help/linkedin/answer/a7120158)) | Profile **and** resume vs hirer **required and preferred** qualifications + screening questions. Recruiter sees `N/M` skills match, and **which role the skill is attached to**. | Qualifications, not skill chips. Unattached skills are weaker than skills evidenced on a role.                                                                  | Skills live on the profile, attached to experience.                                                                      |
| **Teal** ([tealhq.com](https://www.tealhq.com/), 2026 reviews)                          | Resume↔JD keyword match; hard vs soft lists on the tracker. Numeric % often gated behind Plus.                                                                                   | Soft list is visible but not a catalog.                                                                                                                         | Keywords suggested onto **that job’s resume**, not a global skill graph.                                                 |
| **Huntr** ([huntr.co](https://huntr.co))                                                | Three scores: **keywords**, **qualifications**, **responsibilities**. Traffic-light coverage.                                                                                    | Role/capability language is qualifications/responsibilities, not the keyword skill list.                                                                        | Add recommended skills onto the **tailored resume**. Tailored vs base: ~2× interview rate (Huntr Q1 2026: 139,927 apps). |
| **SkillSyncer**                                                                         | Match % vs pasted JD; missing keywords ranked by **employer mention frequency**.                                                                                                 | Frequency-weighted keywords, including phrases.                                                                                                                 | Resume wording, not a graph.                                                                                             |
| **ESCO / O\*NET / Lightcast**                                                           | Occupation taxonomies. Lightcast ~33k skills, split **specialized software** vs general/transversal. O\*NET “programming” vs Lightcast “Python”.                                 | `frontend development` sits at occupation/cluster altitude. `React` is a specialized software skill.                                                            | Labour-market analytics, not a personal CRM. Do not take as a runtime vendor for DevHub.                                 |

Shared production pattern: **do not put transversal/role language in the same set as tools.** Hard skills / keywords / attached skills drive the honest chip bar. Soft skills, qualifications, and responsibilities are a second report (or a take). Nobody serious auto-creates a catalog row from “frontend development.”

---

## What DevHub does today vs that bar

| Rule                                | Freehire / competitors                        | DevHub now                                                          | Hub-job-context lock                                      |
| ----------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| Unknown phrase on listing           | Dict emits nothing                            | Can persist as a skill tag → Missing chip                           | Phrases are **not** chips; take only if evidence supports |
| `frontend development` + held React | Not a canonical; not adjacent                 | Test `leaves capability phrases in Missing` (`skill-match.test.ts`) | Cannot create a stack                                     |
| Adjacent / Close in `%`             | 0.5                                           | 0                                                                   | Close does not count                                      |
| Required vs preferred in `%`        | Required weighs more (fit + Jobscan/LinkedIn) | Unweighted unique tags                                              | `%` = Have / listed tokens                                |
| LLM on inspect bar                  | Never                                         | Land take is separate; Match is `classifyJobSkills`                 | Match is deterministic core                               |
| “I have it”                         | Profile skill picker / resume tailor          | Alias picker, or hub create-skill if catalog empty                  | Alias; phrase → evidence; unknown **tool** → create skill |

The screenshot (30%, Have react/js/ts, Missing includes `frontend development`, `ui/ux design`, `responsive ui`, `api building and testing`, plus real tools `http` / `postman`) mixes two altitudes in one list. That is why the bar feels wrong even when the classifier is “correct” on the stored tags.

---

## Smarter option to ship (production quality, no new vendor)

### A. Fix ingest (highest leverage)

At land / harvest / refresh-from-URL, run listing skill strings through the same canonicalize as Match:

- Known tool or alias → canonical display (existing `CANONICAL_SKILL_ALIASES` + catalog names).
- Capability / role / transversal phrase → **drop from `requiredSkills` / `preferredSkills`**. May still inform the take.
- Never persist a token the dict cannot resolve.

This is Freehire `skilltag`: emit nothing for unknowns. It makes the screenshot class of bug impossible without touching “I have it.”

### B. Keep inspect Match as dict Have / Close / Missing

- Chips = checkable canonicals only.
- Have = name + aliases + interchangeable surfaces (React.js → React). Not search-fold (Spring Boot ↛ Spring as Have).
- Close = existing small families. Optional lock amendment: count Close as 0.5 like Freehire so 3 Have + 1 Close of 9 checkable reads ~39%, not 33%. Default stay at 0 until we decide.
- `%` denominator = checkable tokens. Null when none (already).
- Optional: weight `required` 1.0 and `preferred` 0.5 inside that denominator (LinkedIn/Jobscan/Freehire requirements coverage). Not required for v1 if ingest is clean.

### C. Role phrases stay out of the catalog

`frontend development` is occupation-level (Lightcast/O\*NET), not a stack. Evidence that the seeker is a frontend engineer belongs in:

- Agent take (“Strong match on role … React is a featured listing stack”) — already in the screenshot, and that bullet is the right place; **and/or**
- 3-stage requirement match later (`covered` / `synonym-only` against experience text).

Do not mark it Have on the chip bar. Do not open Create skill for it.

### D. “I have it” only for canonical missing tools

`http`, `postman`: alias picker **plus** Create skill that **pushes the skill form in the same side panel** (ADR 0025 chrome, stack push/pop), pops back to this job inspect, invalidates stacks + application. `stacks.create` (name = token or chosen name) is enough. **No** assign-to-job write: the listing already named the token.

Phrases: no chip, so no I have it. If take offers “I have this,” frozen #18 still holds: evidence Confirm or snapshot phrasing.

### E. Do not LLM the bar

Inspect Match stays `classifyJobSkills`. Ground any later fit prompt in that output (Freehire job-fit-analysis requirement). Land take can mention role coverage in prose without putting the phrase in `missing[]`.

---

## What we should not copy

- Jobscan’s user-facing “ATS match rate” trophy (already forbidden in hub-job-context non-goals).
- Lightcast 33k taxonomy as a runtime dependency.
- Huntr’s resume-keyword stuffing loop as the inspect Match (that is apply-kit snapshot wording).
- Inferring Have for every Lightcast “necessary skill” of the occupation (would mark Frontend Development Have for anyone with HTML).

---

## Sources

- Freehire `internal/jobmatch/jobmatch.go`, `internal/skilladjacency/skilladjacency.go`, `internal/skilltag/{AGENTS.md,dictionaries.go,interchangeable.go,canonicalize.go}`, `openspec/specs/job-fit-analysis/spec.md`, `openspec/specs/tailor-job-match/spec.md`, `docs/API.md` (`GET /jobs/{slug}/match`).
- Jobscan match-rate calculation: [jobscan.co/resume-scanner](https://www.jobscan.co/resume-scanner).
- LinkedIn Job Match: [linkedin.com/help/linkedin/answer/a7120158](https://www.linkedin.com/help/linkedin/answer/a7120158).
- Huntr keyword / qualification / responsibility split: [huntr.co](https://huntr.co); Q1 2026 tailor conversion: [huntr.co/research/job-search-trends-q1-2026](https://huntr.co/research/job-search-trends-q1-2026).
- Teal resume↔JD match: [tealhq.com](https://www.tealhq.com/).
- Lightcast skills vs O\*NET altitude: [lightcast.io/products/data/our-taxonomies](https://lightcast.io/products/data/our-taxonomies), [lightcast.io/resources/blog/onet-skills-lightcast-skills](https://lightcast.io/resources/blog/onet-skills-lightcast-skills).
