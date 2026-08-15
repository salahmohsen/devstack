import { type ReactNode } from "react";
import { toast } from "sonner";

import { WorkflowSolvingOrb } from "@/shared/ui/ai-flow-trigger";

/**
 * AI job toast body — step line uses the shared shadcn `shimmer` utility.
 * Mount once per job; drive `stepLabel` from a store so the animation is not remounted.
 */
export function AiJobRunningToastBody({
  title,
  stepLabel
}: {
  title: string;
  stepLabel: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm leading-snug font-medium">{title}</span>
      <span className="shimmer text-sm leading-snug font-medium text-foreground">
        {stepLabel ?? "Working…"}
      </span>
    </div>
  );
}

/**
 * Mount a stable AI job toast once per run.
 *
 * Do **not** use `toast.loading()` — custom `icon` is ignored for that type.
 * Do **not** re-call this on every step change: remounting resets the shimmer.
 * Pass a store-subscribed `body` and update step text via the store.
 */
export function showAiJobRunningToast(options: {
  id: string;
  onCancel: () => void;
  cancelLabel?: string;
  /** Live React body (subscribe to job store so step text updates in place) */
  body: ReactNode;
}) {
  const { id, onCancel, cancelLabel = "Cancel", body } = options;

  toast(body, {
    id,
    icon: <WorkflowSolvingOrb size="toast" />,
    className:
      "w-[368px]! items-center! [&_[data-content]]:min-w-0! [&_[data-icon]]:size-[calc((2*0.875rem*1.375+0.125rem)/0.82)]! [&_[data-icon]]:min-h-[calc((2*0.875rem*1.375+0.125rem)/0.82)]! [&_[data-icon]]:min-w-[calc((2*0.875rem*1.375+0.125rem)/0.82)]!",
    duration: Infinity,
    action: {
      label: cancelLabel,
      onClick: () => {
        onCancel();
      }
    }
  });
}
