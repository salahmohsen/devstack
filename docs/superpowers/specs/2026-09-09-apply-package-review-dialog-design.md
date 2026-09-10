# Apply package review dialog redesign — design

**Date:** 2026-09-09
**Status:** Grill locked (session 2026-09-09; exploration pick **Variant A — Paper Studio** + gap decisions). Ready for an implementation plan.
**Goal:** Replace the "Review apply package" right-side sheet with a near-fullscreen coss dialog that works like the onboarding review: a left sidebar with the package sections, and one **live document per section** — a tailored resume paper mirroring the RenderCV PDF, a cover letter paper mirroring the real Typst PDF, and a generic Matte outreach mail whose **rendered mail is the editor**, with attachment squares and Save/Send semantics. AI notes are removed from package generation (agent take replaces them); the apply package draft survives Accept so the dialog can always edit the last generated draft.

**Related**

- [Exploration](../../../design-explorations/review-apply-package.html) — 4 directions; **Variant A picked**
- [Variant A reference](../../../design-explorations/review-apply-package-A.reference.html) — parity target
- [Manifest](../../../design-explorations/review-apply-package.manifest.md) — data grounding, gap decisions filled
- Current flow: `apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-sheet.tsx` + `pages/dashboard/_lib/application-package-sheet-host.tsx`
- Send path: `packages/api/src/lib/application/send-application-outreach.ts` (+ `record-sent-outreach-mail.ts`, `send-career-reply.ts`)
- Accept path: `packages/api/src/lib/application/accept-apply-package.ts` (`resolveApplyPackagePdfDraft`, kit replace)
- Package generation: `packages/core/src/application/apply-package.ts` (letters schema, humanize)
- Onboarding live-edit primitives: `apps/web/src/shared/resume-doc-preview/` (`ResumeDocPreview`, `EditablePaperField`, `doc-preview-model`) and `pages/dashboard/onboarding/ui/review-step.tsx` paper handlers
- Cover letter PDF: `packages/pdf/src/cover-letter.template.ts` (Typst, XCharter)
- Email infra: `packages/email/` (react-email + Resend)
- Specs: [Onboarding document-first redesign](./2026-09-07-onboarding-document-first-redesign.md) (paper pattern source), [Hub job context](./2026-08-22-hub-job-context-design.md) (apply-kit origin)

**Not this spec:** editing the accepted kit without a draft (out of scope — draft survives), persisted attachment selection, an Overview section (cut), attachment byte-size display (cut), regenerating from scratch (existing Prepare/Regenerate flows unchanged).

---

## Grill-locked decisions

