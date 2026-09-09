# Apply package review dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Review apply package sheet with a near-fullscreen coss dialog (exploration Variant A — Paper Studio): sidebar (Resume · Cover letter · Email), one live document per section (RenderCV-mirroring resume paper, Typst-mirroring cover letter paper, generic Matte outreach mail whose rendered mail is the editor), evidence hover cards instead of SnapshotDiff, attachment squares with toggles, Save/Send semantics, draft survives Accept, AI notes removed in favor of agent take.

**Architecture:** The web dialog edits a local copy of `ApplyPackageDraft`; **Save** runs the existing `acceptApplyPackage` (which stops clearing the draft — it becomes the permanent source of truth, PDFs are projections), and **Send** runs Save-when-needed then `sendOutreach` with **send-time overrides** (`to/subject/body/attachments`). The sent HTML is a new generic react-email Matte template; a **pure `outreachMailModel` in `packages/core`** is the single parity source consumed by both the email template and the web preview. The resume paper reuses `ResumeDocPreview` via a new `buildApplyPackageDocPreview` that mirrors `resolveApplyPackagePdfDraft` + accept's portfolio gates; the cover letter paper mirrors `packages/pdf/src/cover-letter.template.ts`.

**Tech Stack:** Drizzle/Postgres (no schema changes), oRPC (packages/api), react-email (packages/email), Mastra agent call (agent take), TanStack Start + coss UI (apps/web), vitest via `vp test`.

**Spec (grill lock):** [docs/superpowers/specs/2026-09-09-apply-package-review-dialog-design.md](../specs/2026-09-09-apply-package-review-dialog-design.md) — frozen decisions #1–#12. Do not reopen.

**Parity reference:** [design-explorations/review-apply-package-A.reference.html](../../../design-explorations/review-apply-package-A.reference.html) + [manifest](../../../design-explorations/review-apply-package.manifest.md).

**Working agreements (from repo docs):**

- Workflow/validation: `.agents/workflow.md` — `vp check` package-local; `vp run -w fix` after substantial multi-package work.
- Testing: `.agents/testing.md` — unit tests at `src/**/__tests__/*.test.ts`, `vp test run` package-local, `vp run test:unit:run` monorepo.
- Commits: conventional commits; staging hooks auto-run `vp check --fix`.
- Skills: coss (`.agents/skills/coss/SKILL.md`) for dialog/popover primitives; better-ui for polish details.

**Plan-level notes (confirmed safe, do not reopen):**

- `applyPackageDraftSchema.notes` **stays optional** in the persisted schema (old stored drafts must parse); generation stops emitting it and the UI stops rendering it.
- Legacy accepted packages (accepted _before_ this ships, draft already cleared): dialog falls back to application rows for Cover letter/Email; Resume pane shows a designed "prepare again to edit" state.
- `sendOutreachAppId` slice state and `SendOutreachDialog` are removed; their entry points open the dialog directly on the Email section.
- Store renames are mechanical (`packageSheetAppId → packageDialogAppId`, etc.); a grep step in Task 13 catches every call site.

---

## File Structure (target state)

```
packages/core/src/application/outreach-mail.ts                    NEW   pure mail model (parity source)
packages/core/src/application/__tests__/outreach-mail.test.ts     NEW
packages/core/src/application/apply-package.ts                    MODIFY letters schema/prompt/humanize: -notes, outreach prompt -sign-off
packages/core/src/application/__tests__/apply-package.test.ts     MODIFY
packages/core/src/application/index.ts                            MODIFY export outreach-mail
packages/email/src/templates/outreach-apply-email.tsx             NEW   generic Matte letter
packages/email/src/__tests__/outreach-apply-email.test.tsx      NEW
packages/email/src/index.ts                                       MODIFY export
packages/api/src/lib/application/generate-apply-package.ts        MODIFY +agent take trigger
packages/api/src/lib/application/accept-apply-package.ts          MODIFY keep draft
packages/api/src/lib/application/send-application-outreach.ts     MODIFY overrides + HTML
packages/api/src/lib/application/__tests__/outreach-send-plan.test.ts  NEW (pure resolver)
packages/api/src/routers/applications.router.ts                   MODIFY sendOutreach input/errors
packages/pdf/src/index.ts                                         MODIFY export displayContact
apps/web/src/shared/resume-doc-preview/doc-preview-model.ts       MODIFY extract docPreviewModelFromRenderCvDoc
apps/web/src/shared/resume-doc-preview/apply-doc-preview-model.ts       NEW + test
apps/web/src/shared/resume-doc-preview/cover-letter-model.ts            NEW + test
apps/web/src/shared/resume-doc-preview/resume-doc-preview.tsx           MODIFY evidence + include + new handlers
apps/web/src/shared/apply-mail/outbound-mail-preview.tsx                NEW
apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-dialog.tsx   NEW (shell + footer)
apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-resume-pane.tsx  NEW
apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-cover-pane.tsx   NEW
apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-email-pane.tsx   NEW
apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-sheet.tsx    DELETE
apps/web/src/pages/dashboard/tracked-jobs/ui/send-outreach-dialog.tsx   DELETE
apps/web/src/pages/dashboard/_lib/application-package-dialog-host.tsx   NEW (replaces sheet host)
apps/web/src/pages/dashboard/tracked-jobs/_lib/application.slice.ts     MODIFY renames + section
apps/web/src/pages/dashboard/tracked-jobs/_lib/use-dashboard-apply-package.ts  MODIFY open call
apps/web/src/features/applications/lib/apply-package.ts                 MODIFY remove snapshot/master helpers (Task 17 grep)
apps/web/src/routes/(root-layout)/__protected/dashboard/route.tsx       MODIFY host swap
```

---

## Task 1: Core — outreach mail model (parity source)

**Files:**

- Create: `packages/core/src/application/outreach-mail.ts`
- Create: `packages/core/src/application/__tests__/outreach-mail.test.ts`
- Modify: `packages/core/src/application/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/application/__tests__/outreach-mail.test.ts
import { describe, expect, it } from "vitest";

import { buildOutreachMailModel, splitOutreachParagraphs } from "#@/application/outreach-mail";

describe("splitOutreachParagraphs", () => {
  it("splits on blank lines and trims", () => {
    expect(
      splitOutreachParagraphs("Dear Nadia,\n\nI'm applying for the role.\n\nI'd welcome a call.")
    ).toEqual(["Dear Nadia,", "I'm applying for the role.", "I'd welcome a call."]);
  });

  it("keeps single newlines inside one paragraph", () => {
    expect(splitOutreachParagraphs("Line one\nline two")).toEqual(["Line one\nline two"]);
  });

  it("returns empty for empty body", () => {
    expect(splitOutreachParagraphs("   ")).toEqual([]);
  });
});

describe("buildOutreachMailModel", () => {
  it("maps subject, paragraphs, signature, and contact lines", () => {
    const model = buildOutreachMailModel({
      subject: "Senior Frontend Engineer — Maya Okafor",
      bodyText: "Dear Nadia,\n\nI'm applying for the role.",
      senderName: "Maya Okafor",
      contacts: [
        { type: "website", value: "https://mayokafor.dev" },
        { type: "github", value: "mayokafor" },
        { type: "email", value: "maya@example.com" }
      ]
    });
    expect(model.subject).toBe("Senior Frontend Engineer — Maya Okafor");
    expect(model.paragraphs).toEqual(["Dear Nadia,", "I'm applying for the role."]);
    expect(model.senderName).toBe("Maya Okafor");
    // displayContact formatting, opted-in only, order preserved.
    expect(model.contactLines).toEqual([
      { text: "mayokafor.dev", href: "https://mayokafor.dev" },
      { text: "github.com/mayokafor", href: null },
      { text: "maya@example.com", href: "mailto:maya@example.com" }
    ]);
  });

  it("drops empty values and empty names", () => {
    const model = buildOutreachMailModel({
      subject: "S",
      bodyText: "Body",
      senderName: "  ",
      contacts: [{ type: "github", value: "" }]
    });
    expect(model.senderName).toBe("");
    expect(model.contactLines).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && vp test run src/application/__tests__/outreach-mail.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

```ts
// packages/core/src/application/outreach-mail.ts
import { z } from "zod";

/**
 * Single parity source for the outbound outreach mail (spec: sent HTML and
 * the dialog preview must render the same structure from the same shape).
 * The email template and the web preview both consume this model.
 */
export type OutreachContactLine = { text: string; href: string | null };

export type OutreachMailModel = {
  subject: string;
  paragraphs: string[];
  senderName: string;
  contactLines: OutreachContactLine[];
};

/** Split an outreach body into paragraphs (blank-line separated). */
export function splitOutreachParagraphs(bodyText: string): string[] {
  return bodyText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[ \t]+\n/g, "\n").trim())
    .filter(Boolean);
}

/**
 * Build the mail model from stored/send-time values. Contact display text
 * mirrors the PDF contact line (`displayContact` semantics re-implemented
 * here to keep core dependency-free): emails/phones verbatim, social
 * handles normalized to host labels, URLs stripped.
 */
