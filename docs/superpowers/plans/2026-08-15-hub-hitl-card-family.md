# Hub HITL card family — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **REQUIRED after implementation:** [app-ai-feature-hardening](../../../.agents/skills/app-ai-feature-hardening/SKILL.md) — load the skill, read `LESSONS.md`, run a fresh loop on hub Thread HITL cards (JD, triage, package/send approval), and append lessons. Do not claim done from a visual screenshot.

**Goal:** One `HubHitlFrame` and four kinds so existing hub pause cards share chrome; kill the JSON approval dump; leave playbook tools to 3b.

**Architecture:** App-local frame in `features/agent-hub/ui`. Approval/confirm render as coss `Alert` (inline, not `AlertDialog`). Recommendation/elicitation render as coss `Card`. Toolkit resume paths stay `addResult` + `addToolOutput` / `respondToApproval`. No new Mastra tools. No composer attachment change.

**Tech Stack:** `@assistant-ui/react` toolkit (already), coss `@tsu-stack/ui` Alert/Card/Button, lucide icons, existing `hub-tool-names` parsers.

**Spec:** `docs/superpowers/specs/2026-08-15-hub-hitl-card-family-design.md`

**Skills:** `@coss`, `@assistant-ui` `tools` (HITL resume only), `@impeccable` (operate), `@app-ai-feature-hardening` after ship.

---

## File map

| Area          | Create / modify                                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frame         | Create `apps/web/src/features/agent-hub/ui/hub-hitl-frame.tsx`                                                                                              |
| Approval copy | Create `apps/web/src/features/agent-hub/lib/hub-approval-summary.ts`; tests in existing `apps/web/src/features/agent-hub/lib/hub-superpowers-tools.test.ts` |
| Approval card | Modify `apps/web/src/features/agent-hub/ui/agent-hub-tool-approval.tsx`                                                                                     |
| Toolkit       | Modify `apps/web/src/features/agent-hub/ui/hub-assistant-toolkit.tsx` only if approval props change (pass `toolName` + `args` into summary)                 |
| JD card       | Modify `apps/web/src/features/agent-hub/ui/application-from-jd-card.tsx`                                                                                    |
| Triage card   | Modify `apps/web/src/features/agent-hub/ui/new-jobs-triage-card.tsx`                                                                                        |
| Public API    | Modify `apps/web/src/features/agent-hub/index.ts` only if a new helper is exported (do **not** export `HubHitlFrame` — widgets do not need it)              |
| Spec          | Update status + plan link on the 3c spec                                                                                                                    |

**Do not touch:** Mastra tools, `lastHubHitlKind` sets (no new tool names), composer attachments, playbook cards, `packages/ui`.

---

## Locked implementation notes

1. **One width:** `w-full max-w-[min(72ch,100%)]`. Drop approval’s `max-w-3xl`.
2. **`send-apply-outreach` stays `requireToolApproval`.** Visual kind is `confirm` (Send / Don’t send). Still `respondToApproval`. Do not convert it to `addToolOutput`.
3. **No application fetch** on the approval card. Args today are `{ applicationId }` or mail `{ messageId, subject, bodyText }`. Show a human verb + id/subject. Never `JSON.stringify`. Never dump `bodyText` / `description`.
4. **Not a modal.** Do not use `AlertDialog`. Escape must not decline. coss Alert docs prefer AlertDialog for “must act” — ignore that here; the thread is the dialog.
5. **Alert icons are semantic** — do **not** put `aria-hidden` on the Shield / Send icon (coss alert pitfall).
6. **Receipt lines stay in the toolkit**, not the frame. Frame is only the pending card.
7. **Playbook cards are out.** 3b mounts this frame later.

---

### Task 1: Approval summary helper

**Files:**

- Create: `apps/web/src/features/agent-hub/lib/hub-approval-summary.ts`
- Modify: `apps/web/src/features/agent-hub/lib/hub-superpowers-tools.test.ts`

- [ ] **Step 1:** Add the helper. Normalize kebab and camel tool names.

```ts
export type HubApprovalSummary = {
  kind: "approval" | "confirm";
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string;
};

function str(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function summarizeHubApproval(
  toolName: string,
  args: Record<string, unknown>
): HubApprovalSummary {
  const name = toolName.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/^-/, "");

  if (name === "generate-apply-package") {
    const id = str(args, "applicationId");
    return {
      kind: "approval",
      title: "Generate apply package",
      body: id
        ? `Create resume and letter drafts for application ${id}.`
        : "Create resume and letter drafts for this application.",
      primaryLabel: "Approve",
      secondaryLabel: "Decline"
    };
  }
  if (name === "accept-apply-package") {
    return {
      kind: "approval",
      title: "Accept apply package",
      body: "Write the resume and cover letter PDFs for this application.",
      primaryLabel: "Approve",
      secondaryLabel: "Decline"
    };
  }
  if (name === "send-apply-outreach") {
    return {
      kind: "confirm",
      title: "Send apply outreach",
      body: "Send the first-apply email with the resume PDF. This marks the application applied.",
      primaryLabel: "Send",
      secondaryLabel: "Don't send"
    };
  }
  if (name === "send-mail-reply") {
    const subject = str(args, "subject");
    return {
      kind: "confirm",
      title: "Send mail reply",
      body: subject ? `Send reply: ${subject}` : "Send this Career Inbox reply.",
      primaryLabel: "Send",
      secondaryLabel: "Don't send"
    };
  }
  if (name === "create-application") {
    const title = str(args, "title");
    const company = str(args, "companyName");
    const who = [title, company].filter(Boolean).join(" at ");
    return {
      kind: "approval",
      title: "Create application",
      body: who ? `Save ${who} to your pipeline.` : "Save this application to your pipeline.",
      primaryLabel: "Approve",
      secondaryLabel: "Decline"
    };
  }
  return {
    kind: "approval",
    title: "Approval required",
    body: "The hub wants to run a tool that has side effects. Review and continue or decline.",
    primaryLabel: "Approve",
    secondaryLabel: "Decline"
  };
}
```

