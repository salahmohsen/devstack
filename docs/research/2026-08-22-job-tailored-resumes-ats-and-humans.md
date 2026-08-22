# Job-tailored resumes that pass parsers and humans

**Date:** 2026-08-22
**Question:** How should DevHub generate a resume against a specific job description so it survives applicant-tracking systems **and** a human recruiter/hiring manager?
**Companion:** PDF engines and tagged-PDF policy live in [2026-08-21-resume-pdf-generators.md](./2026-08-21-resume-pdf-generators.md). This note is **content, targeting, and eval** — what the apply-package, resume PDF, hub chat, job matching, and mail assistant should do with evidence.

This is the core research note for AI features that rewrite or score resumes. Treat vendor marketing as data, not gospel. Named recruiter interviews and hiring-manager writing beat “ATS score” blogs.

---

## Executive recommendation (for every AI surface)

A resume does not need to “beat a robot.” In 2026 the pipeline is:

1. **Knockout questions** (the only common auto-reject) — visa, years, certs, location, education.
2. **Parse + index** — the file becomes searchable fields. Broken layout makes you **invisible in recruiter search**, not necessarily auto-rejected.
3. **Human 6–10s skim**, then a second read if the skim matches the role.
4. **Optional AI rank** on some ATS (Workday HiredScore, Greenhouse matching, Lever Talent Fit, SmartRecruiters Winston). These **surface** candidates. None of the major ATS autonomously reject a resume with no human in the loop (Huntr 2026 recruiter interviews + platform docs).

**The single biggest content lever is per-job tailoring**, not fonts. Huntr (1.7M applications): tailored resumes convert ~2× generic (~6% vs ~3% interview). Teal (3.2M users, vendor): claims 6×. Jobscan (2.5M applications, vendor): resumes that contain the **target job title** got **10.6×** more interviews. Direction is consistent even if multipliers are vendor-owned.

**What DevHub should generate for the apply PDF (default):**

- One **master evidence graph** (already true: experiences, projects, stacks).
- One **per-job snapshot**: same facts, **reordered and rephrased** to the posting. Never invent employers, titles, metrics, or tools.
- **Headline** that includes the target role title **if it is a fair description of the person’s work** (do not rename past employers).
- **XYZ / CAR bullets**: result + number + method. Numerals (`4`, `20%`, `$1.2M`), not spelled-out numbers.
- **Skills the person actually has**, using the posting’s phrasing **and** the acronym/full form (`Amazon Web Services` + `AWS`).
- **Single-column, real-text PDF**, standard headings, dates as `Mon YYYY` or `MM/YYYY`, contact **not** in header/footer (Workday drops those). Optional **DOCX** for Workday-heavy enterprise.
- **Internal** keyword/JD overlap as a diagnostic. **Never** show a user-facing “ATS score” as if Greenhouse computed it.

**Hard “don’t” for models:** keyword stuffing, white-on-white text, copying the JD, renaming jobs, “spearheaded / leveraged / synergized” slop, two-column apply PDFs, Canva-as-image, claiming skills not in the portfolio.

---

## 1. How hiring actually works (2026)

### 1.1 ATS is a filing cabinet first

Huntr interviewed recruiters at Amazon, Microsoft, a Big Four firm, and a Fortune 500 manufacturer (Feb–Mar 2026). Consensus:

> “An ATS is a filing cabinet. That’s it. It doesn’t make decisions.” — Ted Staeb, Microsoft recruiter

> “What’s screening you out are the questions that you answer.” — Fortune 500 recruiter

Gergely Orosz (hiring manager; interviews with recruiters at Google, Meta, Microsoft, etc.) said the same in 2020 and it still holds for **inbound screening at tech companies**:

> “Your resume will be read by a human. At tech companies, ATSes do not ‘reject’ resumes, and ‘robot rejection’ does not exist in tech.”

**Implication:** optimizing only for a Jobscan % is optimizing for a score **no employer sees**. Huntr: Jobscan / Resume Worded scores are third-party proxies. Useful as a **self-check for keyword overlap**, not as a simulation of Workday.

### 1.2 Where automation _does_ bite