export function buildOutreachMailModel(input: {
  subject: string;
  bodyText: string;
  senderName: string | null | undefined;
  contacts: ReadonlyArray<{ type: string; value: string }>;
}): OutreachMailModel {
  const contactLines: OutreachContactLine[] = [];
  for (const contact of input.contacts) {
    const value = contact.value.trim();
    if (!value) continue;
    const type = contact.type.toLowerCase();
    let text = value;
    let href: string | null = null;
    if (type === "email") {
      href = `mailto:${value}`;
    } else if (type === "phone") {
      href = `tel:${value.replace(/[^\d+]/g, "")}`;
    } else if (/^https?:\/\//i.test(value)) {
      href = value;
      text = value
        .replace(/^https?:\/\//i, "")
        .replace(/\/$/, "")
        .replace(/^www\./i, "");
    } else if (type === "github" && !value.includes(".") && !value.includes("/")) {
      text = `github.com/${value.replace(/^@/, "")}`;
    } else if (type === "linkedin" && !value.includes("linkedin.") && !/^https?:/i.test(value)) {
      text = `linkedin.com/in/${value.replace(/^@/, "").replace(/^in\//, "")}`;
    } else if (type === "x" && !value.includes("x.com") && !/^https?:/i.test(value)) {
      text = `x.com/${value.replace(/^@/, "")}`;
    } else if (type === "website") {
      text = value
        .replace(/^https?:\/\//i, "")
        .replace(/\/$/, "")
        .replace(/^www\./i, "");
      href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    }
    contactLines.push({ text, href });
  }

  return {
    subject: input.subject.trim(),
    paragraphs: splitOutreachParagraphs(input.bodyText),
    senderName: input.senderName?.trim() ?? "",
    contactLines
  };
}
```

- [ ] **Step 4: Export from the application barrel**

Add to `packages/core/src/application/index.ts`:

```ts
export * from "#@/application/outreach-mail";
```

- [ ] **Step 5: Run tests**

Run: `cd packages/core && vp test run src/application/__tests__/outreach-mail.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/application/outreach-mail.ts packages/core/src/application/__tests__/outreach-mail.test.ts packages/core/src/application/index.ts
git commit -m "feat(core): outreach mail model as sent/preview parity source"
```

---

## Task 2: Email — generic Matte outreach template

**Files:**

- Create: `packages/email/src/templates/outreach-apply-email.tsx`
- Create: `packages/email/src/__tests__/outreach-apply-email.test.tsx`
- Modify: `packages/email/src/index.ts`

- [ ] **Step 1: Write the failing smoke/structure test**

```tsx
// packages/email/src/__tests__/outreach-apply-email.test.tsx
import { describe, expect, it } from "vitest";

import { render } from "react-email";

import { OutboundApplyEmail } from "#@/templates/outreach-apply-email";
import { splitOutreachParagraphs } from "@tsu-stack/core";

const model = {
  subject: "Senior Frontend Engineer — Maya Okafor",
  paragraphs: splitOutreachParagraphs("Dear Nadia,\n\nI'm applying for the role."),
  senderName: "Maya Okafor",
  contactLines: [
    { text: "mayokafor.dev", href: "https://mayokafor.dev" },
    { text: "maya@example.com", href: "mailto:maya@example.com" }
  ]
};

describe("OutboundApplyEmail", () => {
  it("renders subject, every paragraph, signature, and contact lines", async () => {
    const html = await render(<OutboundApplyEmail mail={model} />);
    expect(html).toContain("Senior Frontend Engineer — Maya Okafor");
    expect(html).toContain("Dear Nadia,");
    expect(html).toContain("I'm applying for the role.");
    expect(html).toContain("Maya Okafor");
    expect(html).toContain("mayokafor.dev");
    // Generic template: no product branding, no unsubscribe.
    expect(html).not.toMatch(/unsubscribe/i);
    expect(html).not.toContain("logo192");
  });
});
```

Note: `packages/email/package.json` needs `@tsu-stack/core` in `dependencies` (check first — add `workspace:*` if missing; core has no email dependency so no cycle).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/email && vp test run src/__tests__/outreach-apply-email.test.tsx`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement the template**

Generic Matte-derived letter card — neutral palette (no product colors/logo), Inter/Arial, big subject line, body paragraphs, profile signature, contacts footer:

```tsx
// packages/email/src/templates/outreach-apply-email.tsx
import { Body, Container, Head, Html, Link, Preview, Section, Tailwind, Text } from "react-email";

type MailContactLine = { text: string; href: string | null };

export type OutboundApplyEmailProps = {
  /** Applicant's name for the <Preview> preheader. */
  previewName?: string;
  mail: {
    subject: string;
    paragraphs: string[];
    senderName: string;
    contactLines: MailContactLine[];
  };
};

/**
 * Generic Matte text-only letter for first-apply outreach (spec: belongs to
 * the applicant — no product logo, no marketing footer, no unsubscribe).
 * Structure must mirror apps/web `OutboundMailPreview` (shared
 * `outreachMailModel` in core is the parity source).
 */
export const OutboundApplyEmail = ({ previewName, mail }: OutboundApplyEmailProps) => {
  return (
    <Tailwind
      config={{
        plugins: [
          {
            handler: ({ addUtilities }) => {
              addUtilities({
                ".font-11": { fontSize: "11px", lineHeight: "1.5", fontWeight: "300" },
                ".font-13": { fontSize: "13px", lineHeight: "1.6", fontWeight: "400" },
                ".font-30": { fontSize: "30px", lineHeight: "1.1", letterSpacing: "-0.02em" }
              });
            }
          }
        ],
        theme: {
          extend: {
            colors: {
              canvas: "#f6f6f5",
              card: "#ffffff",
              fg: "#1a1a1a",
              "fg-2": "#525252",
              "fg-3": "#8a8a8a",
              stroke: "#e4e4e4"
            },
            fontFamily: {
              sans: ["Inter", "Arial", "Helvetica", "sans-serif"]
            }
          }
        }
      }}
    >
      <Html>
        <Head />
        <Body className="bg-canvas m-0 p-0 font-sans">
          <Preview>
            {mail.subject} — {previewName || mail.senderName || "job application"}
          </Preview>
          <Container className="mx-auto max-w-[600px] px-4 py-10">
            <Section className="bg-card border-stroke rounded-[10px] border px-9 py-8">
              <Text className="font-30 m-0 text-fg">{mail.subject}</Text>
              <Section className="mt-4">
                {mail.paragraphs.map((paragraph, index) => (
                  <Text key={index} className="font-13 m-0 mt-4 text-fg-2 whitespace-pre-wrap">
                    {paragraph}
                  </Text>
                ))}
              </Section>
              <Text className="font-13 m-0 mt-4 text-fg-2">
                Warmly,
                <br />
                <span className="text-fg">{mail.senderName}</span>
              </Text>
            </Section>
            {mail.contactLines.length > 0 ? (
              <Section className="mt-3 px-2">
                <Text className="font-11 m-0 text-fg-3">
                  {mail.contactLines.map((line, index) => (
                    <span key={line.text}>
                      {index > 0 ? " · " : ""}
                      {line.href ? (
                        <Link href={line.href} className="text-fg-3 no-underline">
                          {line.text}
                        </Link>
                      ) : (
                        line.text
                      )}
                    </span>
                  ))}
                </Text>
              </Section>
            ) : null}
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};

OutboundApplyEmail.PreviewProps = {
  mail: {
    subject: "Senior Frontend Engineer — Maya Okafor",
    paragraphs: ["Dear Nadia,", "I'm applying for the role."],
    senderName: "Maya Okafor",
    contactLines: [{ text: "mayokafor.dev", href: "https://mayokafor.dev" }]
  }
} satisfies OutboundApplyEmailProps;

export default OutboundApplyEmail;
```

- [ ] **Step 4: Export from the package index**

Add to `packages/email/src/index.ts`:

```ts
export { default as OutboundApplyEmail } from "./templates/outreach-apply-email";
export type { OutboundApplyEmailProps } from "./templates/outreach-apply-email";
```

- [ ] **Step 5: Run tests**

Run: `cd packages/email && vp test run src/__tests__/outreach-apply-email.test.tsx`
Expected: PASS (vitest must run with a DOM-free React render — react-email `render()` is node-safe; if the repo's vitest config needs `environment: "node"` per-package it already does).

- [ ] **Step 6: Commit**

```bash
git add packages/email/src/templates/outreach-apply-email.tsx packages/email/src/__tests__/outreach-apply-email.test.tsx packages/email/src/index.ts packages/email/package.json
git commit -m "feat(email): generic Matte outbound apply template"
```

---

## Task 3: Core — remove AI notes from package generation

**Files:**

- Modify: `packages/core/src/application/apply-package.ts` (letters schema ~line 333, build mapping ~lines 416/437, prompt text)
- Modify: `packages/core/src/application/__tests__/apply-package.test.ts`

- [ ] **Step 1: Find every `notes` surface in the letters pipeline**

Run: `rg -n "notes" packages/core/src/application/apply-package.ts`
Expected hits: `ApplyPackageDraftSchema.notes` (keep), letters LLM schema `notes: optionalLlmString...` (remove), `const notes = ... humanizeApplyPackageProse(...)` (remove), `...(notes ? { notes } : {})` (remove), prompt copy instructing the model to write reviewer notes (remove).

- [ ] **Step 2: Edit**

1. In the **letters output schema** (LLM-facing, ~line 333): delete the `notes` field entirely.
2. In the **workflow prompt** text: delete the note instruction; change the `outreachBody` description to: `"Plain-text outreach email body: greeting + body paragraphs. No sign-off and no signature — the mail template adds the applicant's name."` (spec #6/#10: signature is profile-owned).
3. In `humanize`/build mapping (~lines 416–437): delete the `notes` variable and its spread into the draft.
4. In **`ApplyPackageDraftSchema`** (persisted shape, ~line 124): KEEP `notes: z.string().optional()` — old stored drafts must still parse. Add a leading comment: `/** Deprecated: generation no longer emits notes (agent take replaced it). Kept so stored drafts parse. */`

- [ ] **Step 3: Update core tests**

In `packages/core/src/application/__tests__/apply-package.test.ts`: remove fixtures asserting the letters→draft `notes` mapping; if a test asserted the sign-off instruction, assert the new description instead. Run: `rg -n "notes" apps/agent/src --glob "*apply*"`
The letters output schema ALSO lives in the Mastra workflow step: `apps/agent/src/mastra/workflows/apply-package-workflow/draft-summary-and-letters.step.ts` — remove `notes` from its Zod schema and prompt there too (plus `accept-apply-package.ts` / `send-apply-outreach.ts` tools if they reference the shape).

- [ ] **Step 4: Run tests**

Run: `cd packages/core && vp test run && cd ../../apps/agent && vp test run`
Expected: PASS (if the agent workflow has a Zod schema for the letters output, removing `notes` there is required for the run to typecheck)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/application/apply-package.ts packages/core/src/application/__tests__/apply-package.test.ts apps/agent/src
git commit -m "feat(core): drop apply-package AI notes in favor of agent take"
```

---

## Task 4: API — package generation triggers agent take

**Files:**

- Modify: `packages/api/src/lib/application/generate-apply-package.ts`

- [ ] **Step 1: Add the take trigger after draft persist**

Mirror `refresh-from-listing-url.ts:350-360` (non-fatal, logged). After the successful `applicationRepository.update(...)` in `generateApplyPackage` (and before `return`):

```ts
let takeError: string | null = null;
try {
  const takeResult = await generateAgentTake({
    applicationId: app.id,
    userId: input.userId
  });
  if (!takeResult.ok) {
    takeError = `${takeResult.code}${takeResult.message ? `: ${takeResult.message}` : ""}`;
  }
} catch (error) {
  takeError = error instanceof Error ? error.message : String(error);
}
if (takeError) {
  const takeLog = createLogger({ operation: "api__apply_package_take_failed" });
  takeLog.set({
    event: "apply_package_take_failed",
    applicationId: app.id,
    userId: input.userId,
    takeError
  });
  takeLog.emit();
}
```

Import `generateAgentTake` from `#@/lib/application/generate-agent-take`. The take generation must **never** fail the package generation (spec #10) — failures log only.

- [ ] **Step 2: Run check**

Run: `cd packages/api && vp check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/lib/application/generate-apply-package.ts
git commit -m "feat(api): generate agent take after apply-package generation"
```

---

## Task 5: API — the draft survives Accept

**Files:**

- Modify: `packages/api/src/lib/application/accept-apply-package.ts` (~line 387-397)
- Modify: `packages/core/src/application/__tests__/apply-kit-replace.test.ts` (if it asserts the cleared columns)

- [ ] **Step 1: Stop clearing the draft**

In `commitDb` inside `acceptApplyPackage`, remove `applyPackageDraft: null, applyPackageDraftedAt: null` from the `applicationRepository.update` patch. The draft stays as the dialog's editable source (spec #9); `applyPackageDraftedAt` keeps its generate-time value for the state chip.

- [ ] **Step 2: Update tests that assert the clear**

Run: `rg -n "applyPackageDraft: null" packages/core packages/api apps`
Update any test expectation asserting the post-accept null draft to assert the draft is **preserved**.

- [ ] **Step 3: Run tests**

Run: `cd packages/core && vp test run src/application/__tests__/apply-kit-replace.test.ts && cd ../../packages/api && vp test run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/lib/application/accept-apply-package.ts packages/core/src/application/__tests__/apply-kit-replace.test.ts
git commit -m "feat(api): keep apply package draft after accept"
```

---

## Task 6: API — send-time overrides + Matte HTML

**Files:**

- Modify: `packages/core/src/application/apply-package.ts` (extend `SendOutreachInputSchema`)
- Create: `packages/api/src/lib/application/outreach-send-plan.ts` + `__tests__/outreach-send-plan.test.ts`
- Modify: `packages/api/src/lib/application/send-application-outreach.ts`
- Modify: `packages/api/src/routers/applications.router.ts` (errors list)

- [ ] **Step 1: Extend the input schema (core)**

In `packages/core/src/application/apply-package.ts`, next to `SendOutreachInputSchema`:

```ts
export const SendOutreachOverridesSchema = z.object({
  to: optionalNullableEmail,
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(20_000).optional(),
  /** Attachment selection for THIS send (send-time only, never persisted). */
  attachments: z
    .object({
      resume: z.boolean(),
      cover: z.boolean()
    })
    .optional()
});
export type SendOutreachOverrides = z.infer<typeof SendOutreachOverridesSchema>;

export const SendOutreachInputSchema = z.object({
  applicationId: z.string().min(1).describe("Application id to send first-apply outreach for"),
  /** Send-time overrides for to/subject/body/attachments (spec #8, #11). */
  overrides: SendOutreachOverridesSchema.optional()
});
```

(Keep the existing `SendOutreachInput` export type derivation.)

- [ ] **Step 2: Write the failing pure-resolver test**

```ts
// packages/api/src/lib/application/__tests__/outreach-send-plan.test.ts
import { describe, expect, it } from "vitest";

import { resolveOutreachSendValues } from "#@/lib/application/outreach-send-plan";

const base = {
  recruiterEmail: "stored@company.com",
  outreachSubject: "Stored subject",
  outreachBody: "Stored body"
};

describe("resolveOutreachSendValues", () => {
  it("uses stored rows without overrides", () => {
    expect(resolveOutreachSendValues(base)).toEqual({
      to: "stored@company.com",
      subject: "Stored subject",
      body: "Stored body",
      attachments: { resume: true, cover: true }
    });
  });

  it("overrides win over stored rows", () => {
    expect(
      resolveOutreachSendValues({
        ...base,
        overrides: { to: "new@company.com", subject: "New", body: "New body" }
      })
    ).toEqual({
      to: "new@company.com",
      subject: "New",
      body: "New body",
      attachments: { resume: true, cover: true }
    });
  });

  it("rejects all-off attachment selection", () => {
    expect(
      resolveOutreachSendValues({
        ...base,
        overrides: { attachments: { resume: false, cover: false } }
      })
    ).toEqual({ error: "NO_ATTACHMENTS" });
  });

  it("rejects empty subject/body as NO_MESSAGE", () => {
    expect(
      resolveOutreachSendValues({
        recruiterEmail: "a@b.com",
        outreachSubject: null,
        outreachBody: null
      })
    ).toEqual({
      error: "NO_MESSAGE"
    });
  });

  it("passes invalid recipient through as NO_RECIPIENT", () => {
    expect(
      resolveOutreachSendValues({ ...base, recruiterEmail: null, overrides: { to: null } })
    ).toEqual({
      error: "NO_RECIPIENT"
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/api && vp test run src/lib/application/__tests__/outreach-send-plan.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 4: Implement the resolver**

```ts
// packages/api/src/lib/application/outreach-send-plan.ts
import { type SendOutreachOverrides } from "@tsu-stack/core";

const emailLike = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed || !trimmed.includes("@")) return null;
  return trimmed;
};

export type OutreachSendValues = {
  to: string;
  subject: string;
  body: string;
  attachments: { resume: boolean; cover: boolean };
};

/**
 * Pure send-time resolution (spec #8, #11): overrides win over stored rows;
 * the default selection attaches both kit PDFs; an all-off selection, a
 * missing recipient, or an empty subject/body fails before any IO.
 */
export function resolveOutreachSendValues(input: {
  recruiterEmail: string | null;
  outreachSubject: string | null;
  outreachBody: string | null;
  overrides?: SendOutreachOverrides;
}): { error: "NO_RECIPIENT" | "NO_ATTACHMENTS" | "NO_MESSAGE" } | OutreachSendValues {
  const to = emailLike(input.overrides?.to ?? input.recruiterEmail);
  if (!to) return { error: "NO_RECIPIENT" };

  const attachments = input.overrides?.attachments ?? { resume: true, cover: true };
  if (!attachments.resume && !attachments.cover) return { error: "NO_ATTACHMENTS" };

  const subject = (input.overrides?.subject ?? input.outreachSubject ?? "").trim();
  const body = (input.overrides?.body ?? input.outreachBody ?? "").trim();
  if (!subject || !body) return { error: "NO_MESSAGE" };

  return { to, subject, body, attachments };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/api && vp test run src/lib/application/__tests__/outreach-send-plan.test.ts`
Expected: PASS

- [ ] **Step 6: Wire overrides + HTML into `sendApplicationOutreach`**

In `send-application-outreach.ts`:

1. Signature: add `overrides?: SendOutreachOverrides`.
2. Replace the recipient/subject/body extraction (current lines 61–78) with `resolveOutreachSendValues` + error mapping: `NO_RECIPIENT` → existing code; `NO_ATTACHMENTS` → new error code; `NO_MESSAGE` → existing `SEND_FAILED` "subject and body are required" copy.
3. Attachment loading becomes selection-driven:

```ts
const wanted = sendValues.attachments;
if (!app.resumeId || !wanted.resume) {
  if (!wanted.resume) {
    /* skip resume load */
  }
}
```

Concretely: load the resume PDF only `if (wanted.resume)` (missing object / no `resumeId` → existing `NO_RESUME`); load the cover PDF only `if (wanted.cover)` (missing key → existing `NO_COVER`). Both selected-but-missing keep the current fail-closed codes. Build `sendAttachments` from whichever selection passed.

4. Render the Matte HTML before sending:

```ts
  const [userRow, contactsRaw] = await Promise.all([
    userRepository.findById(input.userId),
    contactRepository.findOptedInByUserId(input.userId)
  ]);
  if (!userRow) return { ok: false, code: "NOT_FOUND" };

  const mail = buildOutreachMailModel({
    subject: sendValues.subject,
    bodyText: sendValues.body,
    senderName: userRow.name,
    contacts: contactsRaw.map((c) => ({ type: c.type, value: c.value }))
  });
  const bodyHtml = await render(<OutboundApplyEmail mail={mail} />);
```

Import `buildOutreachMailModel` from `@tsu-stack/core`, `OutboundApplyEmail` + `render` from `@tsu-stack/email` (check `packages/api/package.json` already has `@tsu-stack/email` — yes, line 25) and add a `react-email` dependency **only if `render` isn't re-exported** — preferred: re-export `renderOutreachApplyEmailHtml(mail, previewName?)` from `packages/email/src/index.ts` wrapping `render(<OutboundApplyEmail .../>)` so `packages/api` never imports `react-email` directly.

5. Pass to `sendCareerReply`: `bodyText: sendValues.body, bodyHtml, attachments: sendAttachments` (attachments now the selected subset).
6. Persist final values so stored rows match what was sent:

```ts
await applicationRepository.update(app.id, input.userId, {
  recruiterEmail: sendValues.to,
  outreachSubject: sendValues.subject,
  outreachBody: sendValues.body,
  outreachSentAt: new Date(),
  outreachProviderMessageId: sent.providerMessageId
});
```

(replaces the current metadata-only update; the stage-advance block below stays as-is)

7. `recordSentOutreachMail` receives `sendValues.subject/body/to` + the selected attachment set (unchanged shape).

- [ ] **Step 7: Router errors**

In `applications.router.ts` `sendOutreach`: pass `input.overrides` into `sendApplicationOutreach`; add error code `NO_ATTACHMENTS` with message `"Keep at least one attachment selected"` (mirroring existing error block style).

- [ ] **Step 8: Run checks**

Run: `cd packages/api && vp check && vp test run`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/application/apply-package.ts packages/api/src/lib/application/outreach-send-plan.ts packages/api/src/lib/application/__tests__/outreach-send-plan.test.ts packages/api/src/lib/application/send-application-outreach.ts packages/api/src/routers/applications.router.ts packages/email/src/index.ts
git commit -m "feat(api): outreach send-time overrides + Matte HTML body"
```

---

## Task 7: PDF package — browser-safe contact exports

**Files:**

- Create: `packages/pdf/src/letter-contacts.ts` (move `buildCoverLetterContactItems` + `CORE_CONTACT_TYPES` out of `cover-letter.ts` — pure, no node imports)
- Modify: `packages/pdf/src/cover-letter.ts` (import from the new module)
- Modify: `packages/pdf/src/doc.ts` + `packages/pdf/src/index.ts`

- [ ] **Step 1: Extract the pure contact-items builder**

Move `buildCoverLetterContactItems` and its `CORE_CONTACT_TYPES` set (currently `cover-letter.ts:19,53-82`) into a new `packages/pdf/src/letter-contacts.ts` that imports only from `#/contacts` + `#/types` (both pure — `contacts.ts` has zero node imports). `cover-letter.ts` keeps `typstContactLine` and imports the builder from `#/letter-contacts`.

- [ ] **Step 2: Browser-safe re-exports**

`packages/pdf/src/doc.ts` is the browser bundle entry (`packages/pdf/package.json` exports `./doc`; the root entry pulls node-only renderers and must never be imported by web code). Add:

```ts
export { displayContact } from "#@/contacts";
export { buildCoverLetterContactItems } from "#@/letter-contacts";
```

Also re-export `displayContact` from the root `index.ts` for server-side consumers.

- [ ] **Step 3: Run existing pdf tests**

Run: `cd packages/pdf && vp test run`
Expected: PASS (pure move; `cover-letter.test.ts` still green)

- [ ] **Step 4: Commit**

```bash
git add packages/pdf/src
git commit -m "refactor(pdf): pure letter-contacts module + browser-safe exports"
```

---

## Task 8: Web — extract shared cv→model mapper

**Files:**

- Modify: `apps/web/src/shared/resume-doc-preview/doc-preview-model.ts`

- [ ] **Step 1: Refactor — no behavior change**

Extract everything from `buildDocPreviewModel` lines 196–293 (after `draftToResumePdfInput`) into:

```ts
type SectionRowMaps = {
  experienceRows: Array<{ clientId: string }>;
  educationRows: Array<{ clientId: string }>;
  certificationRows: Array<{ clientId: string }>;
  projectRows: Array<{ clientId: string }>;
};

export function docPreviewModelFromRenderCvDoc(
  cv: Record<string, unknown>,
  rows: SectionRowMaps
): DocPreviewModel {
  /* exactly the current body, parametrized on `cv` + `rows` */
}
```

`buildDocPreviewModel` becomes:

```ts
export function buildDocPreviewModel(draft: ResumeImportDraft): DocPreviewModel {
  const input = draftToResumePdfInput(draft);
  const cv = asRecord(buildRenderCvDoc(input));
  return docPreviewModelFromRenderCvDoc(cv, {
    experienceRows: draft.experiences.filter((exp) => exp.selected && exp.includedInPortfolio),
    educationRows: draft.educations.filter((edu) => edu.selected),
    certificationRows: draft.certifications.filter((cert) => cert.selected),
    projectRows: draft.projects.filter((project) => project.selected && project.includedInPortfolio)
  });
}
```

- [ ] **Step 2: Run existing tests**

Run: `cd apps/web && vp test run src/shared/resume-doc-preview/doc-preview-model.test.ts`
Expected: PASS (zero behavioral change)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/shared/resume-doc-preview/doc-preview-model.ts
git commit -m "refactor(web): extract docPreviewModelFromRenderCvDoc"
```

---

## Task 9: Web — apply-package doc model adapter

**Files:**

- Create: `apps/web/src/shared/resume-doc-preview/apply-doc-preview-model.ts`
- Create: `apps/web/src/shared/resume-doc-preview/apply-doc-preview-model.test.ts`

- [ ] **Step 1: Write the failing test**

Test cases (mirror accept-apply-package gates):

1. Only `include && live.portfolioEntryId != null` experiences/projects render; archived projects excluded.
2. Rewritten bullets/summary win; identity (org/title/dates) from live rows.
3. Live stack names/types win over draft names; included stacks only.
4. Educations/certifications include-when-present (all rows render).
5. Headline chain: `draft.headline` trimmed → passed as profile.headline; empty → omitted (mapper falls back to latest experience title); summary = profile.summary, professionalSummary override present.
6. Evidence text attached per entry from live description/summary.
7. Excluded-everything sparse draft → sections present=false with counts 0.

```ts
// apps/web/src/shared/resume-doc-preview/apply-doc-preview-model.test.ts
import { describe, expect, it } from "vitest";

import {
  buildApplyPackageDocPreview,
  type ApplyPackageLiveRows
} from "#@/shared/resume-doc-preview/apply-doc-preview-model";
// fixture draft: 2 experiences (1 include, 1 exclude), 1 archived project, 2 stacks (1 include)
// fixture live: matching rows, one missing portfolioEntryId, live stack names differing from draft
```

Assert: `model.sections` ids/order (`summary, experience, education, projects, skills, certifications` — same as the onboarding model); entry counts; `evidenceByClientId` presence rules (row dropped for missing `portfolioEntryId` → NO evidence key and NO paper entry); `model.headline` equals the trimmed draft headline when set, else `null` (mapper falls back to latest experience title). Also assert the dropped-row zip alignment: the second included experience still pairs with its own evidence/clientId when the first included experience is dropped.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && vp test run src/shared/resume-doc-preview/apply-doc-preview-model.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// apps/web/src/shared/resume-doc-preview/apply-doc-preview-model.ts
import { type ApplyPackageDraft } from "@tsu-stack/core";
import { buildRenderCvDoc, type ResumePdfInput, type ResumePdfPortfolio } from "@tsu-stack/pdf/doc";
import {
  asRecord,
  docPreviewModelFromRenderCvDoc,
  type DocPreviewModel
} from "#@/shared/resume-doc-preview/doc-preview-model";

/** Live identity rows the dialog already fetches (experiences/projects/stacks lists + profile). */
export type ApplyPackageLiveRows = {
  profile: { name: string; email: string; summary: string | null };
  contacts: Array<{ type: string; value: string; includedInPortfolio: boolean }>;
  experiences: Array<{
    id: string;
    title: string;
    organization: string;
    fromDate: string | null;
    toDate: string | null;
    isPresent: boolean;
    description: string | null;
    portfolioEntryId: string | null;
  }>;
  projects: Array<{
    id: string;
    title: string;
    summary: string | null;
    description: string | null;
    demoUrl: string | null;
    isArchived: boolean;
    portfolioEntryId: string | null;
    stacks: Array<{
      name: string;
      type: string | null;
      includedInPortfolio: boolean;
      sortOrder: number;
    }>;
  }>;
  stacks: Array<{ id: string; name: string; type: string | null; sortOrder: number }>;
  // RenderCV mapping fields (no clientId — the apply zip passes [] for these
  // sections; the outputs carry `id`, not `clientId`).
  educations: Array<{ [key: string]: unknown }>;
  certifications: Array<{ [key: string]: unknown }>;
};

/** A draft row that actually renders on the tailored PDF (accept gates). */
export type KeptExperience = {
  draftRow: ApplyPackageDraft["experiences"][number];
  live: ApplyPackageLiveRows["experiences"][number];
};
export type KeptProject = {
  draftRow: ApplyPackageDraft["projects"][number];
  live: ApplyPackageLiveRows["projects"][number];
};

/**
 * One kept-rows derivation shared by the portfolio build, the section zip,
 * and the evidence map — an unfiltered zip would misalign when a row is
 * dropped for missing `portfolioEntryId` or archive state.
 */
export function keptApplyPackageRows(
  draft: ApplyPackageDraft,
  live: ApplyPackageLiveRows
): { experiences: KeptExperience[]; projects: KeptProject[] } {
  const expById = new Map(live.experiences.map((row) => [row.id, row] as const));
  const projectById = new Map(live.projects.map((row) => [row.id, row] as const));
  return {
    experiences: draft.experiences.flatMap((draftRow) => {
      const row = expById.get(draftRow.experienceId);
      if (!draftRow.include || !row || !row.portfolioEntryId) return [];
      return [{ draftRow, live: row }];
    }),
    projects: draft.projects.flatMap((draftRow) => {
      const row = projectById.get(draftRow.projectId);
      if (!draftRow.include || !row || !row.portfolioEntryId || row.isArchived) return [];
      return [{ draftRow, live: row }];
    })
  };
}

/**
 * Mirror accept-apply-package's portfolio construction (spec #3): the paper
 * must never show a section the PDF wouldn't render. Section presence =
 * include switches; identity from live rows; rewritten text from the draft.
 * `headline` is a top-level `ResumePdfInput` field (NOT inside `profile` —
 * `ResumePdfProfile` is `{ name, email }` only).
 */
export function applyPackageDraftToResumePdfInput(
  draft: ApplyPackageDraft,
  live: ApplyPackageLiveRows
): ResumePdfInput {
  const kept = keptApplyPackageRows(draft, live);
  const stackById = new Map(live.stacks.map((row) => [row.id, row] as const));

  const experiences = kept.experiences.map(({ draftRow, live: row }) => ({
    organization: row.organization,
    title: row.title,
    fromDate: row.fromDate,
    toDate: row.toDate,
    isPresent: row.isPresent,
    description: row.description ?? "",
    includedInPortfolio: true,
    bullets: draftRow.rewrittenBullets
  }));

  const projects = kept.projects.map(({ draftRow, live: row }) => ({
    title: row.title,
    summary: draftRow.rewrittenSummary || row.summary,
    demoUrl: row.demoUrl,
    description: row.description,
    stacks: row.stacks,
    includedInPortfolio: true,
    isArchived: false,
    bullets: draftRow.rewrittenBullets
  }));

  const stacks = draft.stacks
    .filter((s) => s.include)
    .map((s) => {
      const row = stackById.get(s.stackId);
      return {
        name: row?.name ?? s.name,
        type: row?.type ?? null,
        includedInPortfolio: true,
        sortOrder: row?.sortOrder
      };
    });

  const portfolio: ResumePdfPortfolio = {
    experiences,
    projects,
    stacks,
    contacts: live.contacts
      .filter((c) => c.includedInPortfolio)
      .map((c) => ({ type: c.type, value: c.value })),
    educations: live.educations.map((edu) => ({
      ...edu,
      clientId: undefined
    })) as ResumePdfPortfolio["educations"],
    certifications: live.certifications.map((cert) => ({
      ...cert,
      clientId: undefined
    })) as ResumePdfPortfolio["certifications"]
  };

  const headline = draft.headline.trim();
  return {
    profile: {
      name: live.profile.name.trim() || "Candidate",
      email: live.profile.email
    },
    headline: headline.length > 0 ? headline : undefined,
    summary: live.profile.summary ?? "",
    professionalSummary: draft.professionalSummary,
    portfolio
  };
}

export type ApplyPackageDocPreview = {
  model: DocPreviewModel;
  /** clientId → original text; icon renders only when present (spec #4). */
  evidenceByClientId: Record<string, string>;
};

/** Zips rendered entries with KEPT draft rows + evidence text. */
export function buildApplyPackageDocPreview(
  draft: ApplyPackageDraft,
  live: ApplyPackageLiveRows
): ApplyPackageDocPreview {
  const kept = keptApplyPackageRows(draft, live);
  const input = applyPackageDraftToResumePdfInput(draft, live);
  const cv = asRecord(buildRenderCvDoc(input));
  const model = docPreviewModelFromRenderCvDoc(cv, {
    experienceRows: kept.experiences.map(({ draftRow }) => ({ clientId: draftRow.experienceId })),
    educationRows: [],
    certificationRows: [],
    projectRows: kept.projects.map(({ draftRow }) => ({ clientId: draftRow.projectId }))
  });

  const evidenceByClientId: Record<string, string> = {};
  for (const { draftRow, live: row } of kept.experiences) {
    if (row.description) evidenceByClientId[draftRow.experienceId] = row.description;
  }
  for (const { draftRow, live: row } of kept.projects) {
    const text = [row.summary, row.description].filter(Boolean).join("\n");
    if (text) evidenceByClientId[draftRow.projectId] = text;
  }

  return { model, evidenceByClientId };
}
```

Notes for the implementer:

- `asRecord` must be exported from `doc-preview-model.ts` in Task 8 (it's module-local today). Add `asRecord` to the Task 8 extraction exports.
- Education/certification rows come from `orpcQueryClient.educations.list` / `certifications.list` outputs — map their fields to the `ResumePdfPortfolio` education/certification shapes exactly like `draftToResumePdfInput` does (school/degree/field/location/dates/isPresent/description/gpa; name/issuer/issuedAt/expiresAt/credentialUrl/description). `clientId` is stripped before the PDF input.
- The `include && portfolioEntryId` gate intentionally drops non-portfolio rows — parity with `acceptApplyPackage` (only portfolio-opted-in evidence renders on the tailored PDF).

- [ ] **Step 4: Run tests**

Run: `cd apps/web && vp test run src/shared/resume-doc-preview/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/shared/resume-doc-preview/apply-doc-preview-model.ts apps/web/src/shared/resume-doc-preview/apply-doc-preview-model.test.ts apps/web/src/shared/resume-doc-preview/doc-preview-model.ts
git commit -m "feat(web): apply-package doc preview model mirroring PDF pipeline"
```

---

## Task 10: Web — ResumeDocPreview extensions

**Files:**

- Modify: `apps/web/src/shared/resume-doc-preview/resume-doc-preview.tsx`

Extend without breaking the onboarding consumer (all new props optional):

- [ ] **Step 1: Handlers + props**

```ts
export type ResumeDocEditHandlers = {
  onProfileChange: (patch: { name?: string }) => void;
  onSummaryChange: (text: string) => void;
  onExperienceChange: (clientId: string, patch: { title?: string; organization?: string }) => void;
  onEducationChange: (clientId: string, patch: { school?: string }) => void;
  onProjectChange: (clientId: string, patch: { title?: string }) => void;
  onBulletsChange: (clientId: string, lines: string[]) => void;
  /** NEW (apply package): project rewritten-summary edit. */
  onProjectSummaryChange?: (clientId: string, text: string) => void;
  /** NEW (apply package): headline edit — paper line under the name. */
  onHeadlineChange?: (text: string) => void;
};

export type ResumeDocPreviewProps = {
  model: DocPreviewModel;
  edit?: ResumeDocEditHandlers;
  className?: string;
  /** NEW: original text per entry id → renders the evidence icon + hover card (spec #4). */
  evidenceByClientId?: Record<string, string>;
  /** NEW: include state per entry id → renders the mini include switch (spec #3). */
  includeByClientId?: Record<string, boolean>;
  onIncludeChange?: (clientId: string, include: boolean) => void;
};
```

- [ ] **Step 2: Render the affordances**

In `DocExperienceEntry` and `DocProjectEntry` (they receive `entry` + `edit`; thread the new props through `SectionBlock`):

1. **Evidence icon:** when `entry.clientId` maps to evidence text, render next to the entry header line a 17px bordered icon button (lucide `SearchIcon`, `size-2.5`) wrapped in coss `Popover` — `PopoverTrigger` renders the button (`aria-label="Original text from your experience"`), `PopoverPopup` (width ≥ 250px, `w-64`) shows `PopoverTitle`-styled eyebrow `ORIGINAL · FROM YOUR EXPERIENCE` + the text in `text-[11px] text-muted-foreground whitespace-pre-wrap`. Popover opens on hover (`onMouseEnter`/`onMouseLeave` on the trigger + `onOpenChange`) and click on touch. Only when evidence exists (no evidence → no icon — spec #4).
2. **Include mini-switch:** when `includeByClientId[entry.clientId] != null`, render an 11px-font label + tiny `Switch` (`[--thumb-size:--spacing(2.5)]`, stopPropagation on click/pointerdown like `PortfolioSwitch`) after the dates. Excluded entries render `opacity-60` on the whole entry block.
3. **Headline edit:** under the name, when `model.headline` and `edit?.onHeadlineChange`, render the headline as an `EditablePaperField` (`allowEmpty`, placeholder "Target role line — optional"); when no headline and handler present, render a muted editable placeholder line "Add a target role line" (spec #3 chain is upstream in the model; the paper shows what the PDF shows).
4. **Project rewritten summary:** in `DocProjectEntry`, when `edit?.onProjectSummaryChange` and the entry carries `summary` (add `summary?: string` to `ProjectEntry` via the model — the apply builder includes it), render it as a multiline `EditablePaperField` between the title and bullets.

Keep the onboarding path byte-identical: when none of the new props are passed, output matches the current DOM (verify with the existing onboarding snapshot/test if present, else eyeball the onboarding page in dev).

- [ ] **Step 3: Run checks**

Run: `cd apps/web && vp check && vp test run src/shared/resume-doc-preview/`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/shared/resume-doc-preview/resume-doc-preview.tsx
git commit -m "feat(web): evidence hover + include toggles on the resume paper"
```

---

## Task 11: Web — cover letter model + paper

**Files:**

- Create: `apps/web/src/shared/resume-doc-preview/cover-letter-model.ts`
- Create: `apps/web/src/shared/resume-doc-preview/cover-letter-model.test.ts`
- Create: `apps/web/src/shared/resume-doc-preview/cover-letter-paper.tsx`

- [ ] **Step 1: Write the failing model test**

Cases: paragraphs split with the PDF's `splitCoverLetterParagraphs` semantics (blank-line split; a single-paragraph body collapses intra-paragraph newlines to spaces); contact line mirrors `buildCoverLetterContactItems` (profile email unshifted when contacts lack one, sorted, deduped, `displayContact` labels, joined with `|` — typst contact line) and is `null` when empty; company/Re lines only when non-empty (mirror `#if company != ""` guards); date = `en-US` long format (`formatLetterDate` parity: `2026-09-09` → `September 9, 2026`).

- [ ] **Step 2: Implement the model**

```ts
// apps/web/src/shared/resume-doc-preview/cover-letter-model.ts
import { buildCoverLetterContactItems, displayContact } from "@tsu-stack/pdf/doc";

export type CoverLetterModel = {
  name: string;
  contactLine: string | null;
  dateLine: string;
  company: string | null;
  roleTitle: string | null;
  paragraphs: Array<{ id: string; text: string }>;
};

/** Mirrors packages/pdf cover-letter.template.ts field order + presence. */
export function buildCoverLetterModel(input: {
  candidateName: string;
  contacts: Array<{ type: string; value: string }>;
  profileEmail: string;
  companyName: string | null | undefined;
  roleTitle: string | null | undefined;
  body: string;
  date?: Date;
}): CoverLetterModel {
  // Mirror the PDF's contact items exactly: email unshift when missing,
  // sortContacts order, dedupe, displayContact labels (Task 7 export).
  const items = buildCoverLetterContactItems(
    input.contacts.map((c, index) => ({ ...c, sortOrder: index })),
    input.profileEmail
  );
  const company = input.companyName?.trim() || null;
  const roleTitle = input.roleTitle?.trim() || null;
  const date = input.date ?? new Date();
  return {
    name: input.candidateName.trim() || "Candidate",
    contactLine: items.length > 0 ? items.map((item) => item.label).join(" | ") : null, // typstContactLine joins with ` | `
    dateLine: date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    company,
    roleTitle,
    paragraphs: splitCoverLetterParagraphs(input.body).map((text, index) => ({
      id: `p-${index}`,
      text
    }))
  };
}

/**
 * Mirror packages/pdf `splitCoverLetterParagraphs`: blank-line split; a
 * single-paragraph body collapses intra-paragraph newlines to spaces so the
 * paper matches the PDF for bodies with stray line breaks.
 */
function splitCoverLetterParagraphs(body: string): string[] {
  const trimmed = body.trim();
  if (!trimmed) return [];
  const byBlank = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (byBlank.length > 1) return byBlank;
  return [trimmed.replace(/\n+/g, " ").trim()].filter(Boolean);
}
```

- [ ] **Step 3: Implement the paper**

`CoverLetterPaper` — serif paper (same shell classes as the resume stage; fonts `font-serif` with `XCharter, Georgia, "Times New Roman"` stack):

- Header: centered `name` (`text-[22px] font-semibold`), `contactLine` below (`text-[10.5px] text-muted-foreground`), left-aligned `dateLine`, `company` (bold), `Re: {roleTitle}` when present.
- Body: each paragraph is a multiline `EditablePaperField` (`text-[12.5px] leading-[1.55] text-justify`, `font-serif`) committing into the draft via `onParagraphChange(index, text)`; join on commit = `paragraphs.map(p => p.text).join("\n\n")` → `coverLetterBody`.
- Props: `{ model, onParagraphChange, onBodyReplace? }` — for editing, the simplest honest contract is index-based paragraph commits; empty paragraph deletes it.
- `motion-safe` fade-in per better-ui locks; no other chrome (the pane stage wraps it).

- [ ] **Step 4: Run tests**

Run: `cd apps/web && vp test run src/shared/resume-doc-preview/cover-letter-model.test.ts && vp check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/shared/resume-doc-preview/cover-letter-model.ts apps/web/src/shared/resume-doc-preview/cover-letter-model.test.ts apps/web/src/shared/resume-doc-preview/cover-letter-paper.tsx
git commit -m "feat(web): cover letter paper mirroring the Typst PDF"
```

---

## Task 12: Web — OutboundMailPreview (Matte twin)

**Files:**

- Create: `apps/web/src/shared/apply-mail/outbound-mail-preview.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import { cn } from "@tsu-stack/ui/lib/utils";

import { EditablePaperField } from "@/shared/resume-doc-preview/editable-paper-field";
import { buildOutreachMailModel, type OutreachMailModel } from "@tsu-stack/core";

export type OutboundMailPreviewProps = {
  subject: string;
  bodyText: string;
  senderName: string | null;
  contacts: Array<{ type: string; value: string }>;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (bodyText: string) => void;
  className?: string;
};

/**
 * Rendered mail IS the editor (spec #6). Structure mirrors the
 * `OutboundApplyEmail` react-email template; `buildOutreachMailModel` is the
 * shared parity source — same subject/paragraph/signature/contacts from the
 * same inputs, with subject + paragraphs editable on the paper.
 */
export function OutboundMailPreview({
  subject,
  bodyText,
  senderName,
  contacts,
  onSubjectChange,
  onBodyChange,
  className
}: OutboundMailPreviewProps) {
  const model: OutreachMailModel = buildOutreachMailModel({
    subject,
    bodyText,
    senderName,
    contacts
  });

  return (
    <div className={cn("mail-canvas", className)} data-slot="outbound-mail-preview">
      <div className="mail-card">
        <div className="mail-inner">
          <EditablePaperField
            ariaLabel="Email subject"
            value={model.subject}
            onCommit={onSubjectChange}
            className="mail-title block"
          />
          {model.paragraphs.map((paragraph, index) => (
            <EditablePaperField
              key={`${index}-${paragraph.slice(0, 12)}`}
              ariaLabel={`Email paragraph ${index + 1}`}
              multiline
              allowEmpty
              value={paragraph}
              onCommit={(next) => {
                const nextParagraphs = [...model.paragraphs];
                if (next.length === 0) nextParagraphs.splice(index, 1);
                else nextParagraphs[index] = next;
                onBodyChange(nextParagraphs.join("\n\n"));
              }}
              className="mail-p mt-4 block"
            />
          ))}
          <p className="mail-p mt-4 text-muted-foreground">
            Warmly,
            <br />
            <span className="text-foreground">{model.senderName || "Your name"}</span>
          </p>
        </div>
        {model.contactLines.length > 0 ? (
          <div className="mail-foot">
            <p>
              {model.contactLines.map((line, index) => (
                <span key={line.text}>
                  {index > 0 ? " · " : ""}
                  {line.text}
                </span>
              ))}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

Add the `mail-card`/`mail-inner`/`mail-title`/`mail-p`/`mail-foot` classes to the web app's CSS (from the reference file's `Generic Matte` block — neutral palette, Inter stack, 30px title, hairline card border, 10px radius) into `apps/web/src/shared/apply-mail/apply-mail.css` imported by the component (mirror the `item-avatar.css` import pattern).

Paragraph commit semantics: single-paragraph bodies keep blank-line joins stable; empty paragraph = delete (spec allows editing structure).

- [ ] **Step 2: Run check**

Run: `cd apps/web && vp check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/shared/apply-mail/
git commit -m "feat(web): outbound mail preview twin (rendered mail is the editor)"
```

---

## Task 13: Web — slice renames + dialog section state

**Files:**

- Modify: `apps/web/src/pages/dashboard/tracked-jobs/_lib/application.slice.ts`

- [ ] **Step 1: Rename + extend**

```ts
export type ApplyPackageSection = "resume" | "cover" | "email";

type ApplicationUIState = {
  // ...
  /** Apply package review dialog (application id). */
  packageDialogAppId: string | null;
  /** Active section inside the review dialog. */
  packageDialogSection: ApplyPackageSection;
  // sendOutreachAppId: REMOVE
};

// actions
openPackageDialog: (applicationId: string, section?: ApplyPackageSection) => void;
setPackageDialogSection: (section: ApplyPackageSection) => void;
closePackageDialog: () => void;
```

Implementation (keep the 50ms defer for overlay opens):

```ts
openPackageDialog: (applicationId, section) => {
  window.setTimeout(() => {
    setState({
      packageDialogAppId: applicationId,
      packageDialogSection: section ?? "resume"
    });
  }, 50);
},
setPackageDialogSection: (section) => setState({ packageDialogSection: section }),
closePackageDialog: () => setState({ packageDialogAppId: null }),
```

Remove `sendOutreachAppId`, `openSendOutreach`, `closeSendOutreach`.

- [ ] **Step 2: Update every call site**

Run: `rg -ln "openPackageSheet|closePackageSheet|packageSheetAppId|sendOutreachAppId|SendOutreachDialog|openSendOutreach" apps/web/src`
Update each: sheet host → dialog host (Task 14), `use-dashboard-apply-package.ts` `openPackageSheet(data.id)` → `openPackageDialog(data.id, "resume")`, `send-outreach` entry points (tracked-jobs-page lazy block, application-item-actions, application-info-panel — wherever `openSendOutreach` was called) → `openPackageDialog(applicationId, "email")`.

- [ ] **Step 3: Run check**

Run: `cd apps/web && vp check`
Expected: PASS (dialog host lands in Task 14; if intermediate type errors block, land Task 13+14 together on one commit — noted deviation)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src
git commit -m "refactor(web): rename package sheet state to review dialog + section"
```

---

## Task 14: Web — dialog shell, host, entry points

**Files:**

- Create: `apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-dialog.tsx`
- Create: `apps/web/src/pages/dashboard/_lib/application-package-dialog-host.tsx`
- Delete: `apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-sheet.tsx`, `apps/web/src/pages/dashboard/_lib/application-package-sheet-host.tsx`
- Modify: `apps/web/src/routes/(root-layout)/__protected/dashboard/route.tsx` (host swap)
- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/send-outreach-dialog.tsx` → DELETE (entry points updated in Task 13)

- [ ] **Step 1: Shell component**

Near-fullscreen coss dialog per the reference. Load the coss skill dialog conventions first. Skeleton:

```tsx
"use client";

import { lazy, Suspense, useMemo, useState } from "react";

import { type ApplicationOutput, type ApplyPackageDraft } from "@tsu-stack/core";
import { ItemAvatar } from "@/shared/ui/item-avatar";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { ConfirmDialog } from "@tsu-stack/ui/components/confirm-dialog";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  useApplicationStore,
  type ApplyPackageSection
} from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import {
  useAcceptApplyPackageMutation,
  useGenerateApplyPackageMutation,
  parseApplyPackageDraft
} from "@/features/applications";

const ApplyPackageResumePane = lazy(() =>
  import("./apply-package-resume-pane").then((m) => ({ default: m.ApplyPackageResumePane }))
);
const ApplyPackageCoverPane = lazy(() =>
  import("./apply-package-cover-pane").then((m) => ({ default: m.ApplyPackageCoverPane }))
);
const ApplyPackageEmailPane = lazy(() =>
  import("./apply-package-email-pane").then((m) => ({ default: m.ApplyPackageEmailPane }))
);

const SECTIONS: Array<{ id: ApplyPackageSection; label: string }> = [
  { id: "resume", label: "Resume" },
  { id: "cover", label: "Cover letter" },
  { id: "email", label: "Email" }
];

export function ApplyPackageDialog({ application }: { application: ApplicationOutput }) {
  const { packageDialogSection, setPackageDialogSection, closePackageDialog } =
    useApplicationStore();
  const acceptMutation = useAcceptApplyPackageMutation();
  const generateMutation = useGenerateApplyPackageMutation();
  const [draft, setDraft] = useState<ApplyPackageDraft | null>(() =>
    parseApplyPackageDraft(application.applyPackageDraft)
  );
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  const serverDraft = useMemo(
    () => parseApplyPackageDraft(application.applyPackageDraft),
    [application]
  );
  const dirty = useMemo(
    () =>
      draft != null && serverDraft != null && JSON.stringify(draft) !== JSON.stringify(serverDraft),
    [draft, serverDraft]
  );
  const kitAccepted = application.resumeId != null;
  const busy = acceptMutation.isPending || generateMutation.isPending;
  const canSave = draft != null && !busy && (dirty || !kitAccepted);

  function handleSave() {
    if (!draft) return;
    acceptMutation.mutate({ applicationId: application.id, draft });
  }
  // ...
}
```

Header (logo + title + context row + state chip), sidebar, pane switch (`AnimatePresence`-free simple conditional with `motion-safe:animate-in`), footer (Regenerate · Cancel · Save — `title` tooltip when disabled):

- Sidebar items with live counts: Resume `2/2 + 4` (included experiences+projects / +skills), Cover letter `4 ¶` (paragraph count from `splitOutreachParagraphs(draft.coverLetterBody)`), Email `2 PDF` (from attachment toggles state passed up — see Task 16; until then `2` static from kit).
- State chip: `kitAccepted ? "Accepted" : "Draft · generated {relative}"` (reuse any existing relative-time helper — grep `timeAgo|formatDistance` in `shared/lib`; else `<time>` with absolute date).
- Context row: `Listing page included` badge when `draft?.jobContext.listingFetched`; URL chip link; `Description used` collapsible (`<details>` like the current sheet, char count in the summary).
- Footer note: "Edits stay local until Save · Send saves first" (mock copy).
- Regenerate confirm preserved (existing copy), wired to `generateMutation`.
- No-draft legacy state (`draft == null && kitAccepted`): Resume pane empty state "Prepare again to edit the tailored resume" + Cover/Email panes run off application rows (Task 16).
- Dialog sizing: `<DialogPopup className="flex h-[min(88vh,900px)] w-[min(94vw,1200px)] max-w-none flex-col gap-0 overflow-hidden p-0" showCloseButton>` — header/body/footer as flex rows inside.

- [ ] **Step 2: Layout host**

```tsx
// apps/web/src/pages/dashboard/_lib/application-package-dialog-host.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";

const ApplyPackageDialog = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/ui/apply-package-dialog").then((m) => {
    return { default: m.ApplyPackageDialog };
  })
);

export function ApplicationPackageDialogHost() {
  const { packageDialogAppId, closePackageDialog } = useApplicationStore();
  const applicationQuery = useQuery({
    ...orpcQueryClient.applications.get.queryOptions({ input: { id: packageDialogAppId ?? "" } }),
    enabled: packageDialogAppId != null
  });
  if (!packageDialogAppId) return null;
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) closePackageDialog();
      }}
    >
      <DialogPopup className="...">
        <Suspense fallback={null}>
          {applicationQuery.data ? (
            <ApplyPackageDialog
              key={applicationQuery.data.id}
              application={applicationQuery.data}
            />
          ) : null}
        </Suspense>
      </DialogPopup>
    </Dialog>
  );
}
```

(Final prop split between host and dialog is an implementation detail — keep the dialog self-contained around `application` and let the host own the `Dialog` wrapper + query, mirroring the old sheet host.)

- [ ] **Step 3: Route swap**

In `apps/web/src/routes/(root-layout)/__protected/dashboard/route.tsx`: import `ApplicationPackageDialogHost` from the new file (lazy as today), delete the old host import/usage.

- [ ] **Step 4: Verify shell renders**

Run the dev app, open Tracked jobs → an application with a prepared package → Review. Shell + sidebar + empty panes render; Save disabled; Regenerate confirm opens. (`pnpm dev` per repo workflow.)

- [ ] **Step 5: Commit**

```bash
git add -A apps/web/src
git commit -m "feat(web): apply package review dialog shell (Paper Studio)"
```

---

## Task 15: Web — Resume pane wiring

**Files:**

- Create: `apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-resume-pane.tsx`
- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-dialog.tsx` (compose)

