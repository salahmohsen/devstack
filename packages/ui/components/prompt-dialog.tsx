"use client";

import { type ReactNode } from "react";

import {
  Dialog,
  DialogAction,
  DialogCancel,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { Form } from "@tsu-stack/ui/components/form";
import { cn } from "@tsu-stack/ui/lib/utils";

export type PromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Leading mark in the header (icon only). */
  icon?: ReactNode;
  children: ReactNode;
  cancelLabel?: string;
  submitLabel?: string;
  submitLoading?: boolean;
  submitDisabled?: boolean;
  /** Called on Enter and on the primary action. */
  onSubmit: () => void;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Compact one-purpose input dialog (coss `p-dialog-1`).
 *
 * Header stays outside the form. `Form className="contents"` wraps panel + footer
 * so the popup’s column treats those as layout sections. Use Dialog — not
 * AlertDialog — for collect-a-value flows.
 */
export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  cancelLabel = "Cancel",
  submitLabel = "Continue",
  submitLoading = false,
  submitDisabled = false,
  onSubmit,
  size = "sm",
  className
}: PromptDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        showCloseButton={false}
        className={cn(size === "sm" ? "sm:max-w-sm" : "sm:max-w-md", className)}
      >
        <DialogHeader>
          <div className="flex items-start gap-3">
            {icon ? (
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/50 text-muted-foreground"
              >
                {icon}
              </span>
            ) : null}
            <div className="min-w-0 space-y-1.5">
              <DialogTitle className="text-base text-pretty">{title}</DialogTitle>
              {description ? (
                <DialogDescription className="text-pretty">{description}</DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>
        <Form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (submitLoading || submitDisabled) return;
            onSubmit();
          }}
        >
          <DialogPanel className="grid gap-4">{children}</DialogPanel>
          <DialogFooter>
            <DialogCancel disabled={submitLoading}>{cancelLabel}</DialogCancel>
            <DialogAction
              loading={submitLoading}
              disabled={submitDisabled}
              onClick={() => {
                if (submitLoading || submitDisabled) return;
                onSubmit();
              }}
            >
              {submitLabel}
            </DialogAction>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