| Mechanism                                                               | What it does                                                 | Resume content help?                                                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Knockout / screening questions**                                      | Auto-disqualify on visa, years, certs, degree, location      | No. Honesty. Surface these in the apply UI, not the PDF.                                                          |
| **Parse**                                                               | Extract name, titles, employers, dates, skills into fields   | **Yes.** Linear text, standard headings, no tables/text boxes.                                                    |
| **Recruiter Boolean / keyword search** (sourcing, sometimes req search) | `Product Manager AND SQL AND B2B`                            | **Yes.** Exact phrases + synonyms. Jobscan’s 99.7% “recruiters use filters” is about **search**, not auto-reject. |
| **AI rank** (optional)                                                  | HiredScore A–D, Greenhouse match buckets, Winston stars      | Indirect. Clear skills/scope help the ranker; stuffing hurts humans.                                              |
| **Fraud / spam flags**                                                  | Greenhouse Real Talent, Ashby fraud, spray-and-pray velocity | Don’t mass-apply 15 unrelated reqs at one company (recruiters see full history).                                  |

Huntr ATS market share (1.67M saved jobs, 2025): Greenhouse 30.6%, Workday 19.6%, Ashby 10.7%, iCIMS 7.4%, Workable 6.5%, Lever 6.2%, SmartRecruiters 5.2%. **Workday has the worst parser** of the majors (“hands down the single worst parser I’ve ever used” — Microsoft recruiter). Greenhouse/Ashby recruiters often **open the original PDF** and ignore the parse preview.

### 1.3 AI ranking is spreading; autonomous reject is not

2026 platform facts (Huntr matrix + vendor docs):

- **Ashby** explicitly: AI never ranks with a single number; a human must always decide.
- **Greenhouse** AI matching surfaces; knockout questions can DQ; recruiters still walk the list.
- **Workday HiredScore** grades A–D. Low grades may never be _looked at_ if the recruiter has enough A’s — that is **de facto** invisibility, not a documented auto-reject.
- **SmartRecruiters Winston** is the most aggressive ranker (4-star, claimed 75% less manual screening) and still requires human reject.
- **Mobley v. Workday** (class certified May 2025) and **Kistler v. Eightfold** (2026) are why companies are cautious about silent AI reject.

Jobscan (May 2026): no major ATS (Workday, Greenhouse, iCIMS, SuccessFactors, Lever, Ashby, Taleo) natively detects “this resume was written by ChatGPT.” Detection is **human pattern recognition**.

### 1.4 Two readers, two clocks

**The Ladders eye-tracking (2018, n≈30 recruiters):** first pass **7.4 seconds** (was 6s in 2012). Heat maps: name, current/previous **titles**, companies, **dates/tenure**, education. F-pattern / E-pattern. Cluttered two-column layouts and long sentences lost. Caveat: small sample, executive-job site, often repeated as folklore (ERE 2020 critique). Huntr’s 2026 recruiters independently say **6–10 seconds**, same shape.

**Orosz two-step read:**

1. Quick scan: location, years, languages, titles, companies.
2. Second read **only if** the scan matches the req.

If the first scan fails, bullets never get read. Put the match in the **top third of page 1**.

A Fortune 500 recruiter Huntr interviewed **skips the summary**, looks at companies/title/tenure/education, wants numerals not `FOUR`. An Amazon recruiter: people fail because they read **requirements** and ignore **role and responsibilities**.

---

## 2. Content system: master resume → per-job snapshot

### 2.1 Three documents (only two are “resumes”)

| Artifact                              | Audience                            | Rule                                                                                                         |
| ------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Master / evidence graph**           | The seeker + our models             | Exhaustive, truthful, messy OK. DevHub already has this (experiences, projects, stacks, private `analysis`). |
| **Tailored apply resume**             | Parser + recruiter for **this req** | Subset/reorder/rephrase. Same facts. Target title in headline. JD language where true.                       |
| **Visual / portfolio PDF** (optional) | Recruiter email, website            | May be two-column. **Never** the ATS upload. Same split as the PDF-engine note.                              |

Teal’s product language matches this: master vs tailored vs generic. Huntr: tailoring is the largest conversion lever they measured.

### 2.2 How to read a job description (for models)

Do **not** dump the whole posting into the resume. Jobscan’s own scanner docs: paste **job description + responsibilities**, drop benefits and company history.

Extract four buckets:

