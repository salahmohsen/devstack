"use client";

import { type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { type ButtonProps } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /**
   * Optional body between description and footer
   * (e.g. To / Subject rows on send-outreach).
   */
  children?: ReactNode;
  /** Leading mark in the header (icon only). */
  icon?: ReactNode;
  cancelLabel?: ReactNode;
  confirmLabel?: ReactNode;
  /** Primary action chrome. Prefer `destructive` for delete/remove. */
  confirmVariant?: ButtonProps["variant"];
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  /**
   * Ignore dismiss (Escape / outside / Cancel close) while `confirmLoading`.
   * Default true — matches stack/application delete guards.
   */
  blockDismissWhileLoading?: boolean;
  /** Called from the primary action. Does not auto-close; caller owns `open`. */
  onConfirm: () => void;
  className?: string;
};

/**
 * Shared yes/no confirm (coss AlertDialog).
 *
 * Use for destroy/discard/send confirms. Collect-a-value flows stay on
 * {@link PromptDialog} (Dialog, not AlertDialog).
 *
 * Footer chrome: `AlertDialogCancel` + `AlertDialogAction` with `loading` —
 * do not swap in raw Buttons.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  icon,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  confirmVariant = "default",
  confirmLoading = false,
  confirmDisabled = false,
  blockDismissWhileLoading = true,
  onConfirm,
  className
}: ConfirmDialogProps): React.ReactElement {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && blockDismissWhileLoading && confirmLoading) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent className={cn(className)}>
        <AlertDialogHeader>
          {icon ? (
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/50 text-muted-foreground"
              >
                {icon}
              </span>
              <div className="min-w-0 space-y-1.5">
                <AlertDialogTitle className="text-pretty">{title}</AlertDialogTitle>
                {description ? (
                  <AlertDialogDescription className="text-pretty">
                    {description}
                  </AlertDialogDescription>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <AlertDialogTitle className="text-pretty">{title}</AlertDialogTitle>
              {description ? (
                <AlertDialogDescription className="text-pretty">
                  {description}
                </AlertDialogDescription>
              ) : null}
            </>
          )}
        </AlertDialogHeader>
        {children ? <div className="space-y-2 px-6 pb-2 text-sm">{children}</div> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirmLoading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={confirmVariant}
            loading={confirmLoading}
            disabled={confirmDisabled || confirmLoading}
            onClick={() => {
              if (confirmLoading || confirmDisabled) return;
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