Camel → kebab: `sendApplyOutreach` → `send-apply-outreach`. If a name is already kebab, the replace still works (`send-apply-outreach` has no `A-Z`).

- [ ] **Step 2:** Add cases to `hub-superpowers-tools.test.ts` (existing file; this is the new logic, not a new suite):

  - `generateApplyPackage` + `{ applicationId: "app_1" }` → approval, body includes `app_1`, no `{`
  - `send-apply-outreach` → kind `confirm`, primary `Send`
  - `send-mail-reply` + `{ subject: "Thanks", bodyText: "SECRET" }` → body includes `Thanks`, does **not** include `SECRET`
  - `create-application` + title/company → body includes both
  - unknown tool → fallback title, still no JSON

- [ ] **Step 3:** `vp run --filter @tsu-stack/web test:unit` (or the package script that already runs `hub-superpowers-tools.test.ts`). Expect pass.

---

### Task 2: `HubHitlFrame`

**Files:**

- Create: `apps/web/src/features/agent-hub/ui/hub-hitl-frame.tsx`

- [ ] **Step 1:** Implement the frame. Use coss Card for `recommendation` / `elicitation`, coss Alert for `approval` / `confirm`.

```tsx
"use client";

import { ShieldAlert, Sparkles } from "lucide-react";
import * as React from "react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle
} from "@tsu-stack/ui/components/card";
import { cn } from "@tsu-stack/ui/lib/utils";

export type HubHitlFrameKind = "approval" | "recommendation" | "elicitation" | "confirm";

export function HubHitlFrame({
  kind,
  title,
  description,
  icon,
  footer,
  submitting = false,
  toolCallId,
  className,
  children
}: {
  kind: HubHitlFrameKind;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  submitting?: boolean;
  toolCallId?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const headingId = React.useId();
  const width = "w-full max-w-[min(72ch,100%)]";
  const interrupt = kind === "approval" || kind === "confirm";

  if (interrupt) {
    return (
      <Alert
        variant="warning"
        role="alertdialog"
        aria-labelledby={headingId}
        data-tool-call-id={toolCallId}
        data-hitl-kind={kind}
        className={cn(width, className)}
      >
        {icon ?? <ShieldAlert />}
        <AlertTitle id={headingId}>{title}</AlertTitle>
        <AlertDescription>
          {description}
          {children}
          {submitting ? (
            <p className="m-0 text-xs text-muted-foreground" aria-live="polite">
              Submitting…
            </p>
          ) : null}
        </AlertDescription>
        {footer ? <AlertAction>{footer}</AlertAction> : null}
      </Alert>
    );
  }

  return (
    <Card
      role="region"
      aria-labelledby={headingId}
      data-tool-call-id={toolCallId}
      data-hitl-kind={kind}
      className={cn(width, "bg-muted/30 shadow-none", className)}
    >
      <CardHeader>
        {icon ?? <Sparkles className="size-4 text-muted-foreground" aria-hidden />}
        <CardTitle id={headingId} className="text-sm">
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {children ? <CardPanel className="px-4 pb-2">{children}</CardPanel> : null}
      {footer ? (
        <CardFooter className="flex flex-wrap gap-2 border-t-0 px-4 pb-4">{footer}</CardFooter>
      ) : null}
      {submitting ? (
        <p className="px-4 pb-3 text-xs text-muted-foreground" aria-live="polite">
          Submitting…
        </p>
      ) : null}
    </Card>
  );
}
```

Check `CardHeader` actually lays out an icon + title. If the coss Card header is title-only and the extra icon child breaks grid, drop the default `Sparkles` and keep the title as the heading (JD already has its own title in the body). Prefer a working header over forcing an icon.

- [ ] **Step 2:** Confirm Card/Alert imports compile. If `CardPanel` / `CardFooter` class names differ, match existing dashboard cards (e.g. `page-header.tsx`) — do not invent a second card language.

---

### Task 3: Restyle `AgentHubToolApproval`

**Files:**