1. **Must-haves** — required skills, years, stack, domain, certs, clearance, location/visa.
2. **Role scope** — what they actually do (the Amazon recruiter’s “responsibilities” section): account size, team size, systems, customers.
3. **Repeated phrases** — if the posting says “customer health scoring” three times, that is a search term.
4. **Nice-to-haves / culture tone** — only if there is space and it is true.

Then a **gap list**: Must / Nice / Missing. Missing items are **not invented**. They may be covered by a **related** proof (“built mobile apps” ≠ fake CS degree) or left off. Apply-package already forbids invention; keep that as law.

**Title handling (high leverage, high abuse):**

- Jobscan: include the **target job title** in the headline/summary. 10.6× interview lift in their 2.5M-application analysis. 55.3% of surveyed recruiters filter on title; 76.4% start with skills; 44%+ filter years of experience; 59.7% education.
- **Do not rewrite past employer titles** to match the posting. Apply-package: keep company and title exact. Put the target title in the **headline** (“Customer Success Manager”) and keep “Customer Support Lead, TechWave” in experience.
- Career-change: Jobscan allows a related-skill headline, not a fake history.

### 2.3 Tailoring operations (what the rewriter should do)

From Teal’s 9-step guide + Orosz + r/EngineeringResumes wiki, the model should:

1. **Reorder bullets** under each job: most JD-relevant first (wiki: some managers only read the first bullets).
2. **Mirror phrasing** where the fact is the same: “worked with other teams” → “collaborated cross-functionally” **if that is what happened**.
3. **Lead with scope-matched wins.** If they want `$50M` accounts, show tens of millions, not “managed client relationships.”
4. **Trim irrelevant duties** from the _PDF snapshot_. (Product tension: apply-package today rewrites **all** snapshot items and the server sets `include: true` for everything. See §8.)
5. **Skills section:** posting’s tool names first, grouped, comma/`|`/`•` separated, **no skill bars**.
6. **Acronym dual-write:** `SQL` and `Structured Query Language` only when the long form is used in the wild; always `Amazon Web Services (AWS)` at first mention if the JD uses either.
7. **Do not** add white text, hidden layers, or a keyword dump at the bottom. r/resumes and hiring managers treat this as fraud; parsers often make it visible.

Reddit (r/resumes): Jobscan 30% scores are common; users are **not** supposed to hit 100%. “You aren’t necessarily supposed to get 100% matching or include every missing keyword.” Jobscan itself: **80% is a sweet spot; above that is often stuffing.** Their public FAQ also cites 75%. Treat **75–80% overlap on _possessed_ keywords** as an internal ceiling, not a user trophy.

---

## 3. Writing for the human (after the file parses)

### 3.1 Goal of the page

Orosz: the resume’s job is **to sell enough to get a recruiter phone screen**, not to tell the whole career. Harvard MCS: specific, active, fact-based, written for people/systems that scan quickly.

### 3.2 Bullet formula

Prefer **Google XYZ** (Laszlo Bock, _Work Rules!_ / Google recruiting videos):

> Accomplished **[X]** as measured by **[Y]**, by doing **[Z]**.

Equivalents: **CAR** (Challenge–Action–Result), **STAR** compressed to one line. r/EngineeringResumes: move the metric **toward the start**; 1 sentence; 1–2 lines; no pronouns; they omit terminal periods (house style — Harvard does not require that).

Jobscan examples of the same idea:

| Weak                                | Strong                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| Worked with engineering to fix bugs | Prioritized a backlog of 50+ tickets, reducing critical app crashes by 22% in Q3       |
| Launched a new checkout feature     | Launched One-Click Checkout, resulting in a 15% increase in conversion for guest users |

Litmus test (elite-cv / XYZ guides): if the line could appear on **someone else’s job description**, it is a duty, not an achievement.

**Quantify without lying.** r/resumes hiring managers hate fake percentages. If there is no metric, use **scale** (N users, N services, team of N, $X budget) from the portfolio. Apply-package already: ground in description + private analysis; do not fabricate.

**Weave tools into bullets**, don’t only list them in Skills (Orosz). Recruiters and some ATS infer tenure-on-skill from which job the keyword sits in (Tech Interview Handbook).

### 3.3 Verb lists (conflict — resolve for DevHub)