1. **Dialog, not sheet — Paper Studio.** Near-fullscreen coss `Dialog` (~94vw × 88vh, max ~1200px). Left sidebar ~230px with exactly three items: **Resume · Cover letter · Email**. One document pane at a time; everything edits on the document. Below `lg`: sidebar becomes horizontal section tabs on top, the paper collapses to the compact strip (onboarding pattern), editors stack full-width.
2. **Header carries job context.** Company logo via `ItemAvatar` (blobatar; `companyLogoUrl` preferred, animated deterministic fallback), then job title + company name. Context row: "Listing page included" badge (when `jobContext.listingFetched`), listing URL chip, collapsible "Description used" (with char count). Trailing state chip: **Draft · generated X ago** or **Accepted**.
3. **Resume pane = the onboarding paper.** New adapter `buildApplyPackageDocPreviewModel` maps the package draft into the existing `DocPreviewModel` → `ResumeDocPreview` with click-to-edit: headline, professional summary, rewritten bullets, project rewritten summaries commit into the package draft. Include switches drive section presence exactly like onboarding ticks; excluded sections render the designed "not on this resume" placeholder. Name/contacts are identity (profile), not editable. **Headline mirrors the PDF chain**: `draft.headline → existing resume headline → designed placeholder line` — the preview never lies about the artifact.
4. **SnapshotDiff is removed completely.** Replaced by an **evidence hover affordance**: each experience/project entry on the paper gets a small icon button (next to the entry header); hovering/focusing opens a card showing the **original text from the live evidence row** (experience description / project summary+description). The icon only renders when evidence exists — the onboarding flow has no evidence, so it shows nothing. Experiences and projects only; never on the cover letter or email.
5. **Cover letter pane mirrors the real PDF.** Same Typst letter composition as `packages/pdf/src/cover-letter.template.ts`: centered name (25pt-scale serif), contact line, date, company, `Re: role`, justified paragraphs (XCharter-like serif stack). Body paragraphs are click-to-edit and commit into `coverLetterBody` (paragraph split on blank lines); date/company/Re/name/contacts are derived and read-only. Paper treatment shared with the resume pane (same shell, different type scale).
6. **Email pane: the rendered mail IS the editor.** A **generic** Matte text-only react-email template rebuilt for the applicant (source: react-email `02-Matte/text-only`): no product logo, no marketing blurb footer, no unsubscribe — the letter belongs to the user. Subject and body paragraphs are click-to-edit **on the rendered mail** (editable paper fields), committing into `outreachSubject` / `outreachBody`. Signature name + contacts come from the profile (read-only). The To field (recruiter email) sits above the card as a labeled field.
7. **Attachment squares under the mail.** One square per sendable PDF: resume and cover letter. Square = PDF glyph + filename + state (tailored/accepted, or **missing** pre-accept). Toggling removes it from that send; **at least one must stay on** (all-off shows a composed warning, Send disabled). Selection is **send-time only** — never persisted. No byte sizes (cut).
8. **Actions — footer + in-pane Send.** Global footer: **Regenerate** (existing confirm dialog, regenerates the draft from scratch) · **Cancel** · **Save** (primary). **Save = accept semantics** (merge-into-Save lock): runs `acceptApplyPackage` with the edited draft, pre- or post-accept; PDFs are projections of the draft and are re-rendered/replaced fail-closed. **Send** lives in the Email pane next to the squares and is **hidden entirely while there is no recruiter email** (not disabled). Send = Save (when dirty) + send with **send-time overrides**: to, subject, body, attachment selection.
9. **The draft survives Accept.** `acceptApplyPackage` no longer clears `applyPackageDraft`. The dialog always renders the last generated draft; post-accept reopen shows the same editable papers. "Prepare again" (scratch generation) remains the separate, existing path.
10. **AI notes removed.** Drop `notes` from the apply-package LLM letters schema, prompt, humanizer mapping, and draft normalization everywhere it surfaces. Package generation instead ensures an **agent take** exists (existing `generate-agent-take` surface on the application row) — the hub/ApplicationInfoPanel take UI is the review surface for the model's rationale.
11. **Server send surface grows overrides.** `sendApplicationOutreach` (or its router input) accepts `{ to, subject, body, attachments: { resume: boolean, cover: boolean } }`. Body renders as HTML via the new Matte template (**multipart: html + plain-text fallback**). ≥1 attachment enforced server-side; existing fail-closed gates (closed app, valid recipient, kit existence per selection) remain. `record-sent-outreach-mail` records the final values and the actual attachment set.
12. **Motion and polish per better-ui locks.** Paper text edits commit instantly (≤150ms color/opacity, no keystroke animation); include/evidence icons use the established cross-fade (`opacity + scale 0.25→1 + blur 4→0`, `cubic-bezier(0.2,0,0,1)`); dialog enter/exit uses the coss dialog transitions; all new motion `motion-safe:` gated. Concentric radius (pane radius − padding for inner cards); shadows for elevation, borders for structure.

---

## Shared components

### OutboundApplyMail (new, `packages/email` + web twin)

- **Template:** `packages/email/src/templates/outreach-apply.tsx` — generic Matte-derived letter card (Tailwind config local to the template): big serif-less subject line, body paragraphs, applicant signature, contacts footer line. Props: `{ subject, paragraphs, senderName, contacts, companyName? }`. Rendered by the send path through the existing `render()` pipeline.
- **Preview twin (web):** `apps/web/src/shared/apply-mail/` renders the **same structure** as DOM with `EditablePaperField`-style editable subject/paragraphs. Contract: input = `{ to, subject, bodyText, sender: { name, contacts } }`; output = sectioned mail markup with per-part edit handlers. Parity rule: the web preview and the sent HTML must be built from the same shape and section order — if the send wouldn't include it, the preview doesn't show it.
- Used by: the Email pane of the review dialog (this spec). No other consumers yet.

