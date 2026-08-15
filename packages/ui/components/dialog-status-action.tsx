"use client";

import { type MouseEventHandler, type ReactNode } from "react";

import { type ButtonProps } from "@tsu-stack/ui/components/button";
import {
  StatusSubmitButton,
  type StatusSubmitVisual
} from "@tsu-stack/ui/components/status-submit-button";

/**
 * Shared dialog footer chrome. Idle uses `variant` (destructive / default /
 * outline / ghost). `loading` switches to the pending glow. Call sites should not
 * restyle this — use AlertDialogAction / AlertDialogCancel / DialogAction /
 * DialogCancel.
 */
export type DialogStatusActionProps = {
  variant?: ButtonProps["variant"];
  size?: "sm" | "default";
  loading?: boolean;
  /** Failed / success after the action runs. `loading` still wins while pending. */
  state?: StatusSubmitVisual;
  disabled?: boolean;
  label: string;
  icon?: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function labelFromChildren(children: ReactNode): string | undefined {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  return undefined;
}

export function dialogStatusSize(size: ButtonProps["size"]): "sm" | "default" {
  return size === "default" ? "default" : "sm";
}

export function DialogStatusAction({
  variant = "default",
  size = "sm",
  loading = false,
  state,
  disabled,
  label,
  icon,
  className,
  onClick
}: DialogStatusActionProps) {
  return (
    <StatusSubmitButton
      idleVariant={variant}
      loading={loading}
      state={state}
      label={label}
      size={size}
      disabled={disabled}
      icon={icon}
      className={className}
      onClick={onClick}
    />
  );
}