- Modify: `apps/web/src/features/agent-hub/ui/agent-hub-tool-approval.tsx`
- Modify: `apps/web/src/features/agent-hub/ui/hub-assistant-toolkit.tsx` only if the approval component API changes

- [ ] **Step 1:** Rewrite the approval card to use the frame + summary. Delete the `<pre>` JSON block.

```tsx
export function AgentHubToolApproval({
  toolName,
  args,
  onApprove,
  onDecline,
  isPending = false
}: {
  toolName: string;
  args: Record<string, unknown>;
  onApprove: () => void;
  onDecline: () => void;
  isPending?: boolean;
}) {
  const summary = summarizeHubApproval(toolName, args);
  return (
    <HubHitlFrame
      kind={summary.kind}
      title={summary.title}
      description={summary.body}
      submitting={isPending}
      footer={
        <>
          <Button size="sm" onClick={onApprove} disabled={isPending} loading={isPending} autoFocus>
            {summary.primaryLabel}
          </Button>
          <Button variant="destructive" size="sm" onClick={onDecline} disabled={isPending}>
            {summary.secondaryLabel}
          </Button>
        </>
      }
    />
  );
}
```

`ApprovalGatedToolUI` already passes `toolName` + `args`. No toolkit change required if this signature stays.

- [ ] **Step 2:** Keep `respond` / `respondToApproval` / `addToolApprovalResponse` exactly as today. Do not change pending-state detection.

- [ ] **Step 3:** `vp check` (or `vp check` scoped to `apps/web`) on the touched files.

---

### Task 4: JD card → Recommendation

**Files:**

- Modify: `apps/web/src/features/agent-hub/ui/application-from-jd-card.tsx`

- [ ] **Step 1:** Wrap the existing body in `HubHitlFrame`. Do **not** change `onSubmit` / `handleAction` / action labels.

  - `kind="recommendation"`
  - `title` = job title (same fallback “Untitled role”)
  - `description` = company · location · match line (what is now the meta row), not the full JD
  - children = listing link + clipped description + notes
  - footer = the three existing buttons; `autoFocus` on **Continue with package**
  - `toolCallId={toolCallId}`
  - `submitting={submitting}`
  - Remove the outer hand-rolled `rounded-xl border …` wrapper so width/chrome come only from the frame
  - Delete the inner “Submitting…” `<p>` — the frame owns that line

- [ ] **Step 2:** Toolkit `ProposeApplicationFromJdToolUI` receipt lines stay. Do not move receipts into the frame.

---

### Task 5: Triage card → Recommendation

**Files:**

- Modify: `apps/web/src/features/agent-hub/ui/new-jobs-triage-card.tsx`

- [ ] **Step 1:** Same wrap.

  - `kind="recommendation"`
  - `title="New jobs triage"`
  - `description="Uncheck anything you want to skip, then confirm. No jobs change until you confirm."`
  - children = the two `RowList`s (logic unchanged)
  - footer = existing Confirm / Cancel buttons; `autoFocus` on **Confirm**
  - Keep checkbox toggle + sibling-cancel behavior in the toolkit
  - Delete the inner “Submitting…” line if present — the frame owns it

- [ ] **Step 2:** `vp check` for `apps/web`.

---

### Task 6: Verify + harden

**Files:** none new. Follow `.agents/skills/app-ai-feature-hardening/SKILL.md`.

- [ ] **Step 1:** Browser, desktop + a narrow width (~390). Hub Thread:

  | Path                               | Expect                                                        |
  | ---------------------------------- | ------------------------------------------------------------- |
  | Paste a JD → proposal card         | Recommendation frame, three buttons, no JSON                  |
  | Package / Save / Dismiss           | Receipt line replaces card; composer unlocks; run resumes     |
  | New jobs triage                    | Same frame width; Confirm / Cancel still work                 |
  | Generate / accept package approval | Human title+body, Approve/Decline, **no** `{ "applicationId"` |
  | Send outreach / send mail reply    | Confirm copy (Send / Don’t send), still approval resume       |
  | Pending HITL                       | Composer placeholder “Waiting…”, input disabled               |
  | After receipt                      | Composer enabled                                              |

- [ ] **Step 2:** Hunt regressions: Tracked-jobs / Import JD floater if it renders the same toolkit; history reload of a completed JD card still shows the receipt, not a live card.

- [ ] **Step 3:** Append lessons to `.agents/skills/app-ai-feature-hardening/LESSONS.md`. Write a hardening report. Do not claim done without the loop.

---

### Task 7: Spec status

**Files:**

- Modify: `docs/superpowers/specs/2026-08-15-hub-hitl-card-family-design.md`

- [ ] **Step 1:** After ship, set spec **Status:** Implemented. The plan link is already on the spec — do not rewrite it to “Plan written”.

---

## Out of scope

- Playbook HITL tools (`configure-integration`, `extract-resume`, `confirm-resume-apply`, prefs, contact)
- Long-job / thinking / tool-failure chrome
- Follow-up suggestion chips (spec P1)
- Fetching application title for package approval
- Changing `requireToolApproval` tools to client tools
- Installing assistant-ui Elements demo cards
- Composer slash / attachments / mentions