| Source                    | “Good”                                         | “Avoid”                                                                                   |
| ------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Harvard MCS               | Includes _spearheaded, orchestrated, mastered_ | Passive, pronouns, slang                                                                  |
| r/EngineeringResumes wiki | analyzed, built, designed, reduced, shipped    | assisted, helped, utilized, **and** spearheaded/orchestrated/pioneered as **superfluous** |

**DevHub default:** follow the **wiki for engineering/IC resumes** (no fluff verbs). Follow Harvard for non-engineering roles if the posting’s voice is corporate. **Never** emit the ChatGPT cluster: _leverage, synergy, utilize, dynamic, results-driven, detail-oriented, passionate, spearheaded_ unless the seeker already wrote them.

Willo / Gem / Resume Now (2025–26, vendor surveys): ~⅓ of managers say they can spot AI resumes in <20s; Resume Now: **62% of employers reject AI-generated resumes that lack personalization**. Tells: uniform sentence rhythm, JD-clone phrasing, buzzword fog. Amazon recruiter to Huntr: AI rewrites that **look too close to the job description** are a red flag.

Harvard MCS on AI: use it to **edit and brainstorm**, not as primary author — output is generic.

### 3.4 Structure and length

**Scan order (experienced hire):** current title/company → skills/stack → recent bullets → education last.

**New grad / student:** education and real projects/internships first (Orosz, wiki).

**Summary:** ≤3–5 lines, tailored, or omit. Wiki: no summary unless senior/staff or career change. Huntr Fortune 500 recruiter ignores it. Tech Interview Handbook likes a **headline-as-section-title** (“Senior Software Engineer, 5 years leading teams”). **DevHub:** emit a headline always; emit a summary only when it adds JD-specific scope not obvious from title + first job.

**Page count:** wiki = 1 page unless 10+ YoE (1 page per decade). Huntr 225k resumes: **two pages perform as well or better at every level**. Orosz: US juniors 1 page; seniors may use 2 if page 1 still has the match; Europe often 2. **DevHub default:** 1 page until the snapshot cannot fit without <10.5pt or <0.4in margins; then 2. Never 3 for IC.

**Education:** honors/clubs can help conversion (Huntr). Wiki: GPA only if high and early career; no high school after college.

### 3.5 Skills section

- Heading: `Skills` (wiki) or `Skills` / `Technical Skills` (both parse).
- Only skills the person could defend in an interview (wiki).
- No soft-skill laundry lists (hiring managers skip them unless proven in bullets). r/resumes hiring manager: “If they aren’t incorporated into your job experience I don’t even consider them to be real.”
- Separators: commas, `|`, or `•` — **not a table or sidebar**.
- Order: JD-critical first.

---

## 4. Document shape (parsers + lazy previews)

Full engine choice is in the companion PDF note. Layout policy for **apply** artifacts:

### 4.1 Do / don’t

| Do                                                                       | Don’t                                                                                                                                                      |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single column, top-to-bottom reading order                               | Two-column “sidebar skills” (Jobscan text-layer scramble; ResumeOptimizerPro 2026: **97.4% field extract** single-column DOCX vs **71.2%** two-column PDF) |
| Selectable real text, embedded fonts                                     | Canva/Illustrator as images; scanned PDF                                                                                                                   |
| Standard headings: Experience, Education, Skills, Projects               | `Journey`, `Toolkit`, icons-only labels                                                                                                                    |
| Dates `Jan 2021 – Present` (wiki abbreviations; “Present” not “Current”) | `'21`, seasons, missing months if ATS years-filter matters                                                                                                 |
| Umbrella promotions: company once, titles nested                         | Parser thinks you job-hopped every promotion                                                                                                               |
| Contact in the body                                                      | Name/email in Word header/footer (Workday)                                                                                                                 |
| PDF **or** DOCX                                                          | `.pages`, infographic PDF                                                                                                                                  |
| 10–12pt body, 14–16pt name/headings, Arial/Calibri/Garamond/Georgia      | Decorative fonts that subset poorly                                                                                                                        |

Jobscan 2026 formatting series: parsers read **linear left-to-right**. Tables slice mid-sentence. Canva layers ≠ visual order.