- [ ] **Step 1: Queries + live rows**

```ts
const experiencesQuery = useQuery(orpcQueryClient.experiences.list.queryOptions());
const projectsQuery = useQuery(orpcQueryClient.projects.list.queryOptions());
const stacksQuery = useQuery(orpcQueryClient.stacks.list.queryOptions());
const educationsQuery = useQuery(orpcQueryClient.educations.list.queryOptions());
const certificationsQuery = useQuery(orpcQueryClient.certifications.list.queryOptions());
const profileQuery = useQuery(getProfileQueryOptions());
```

Build `ApplyPackageLiveRows` (map outputs; contacts filtered `includedInPortfolio` from `profileQuery.data.contacts`; profile name/email/summary). Memoize on query data.

- [ ] **Step 2: Pane**

≥`lg` (default): pane bar (`Tailored for this role` badge + counts badge + `Click any text on the paper to edit` hint) + stage with `ResumeDocPreview`:

```tsx
const preview = useMemo(
  () => (draft && liveRows ? buildApplyPackageDocPreview(draft, liveRows) : null),
  [draft, liveRows]
);

<ResumeDocPreview
  model={preview?.model ?? null}
  edit={paperEdit}
  evidenceByClientId={preview?.evidenceByClientId}
  includeByClientId={includeByClientId}
  onIncludeChange={handleIncludeChange}
  className="motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0"
/>;
```

