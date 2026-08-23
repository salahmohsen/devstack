"use client";
// beui.dev/components/agents/approval-card

import { Check, LoaderCircle, MessageSquareText, X } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

import { AgentDisclosure } from "@/shared/ui/agents/agent-disclosure";

import { ActionSwapRollText } from "./action-swap-roll-text";
import { type ApprovalCardProps, type ApprovalCardStatus } from "./types";

function getStatusLabel(status: ApprovalCardStatus) {
  if (status === "submitting") return "Submitting";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "changes-requested") return "Changes requested";
  if (status === "answered") return "Response submitted";
  return "Input required";
}

function getStatusClass(status: ApprovalCardStatus) {
  if (status === "approved" || status === "answered") {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (status === "rejected") return "text-rose-600 dark:text-rose-400";
  if (status === "changes-requested") {
    return "text-amber-600 dark:text-amber-400";
  }
  return "text-muted-foreground";
}

function getStatusBadgeClass(status: ApprovalCardStatus) {
  if (status === "pending" || status === "changes-requested") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
  if (status === "submitting") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400";
  }
  if (status === "approved" || status === "answered") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
  return "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400";
}

export function ApprovalCard({
  title = "Approval required",
  description,
  children,
  status = "pending",
  onApprove,
  onReject,
  onRequestChanges,
  onDismiss,
  approveLabel = "Approve",
  approveVariant = "default",
  rejectLabel = "Reject",
  result,
  className,
  approveDisabled = false,
  rejectDisabled = false,
  "data-tool-call-id": toolCallId,
  "data-hitl-kind": hitlKind
}: ApprovalCardProps) {
  const reduce = useReducedMotion() ?? false;
  const pending = status === "pending";
  const busy = status === "submitting";
  const interactive = pending || busy;
  const titleKey = String(status);
  const statusLabel = getStatusLabel(status);

  return (
    <div
      data-state={status}
      data-tool-call-id={toolCallId}
      data-hitl-kind={hitlKind}
      aria-busy={busy}
      className={cn("w-full overflow-hidden rounded-2xl bg-muted px-5 py-4 text-sm", className)}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 grid size-5 shrink-0 place-items-center text-muted-foreground",
            getStatusClass(status)
          )}
        >
          {busy ? (
            <LoaderCircle className={cn("size-4", !reduce && "animate-spin")} />
          ) : interactive ? (
            <MessageSquareText className="size-4" />
          ) : status === "rejected" ? (
            <X className="size-4" />
          ) : (
            <Check className="size-4" />
          )}
        </span>

        <div className="flex min-w-0 flex-1 items-start gap-3">
          <h3 className="min-w-0 flex-1 text-base leading-5 font-medium text-foreground">
            <ActionSwapRollText value={titleKey}>{title}</ActionSwapRollText>
          </h3>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
              getStatusBadgeClass(status)
            )}
          >
            {statusLabel}
          </span>
          {onDismiss ? (
            <button
              type="button"
              aria-label="Dismiss"
              onClick={onDismiss}
              className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {description ? <p className="mt-2 leading-5 text-muted-foreground">{description}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}

      <AgentDisclosure open={interactive}>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {onApprove ? (
            <Button
              size="sm"
              variant={approveVariant === "destructive" ? "destructive" : "default"}
              animate={false}
              disabled={busy || approveDisabled}
              loading={busy}
              onClick={onApprove}
            >
              {approveLabel}
            </Button>
          ) : null}
          {onRequestChanges ? (
            <Button
              variant="secondary"
              size="sm"
              animate={false}
              disabled={busy}
              onClick={onRequestChanges}
            >
              Request changes
            </Button>
          ) : null}
          {onReject ? (
            <Button
              variant="outline"
              size="sm"
              animate={false}
              disabled={busy || rejectDisabled}
              onClick={onReject}
              className="text-muted-foreground hover:text-rose-600 hover:dark:text-rose-400"
            >
              {rejectLabel}
            </Button>
          ) : null}
        </div>
      </AgentDisclosure>

      {!interactive && result ? (
        <p className="mt-2 text-sm text-muted-foreground">{result}</p>
      ) : null}
    </div>
  );
}