### Apply package doc model (new adapter)

- `buildApplyPackageDocPreviewModel(draft, { resumeHeadline, live })` in `apps/web/src/shared/resume-doc-preview/` — maps `ApplyPackageDraft` (+ live rows for identity/dates) into the existing `DocPreviewModel` section shapes. Section presence = include switches, mirroring `resolveApplyPackagePdfDraft` semantics (page budget hiding included in parity rule).
- Evidence entries carry `{ clientId, originalText }` only when the live row exists (drives the hover icon).

### Cover letter model (new adapter)

- `buildCoverLetterModel({ candidateName, contacts, companyName, roleTitle, body, date })` mirroring the Typst template's field order and presence rules (contact line only when contacts exist, company/Re lines only when non-empty) — so the preview matches `renderCoverLetterPdfBytes` output.

---

## State and API changes

- `application.slice`: rename package sheet host state to the dialog; add `selectedSection: "resume" | "cover" | "email"` (default `resume`; `email` when opened from send-ish entry points). `ApplicationPackageSheetHost` → `ApplicationPackageDialogHost` (lazy import preserved).
- `acceptApplyPackage`: stop clearing `applyPackageDraft` (keep `applyPackageDraftedAt` as generated-at marker for the state chip).
- Send mutation input: `{ applicationId, overrides?: { to?, subject?, body?, attachments? } }`; overrides win over stored rows; rows updated to final values on send.
- Package generation (`packages/core` letters schema + prompt): remove `notes`; trigger/refresh agent take in the generate flow (verify existing trigger points in the plan; no duplicate takes).
- No new tables. No mail-hub schema change beyond recording final values + attachment set (already supports it).

## better-ui detail lock

- Sidebar item active state: white card + border + shadow (mock); counts right-aligned tabular-nums.
- Papers: `#f3f3f1`-family stage background, inner paper white with layered soft shadow, radius = pane − padding; resume type ~12.5px serif, cover letter ~12.5px serif justified, mail = Inter 13.5–14px on white card with hairline border.
- Editable affordance: transparent outline that becomes a dashed outline + faint background on hover/active (existing `EditablePaperField` conventions).
- Evidence icon: 17px bordered square, muted search glyph; popover card ≥250px, muted header "Original · from your experience".
- Attachment squares: 10px-radius cards, PDF glyph tile ~30×38, toggle pill on the trailing edge; all-off warning uses the destructive-soft palette.
- Reduced motion: all entrance/exit and icon transitions gated; paper edit commits are static color/opacity only.

## Verification

- **Parity diff (explore-design implement phase):** screenshot the implementation (loaded record + sparse record: no summary, 1 experience, null logo, no contacts, pre-accept missing kit) against `review-apply-package-A.reference.html`; drive deltas to zero; sparse state must read as designed (placeholders carry weight, blobatar logo present, missing-PDF squares composed).
- **Preview honesty:** unit tests — doc model sections == sections the RenderCV pipeline would emit for the same draft (mirrors `map-rendercv-yaml` tests); cover letter model == Typst template field presence; Matte web preview == sent HTML structure.
- **Gating tests:** Send hidden without recruiter email; ≥1 attachment enforced client + server; pre-accept Send runs Save first; post-accept Save replaces kit without clearing draft; Regenerate confirm preserved.
- **Notes removal:** generation no longer emits notes; existing stored drafts with `notes` render without error (schema optional retained or migrated — plan decides).
- `ai-feature-harness` after shipping (agent-take trigger + mail send surfaces).

## Out of scope

- Overview/context sidebar item (cut — context lives in the header)
- Attachment byte sizes; persisted attachment selection
- Read-only post-accept mode (draft survival supersedes it)
- Editing signature/identity on the mail (profile-owned)
- Per-item sidebar entries (evidence hover replaces)