`paperEdit` handlers (commit straight into `draft` via `onDraftChange` prop from the dialog):

- `onHeadlineChange` → `updateDraft({ headline: text })`
- `onSummaryChange` → `updateDraft({ professionalSummary: text || null })`
- `onBulletsChange(clientId, lines)` → experiences: `rewrittenBullets: lines`; projects: `rewrittenBullets: lines`
- `onProjectSummaryChange(clientId, text)` → `rewrittenSummary: text`
- `onExperienceChange/onProjectChange` (title/org identity) → **no-op functions** (identity is live-owned; the fields render read-only because handlers no-op — acceptable) — or omit by passing a handler that does nothing.
- `onProfileChange` → no-op (name is identity).

Include map: `includeByClientId` = draft experiences (clientId = experienceId) + projects (clientId = projectId) + educations/certs (all included — omit from the map so no switch renders, per spec include-when-present). `onIncludeChange` flips `draft.experiences[].include` / `projects[].include`.

Evidence map: comes straight from `preview.evidenceByClientId` (Task 9 builder returns `{ model, evidenceByClientId }` — kept-rows aligned).

Below `lg`: `ResumeDocCompactStrip` + stacked editors (headline Input, summary Textarea, per-item bullet textareas with include switches — reuse the current sheet's textarea pattern minus SnapshotDiff).

- [ ] **Step 3: Run check + manual pass**

Run: `cd apps/web && vp check`
Manual: toggling include re-renders the section instantly; evidence hover card shows original text; excluded sections show the "not on this resume" placeholder.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-resume-pane.tsx apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-dialog.tsx
git commit -m "feat(web): resume pane — tailored paper with evidence hover + include toggles"
```

---

## Task 16: Web — Cover + Email panes wiring (squares, Save/Send)

**Files:**

- Create: `apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-cover-pane.tsx`
- Create: `apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-email-pane.tsx`
- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/apply-package-dialog.tsx` (compose + footer save/send plumbing)
- Modify: `apps/web/src/features/applications/api/send-outreach.mutation.ts` (override passthrough)

- [ ] **Step 1: Cover pane**

`CoverLetterPaper` fed by `buildCoverLetterModel({ candidateName: profile.name, contacts: opted-in contacts, companyName: application.companyName, roleTitle: application.title, body: draft.coverLetterBody })`; paragraph commits join into `coverLetterBody`. Below `lg`: same paper full-width (it's already narrow-friendly).

- [ ] **Step 2: Email pane**

Layout per reference: To field (Input, `type="email"`, value = `draft.proposedRecruiterEmail ?? application.recruiterEmail ?? ""`, commits `proposedRecruiterEmail` — live-updates the Send visibility), then `OutboundMailPreview` (subject/body edits commit `outreachSubject`/`outreachBody`), then attachment squares row, then warning (all-off), then Send button.

Attachment state (local, send-time only):

```ts
const [attachments, setAttachments] = useState({ resume: true, cover: true });
const hasRecipient =
  (draft.proposedRecruiterEmail ?? application.recruiterEmail ?? "").trim().length > 0;
const kitAccepted = application.resumeId != null && application.coverLetterR2Key != null;
```

Square states: kit exists → filename (`application` row filename fallbacks: resume filename via `resumes` query or generic `Resume.pdf` — use `formatTailoredResumeFilename`-shaped display or the stored `coverLetterFilename`; simplest: cover shows `application.coverLetterFilename`, resume shows `"Resume — {application.companyName}.pdf"` unless the resumes query is already loaded); pre-accept → dashed missing square labeled "Generated on Save" (toggle still allowed).

Send flow (in dialog, plumbed through props):

```ts
async function handleSend() {
  if (!draft) return;
  try {
    if (dirty || !kitAccepted) {
      // mutateAsync rejections are toasted by the mutation's onError; catch
      // here only to avoid an unhandled rejection (spec #8: Send = Save+send).
      await acceptMutation.mutateAsync({ applicationId: application.id, draft });
    }
    await sendMutation.mutateAsync({
      applicationId: application.id,
      overrides: {
        to: (draft.proposedRecruiterEmail ?? application.recruiterEmail ?? "").trim() || undefined,
        subject: draft.outreachSubject,
        body: draft.outreachBody,
        attachments
      }
    });
    closePackageDialog();
  } catch {
    // handled by mutation onError toasts
  }
}
```

Send button: rendered **only when `hasRecipient`** (spec #8 — hidden, not disabled). While `!kitAccepted` the button label stays "Send" (it saves first); success toast from the existing mutations.

`send-outreach.mutation.ts`: extend the mutate input type to pass `overrides` through to `applications.sendOutreach` (oRPC client types flow automatically once the schema lands in Task 6 — verify no manual casting needed).

- [ ] **Step 3: Sidebar counts from real state**

Email sidebar count: `Number(attachments.resume) + Number(attachments.cover)` PDF. Cover ¶ count from the model. Resume count from the model sections.

- [ ] **Step 4: Run check + manual pass**

Run: `cd apps/web && vp check`
Manual: Send hidden without recipient; toggling squares updates count + warning; Save accepts (kit appears); reopen keeps edits (draft survived); legacy no-draft application renders row-based Cover/Email + Resume prepare-again state.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): cover + email panes with attachment squares and Send"
```

---

## Task 17: Cleanup + full validation

**Files:**

- Modify: `apps/web/src/features/applications/lib/apply-package.ts` (remove `experienceMasterMarkdown`, `projectMasterMarkdown`, `experienceSnapshotMarkdown`, `projectSnapshotMarkdown`, `snapshotFileDiffLines` if now unused)
- Modify: `apps/web/src/features/applications/index.ts` (drop removed exports)
- Delete: `apps/web/src/shared/ui/agents/file-diff.tsx` import from the sheet (file itself is used elsewhere — grep before touching)

- [ ] **Step 1: Grep for dead exports**

Run: `rg -n "experienceMasterMarkdown|projectMasterMarkdown|snapshotFileDiffLines|experienceSnapshotMarkdown|projectSnapshotMarkdown|SnapshotDiff" apps/web/src`
Remove definitions/exports with zero remaining consumers.

- [ ] **Step 2: Full validation**

Run: `vp run -w fix && vp run test:unit:run`
Expected: PASS across the workspace.

- [ ] **Step 3: Commit**

```bash
git add -A apps/web/src
git commit -m "chore(web): remove snapshot diff machinery from apply package"
```

---

## Task 18: Parity diff loop + hardening

- [ ] **Step 1: Screenshots — loaded + sparse**

Use the screenshot skill (`.opencode/skills/screenshot/SKILL.md`) against the dev app:

- **Loaded record:** an application with a fresh package (2 experiences, 1 project, stacks, full cover letter + outreach) — compare Resume/Cover/Email panes against `design-explorations/review-apply-package-A.reference.html`. Enumerate deltas: presence, size, weight, spacing, color, radius. Fix and repeat to zero (or document deliberate deviations in the manifest).
- **Sparse record:** null logo (blobatar renders), 1 experience, no summary, no contacts, no recruiter email (Send hidden), pre-accept (missing squares) — must read as designed: placeholders carry weight, never holes (manifest gap decisions: blobatar derive, headline chain, missing-square state).

- [ ] **Step 2: Honesty spot-checks**

- Paper sections == what the accepted PDF renders for the same draft (render once, compare).
- Sent test email (own address) matches the preview structure (same model).

- [ ] **Step 3: ai-feature-harness**

Run `.agents/skills/ai-feature-harness/SKILL.md` (spec Verification requirement): inbound auth/tenant checks on the send + accept endpoints, agent-take trigger health, eval baseline unaffected by the notes removal. Append lessons to the skill's `LESSONS.md`.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(web): apply package review dialog — parity pass"
```