Huntr’s 2026 correction: **modern Greenhouse/Ashby recruiters open the original file**, so columns rarely “auto-reject.” The remaining risk is (a) **Workday parse**, (b) **Boolean search on mangled fields**, (c) **lazy HTML preview**. Conservative single-column still wins because it is strictly better for (a)(b) and equal for humans if typography is good.

**Plain-text paste test** (Tech Interview Handbook, CurriculoATS, OpenResume parser): copy PDF → notepad. If contact, dates, or bullets shuffle, the parser will too. This should be a **CI/eval check** on every generated apply PDF.

### 4.2 File type

- Huntr / Jobscan 2026: PDF is fine on every major ATS.
- Workday: some reports **.docx 23% fewer parse errors** than PDF. Offer DOCX as a second export (already recommended in the PDF-engine note; Reactive Resume and YAMLResume ship it).
- Always generate **text PDF**, never print-to-PDF from a screenshot.

---

## 5. Platform-specific notes (when we know the ATS)

If the posting URL is `greenhouse.io`, `myworkdayjobs.com`, `ashbyhq.com`, `lever.co`, `smartrecruiters.com`, `icims.com`, `apply.workable.com`, encode that in apply-package notes (not in the PDF).

| ATS                 | Writer implication                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Greenhouse**      | Recruiter likely reads the PDF. Human-first writing. Knockouts still matter. Don’t spray many reqs (full history visible). |
| **Workday**         | Worst parse. DOCX or simple PDF. No header/footer contact. Knockouts heavy. HiredScore may bury D grades.                  |
| **Ashby**           | Human + optional AI summaries. Clarity > keyword density.                                                                  |
| **Lever**           | CRM keeps the profile; don’t overfit one posting so hard the next role looks alien.                                        |
| **Workable**        | Semantic matching — stuffing less useful; describe real work.                                                              |
| **SmartRecruiters** | Screening **answers** may be AI-ranked. Thoughtful knockout/screening text.                                                |
| **Taleo / iCIMS**   | Legacy preview risk; knockout-heavy; simplest layout.                                                                      |

Jobscan sells per-ATS tips from a company↔ATS database. Useful if we store `atsVendor` on `job_posting` later; do not block generation on it.

---

## 6. Cover letters, referrals, timing (adjacent AI)

- **Large company:** Huntr’s four recruiters don’t read cover letters. LinkedIn note to the recruiter beats a letter.
- **Startup / small firm:** Orosz and Harvard: short, tailored, **does not repeat the resume**. Apply-package already distinguishes cover vs outreach length.
- **Referrals** dominate. Resume quality matters most when Bob isn’t there (Orosz).
- **Apply early.** Microsoft recruiter: once five people are in process, late apps may never be opened.
- **Don’t apply to 15 unrelated jobs at one company.** ATS candidate view shows all of them.

---

## 7. Eval harness (what “good” means for our models)

Do **not** optimize solely for Jobscan. Use a **layered eval**:

1. **Truthfulness:** every employer, title, date, tool, metric is in the snapshot or marked unknown. (Existing apply-package law.)
2. **Parse probe:** PDF → text (Poppler/pdf.js) + OpenResume-style field extract. Contact, each job’s title/company/dates, skills list survive. RenderCV’s `scripts/ats_proof/` (Poppler, PyMuPDF, Affinda, …) is the OSS template.
3. **JD overlap (internal):** token overlap on **must-have skills the user has**. Target band ~0.75 of _possessed_ keywords, not 0.75 of the entire posting. Flag stuffing if overlap is high and bullets read like the JD.
4. **Human skim checklist (deterministic):** target title in top 15% of page; first two bullets of current job contain a numeral; skills in top half of page 1; no two-column; no header-only contact.
5. **Slop classifier:** banned verb/phrase list; n-gram similarity vs JD (too high = clone); uniform sentence length.
6. **Recruiter replay (LLM-as-judge, secondary):** “6-second scan: fit / no-fit / maybe + why” using the **responsibilities** section. Never the only gate.

Community eval: r/EngineeringResumes wiki + Jake’s / wiki LaTeX templates as **layout fixtures**, not as copy.

---

## 8. Implications for DevHub AI features

Map onto current product language (`CONTEXT.md`, apply-package skill, PDF companion).

### Apply package (`application-apply-package`)

**Keep:** rewrite all provided items; never invent; exact employer/title; grounded bullets; structured phases; private `analysis` never printed.

