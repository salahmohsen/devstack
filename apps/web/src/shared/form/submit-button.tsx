"use client";

import { useStore } from "@tanstack/react-form";
import { Check, Send } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import { IconMorph } from "@tsu-stack/ui/components/icon-motion";
import { StatusSubmitButton } from "@tsu-stack/ui/components/status-submit-button";

import { useFormContext } from "./form-contexts";
import { useStatusSubmitState } from "./use-status-submit-state";

type SubmitButtonProps = {
  children?: React.ReactNode;
  actionLabel?: string;
  isLoading?: boolean;
  className?: string;
  size?: "sm" | "default";
  type?: "button" | "submit";
  onClick?: () => void;
  resetKey?: unknown;
  submitFailed?: boolean;
  /**
   * Auth and other always-visible submits that must not use status chrome.
   */
  plain?: boolean;
  variant?: "default" | "destructive" | "outline" | "ghost" | "link";
  light?: "none" | "skeuomorphic";
};

function SubmitButton({
  children,
  actionLabel,
  isLoading,
  className,
  size = "default",
  type,
  onClick,
  resetKey,
  submitFailed,
  plain = false,
  ...plainButtonProps
}: SubmitButtonProps) {
  const form = useFormContext();
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
  const isDirty = useStore(form.store, (state) => state.isDirty);
  const canSubmit = useStore(form.store, (state) => state.canSubmit);
  const values = useStore(form.store, (state) => state.values);
  const labelFromChildren = typeof children === "string" ? children : undefined;
  const derived = useStatusSubmitState({
    mode: "persist",
    actionLabel: actionLabel ?? labelFromChildren ?? "Save",
    isDirty,
    isSubmitting: Boolean(isLoading ?? isSubmitting),
    canSubmit,
    valuesKey: values,
    resetKey,
    submitFailed
  });

  if (plain) {
    const busy = Boolean(isLoading ?? isSubmitting);
    return (
      <Button
        type={type ?? "submit"}
        disabled={busy}
        loading={busy}
        className={className}
        onClick={onClick}
        {...plainButtonProps}
      >
        {!busy ? (
          <IconMorph
            mode="hover"
            iconA={<Send className="size-4" aria-hidden />}
            iconB={<Check className="size-4" aria-hidden />}
          />
        ) : null}
        {children}
      </Button>
    );
  }

  return (
    <StatusSubmitButton
      state={derived.state}
      label={derived.label}
      disabled={derived.disabled}
      type={type ?? derived.type}
      size={size}
      className={className}
      onClick={onClick}
    />
  );
}

export { SubmitButton };
