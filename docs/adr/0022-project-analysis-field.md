# Project `analysis` field: private markdown for the resume agent

Added a nullable `text` column `analysis` to the `project` table, an
optional markdown field the user authors in the project form. The
field is private input for the resume-generation agent — what the user
actually did, why, trade-offs, metrics, lessons — distinct from
`summary` and `description` which are the public recruiter-facing
copy.

## Context

The resume builder (see `0016-hono-resume-generation`) reads the
project's `summary` + `description` + stacks + repos to compose
tailored resume bullets. Those fields are the public-facing copy and
are deliberately short and polished; they're a poor source of the
"why this project, why now" detail a recruiter would actually want
to read. We needed a place for the user to keep their own
behind-the-scenes writeup that the agent could mine when generating
a resume, without exposing it on the public portfolio.

## Decision

- New nullable `text` column `analysis` on `project`, no default,
  no length cap. Forward-only; no data backfill.
- Added to `ProjectOutputSchema` (admin view, includes `analysis`)
  and to the create / update input schemas as
  `z.string().nullable().optional()`.
- New `ProjectPublicOutputSchema = ProjectOutputSchema.omit({ analysis: true })`
  in `packages/core/src/project/types.ts`. The schema-level split is
  enforced at the API boundary: the public portfolio list outputs the
  public schema, so `analysis` cannot leak to a public response even
  by accident.
- Same split cascaded through `ExperiencePublicOutputSchema` (in
  `packages/core/src/experience/types.ts`) so experiences nested in
  the public portfolio list also have `analysis` stripped from their
  nested projects. Admin routes (projects, experiences, resume
  builder) keep the full output.
- New `toProjectPublicOutput` / `toExperiencePublicOutput` mappers in
  `packages/api/src/routers/portfolio.mappers.ts` that strip the
  field by destructuring after the admin mapper runs — zero-cost
  type-safe strip, no Zod parse at the public boundary.
- `PortfolioRouter.list` (the only public procedure that returns
  project data) uses the public mappers.
- New form component `MarkdownField` in
  `apps/web/src/shared/form/markdown-field.tsx` — a plain
  `<Textarea>` with a Write/Preview tab toggle. Preview uses the
  existing `<Markdown>` component. Distinct from `RichTextField`
  (TipTap, produces HTML) because the analysis is for the agent, not
  for a public page; storing raw markdown avoids an HTML roundtrip
  the LLM doesn't need.
- Edit surface is the existing project form, with the field placed
  after `description`. Empty submission normalizes to `null` in the
  form's submit handler so the column stays `null` for projects that
  have no analysis.

## Consequences

- Public response shape for `portfolio.list` changed: nested projects
  in experiences and the top-level `projects` array now use
  `ProjectPublicOutputSchema` / `ExperiencePublicOutputSchema`. The
  removed `analysis` field is the only diff; everything else is
  byte-for-byte identical. No frontend render change needed because
  the public site never read `analysis`.
- The resume builder continues to use `toProjectOutput` /
  `toExperienceOutput` (admin view) and gets the full `analysis`
  field for every project it fetches, both standalone and
  experience-nested.
- Dashboard form changes are scoped to the project form; no other
  form reads or writes `analysis`.
- `MarkdownField` is a generic field component (not project-specific)
  but currently has only one consumer; other forms can adopt it later
  if they need a private markdown input.
- No length cap on the column. LLM input-token cost at resume
  generation time is a downstream concern; the resume builder can
  truncate or summarize the analysis before passing it to the model
  if context budget becomes an issue.