**Add to the skill / schemas:**

- JD **Must / Nice / Missing** object (notes field today is too vague).
- **Headline** string (target title + years/scope) separate from `professionalSummary`.
- **Bullet order** = JD relevance, not chronology-within-role.
- **Keyword dual-forms** list derived from JD ∩ portfolio stacks.
- **Slop banlist** and “do not paraphrase the JD” rule.
- **Numerals** required when the source text has a quantity.
- Optional `atsVendor` from posting URL for notes only.

**Product tension:** server sets every snapshot row `include: true`. Huntr/Teal/Orosz all say **cut irrelevant jobs/bullets** on the PDF. Recommendation: keep full rewrite for the **review UI**, but let assemble-time **PDF include** hide older/irrelevant items behind a default “fits one page” policy the seeker can override. Do not ask the model to emit a silent exclude list (current skill forbids that as the primary path).

### Resume PDF (`resume.generate` / Typst path)

- Default theme = single-column engineering/harvard-style (companion note).
- Headline + optional summary.
- Skills as inline delimited list, not a sidebar.
- Umbrella tenure layout.
- Contact in body.
- PDF/UA-1 + plain-text extract test in CI.
- Second artifact: DOCX.
- Never two-column on the apply default.

### Hub chat / tools

- “Tailor this resume to job X” should run the same pipeline as apply-package, not a one-shot ChatGPT rewrite.
- Show **Missing** skills honestly (“not in your portfolio”) instead of hallucinating.
- Offer **plain-text preview** (“this is what Workday will index”).
- Refuse white-text / stuffing requests.

### Job matching / agent take / search brief

- `matchScore` on pantry is already forbidden (`CONTEXT.md`). Personal match stays on the tenant’s application.
- Agent take: five bullets, humanizer, no hype — already correct. Align those bullets with **responsibilities**, not only keyword hits.
- Years-required cap on match is the knockout analogue — keep it.

### Career Inbox / apply send

- Prefer the **tailored PDF**, not the master.
- Don’t claim a file was attached if it wasn’t (mail agent already).
- Cover letter: generate for startups; skip or shorten for Greenhouse/Workday volume roles.
- Warn on spray (many apps to one `job_company` in a short window).

### Detect / import

- Import must preserve **metrics and tools** — they are the rewrite fuel.
- After import, prompt the seeker for **numbers** the PDF lost (parser-roundtrip).

---

## 9. Last 30 days (community pulse)

`/last30days` 2026-07-23 → 2026-08-22 (Reddit, HN, GitHub; X/YouTube not configured).

- r/resumes still teaching **how parsers linearize columns** (e.g. 2026-08-21 “How ATS software actually reads your resume”).
- HN: ATS as **recruiter CRM** (Harbor), open job-posting dumps across nine ATS — infrastructure, not resume craft.
- OpenResume still the cited OSS parser/builder (8.8k stars).
- Evergreen arguments unchanged: stuffing vs story; Jobscan as a **guide not a god**.

The 30-day window did **not** overturn Orosz/Huntr/Jobscan. Technique is stable; AI ranking and lawsuits are the 2025–26 delta.

---

## 10. Anti-patterns (checklist for models and UI)

1. Invented metrics, employers, or stacks.
2. Renaming past job titles to the posting.
3. Keyword stuffing / white text / keyword footer.
4. Resume that is a paraphrase of the JD (AI-clone tell).
5. Two-column or table layout on the apply PDF.
6. Contact only in header/footer.
7. Soft-skill list with no proof in bullets.
8. “Passionate, results-driven, synergistic” summary.
9. Functional resume (hides dates — ATS years-filter and recruiters hate it).
10. Optimizing to Jobscan 95%+.
11. One generic PDF for every job.
12. 15 applications to one employer in a week.
13. Skipping knockout questions or lying on them.
14. Canva image PDF.
15. Cover letter that restates the resume.

---

## 11. Implementation defaults (copy into skills)

When rewriting for a job:

1. Parse JD → must / nice / missing / repeated phrases / scope.
2. Headline = target title if fair; never lie.
3. Reorder current-role bullets by JD overlap; XYZ with numerals.
4. Dual-write acronyms the JD uses.
5. Skills = intersection(JD tools, portfolio), JD order.
6. Drop fluff verbs; keep tools inside bullets.
7. One-column PDF; body contact; standard headings; `Present` for current.
8. Internal overlap score; fail eval if JD-clone or invented facts.
9. Notes: missing must-haves, ATS vendor, knockout risks (years, location).
10. Humanizer: specific, dry, no hype.

---

## Sources

### Recruiter / hiring-manager primary

- Gergely Orosz, “How to write an effective developer resume,” Stack Overflow Blog, 2020-11-25 — https://stackoverflow.blog/2020/11/25/how-to-write-an-effective-developer-resume-advice-from-a-hiring-manager/
- Sam Wright / Huntr, “How Applicant Tracking Systems Actually Work in 2026” (1.7M apps, 225k resumes, named recruiter interviews) — https://huntr.co/blog/how-applicant-tracking-systems-work
- Harvard FAS MCS, “Create a Strong Resume” (incl. AI editing guidance) — https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/
- Laszlo Bock / Google XYZ formula (via Google recruiting materials and _Work Rules!_)
- The Ladders, Eye-Tracking Study (2018), 7.4s first pass — https://www.theladders.com/static/images/basicSite/pdfs/TheLadders-EyeTracking-StudyC2.pdf
- r/EngineeringResumes wiki (templates, bullets, verbs, dates; last major community standard for IC engineering) — https://www.reddit.com/r/EngineeringResumes/wiki/index/

### ATS vendors and layout

- Jobscan, “How to Write an ATS Resume” (2026) — https://www.jobscan.co/blog/ats-resume/
- Jobscan, “Why ATS Tables and Columns Break Parsing” (2026) — https://www.jobscan.co/blog/resume-tables-columns-ats/
- Jobscan, “5 Critical ATS Formatting Mistakes” (2026) — https://www.jobscan.co/blog/ats-formatting-mistakes/
- Jobscan, State of the Job Search 2025 (99.7% filter use; 10.6× title match; 76.4% skills) — https://www.jobscan.co/state-of-the-job-search
- Jobscan, “Can ATS Detect AI Resumes in 2026?” — https://www.jobscan.co/blog/can-ats-detect-ai-resume/
- Jobscan, match-rate guidance (75–80%, stuffing above) — https://www.jobscan.co/blog/what-jobscan-match-rate-should-i-aim-for/
- Teal, “How to Tailor Your Resume to a Job Description” (2026-01-21) — https://www.tealhq.com/post/how-to-tailor-your-resume-to-a-job
- Tech Interview Handbook, FAANG-oriented ATS + keyword placement — https://www.techinterviewhandbook.org/resume/
- OpenResume parser + single-column Greenhouse/Lever claim — https://www.open-resume.com/ and https://github.com/xitanggg/open-resume
- RenderCV ATS proof scripts — https://github.com/rendercv/rendercv/tree/main/scripts/ats_proof
- ResumeOptimizerPro 2026 template extract rates (cited in companion PDF note)

### Community

- r/resumes: Jobscan as guidance not 100% target; anti–white-text; anti–column layouts
- r/EngineeringResumes: Jake’s / wiki templates; STAR/CAR/XYZ; one-column

### Legal / AI rank (context, not resume copy)

- Mobley v. Workday (class certified 2025)
- Kistler v. Eightfold AI (2026)

### YouTube (technique, not engines)

See session notes: Jobscan 2026 walkthrough `Bon1BvjL7N0`; Teal create/curate/craft `OPz5D8N1yNs`; RenderCV `0aXEArrN-_c`; YAML→Typst `nZ9IMkd3rLk`; Shaw Talebi optimizer `R5WXaxmb6m4`. Transcripts align with the sources above (one column, selectable text, JD tailor, no tables).

### Internal

- [2026-08-21-resume-pdf-generators.md](./2026-08-21-resume-pdf-generators.md)
- `apps/agent/skills/application-apply-package/SKILL.md`
- `CONTEXT.md` (application, job_posting, matchScore, agent take, search brief)
- ADR-0015 / ADR-0016 (PDF generation)

**Vendor caution:** Jobscan, Teal, Huntr, Resume Worded, and ResumeOptimizerPro all sell scanners or builders. Prefer **named recruiter quotes**, **Orosz**, **ATS vendor docs**, and **parse tests we run ourselves** when those conflict with a match-score blog.
