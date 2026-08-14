"use client";

import { type UsernameAvailabilityStatus } from "@tsu-stack/core";
import {
  StatusSubmitButton,
  type StatusSubmitVisual
} from "@tsu-stack/ui/components/status-submit-button";

type UsernameRenameSubmitProps = {
  currentUsername: string;
  username: string;
  /** True while a check for *this* typed value is in flight (including debounce). */
  isChecking: boolean;
  isSubmitting: boolean;
  /** Server/schema availability for the current typed value only; null if stale. */
  availability: UsernameAvailabilityStatus | "error" | null;
  errors: unknown[];
};

type UsernameRenameSubmitView = {
  state: StatusSubmitVisual;
  label: string;
  disabled: boolean;
};

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

function availabilityStatusFromErrors(errors: unknown[]): UsernameAvailabilityStatus | null {
  for (const error of errors) {
    if (error && typeof error === "object" && "status" in error) {
      const status = (error as { status: unknown }).status;
      if (status === "taken" || status === "reserved" || status === "invalid") {
        return status;
      }
    }
    const message = errorMessage(error);
    if (/already taken|not available/i.test(message)) return "taken";
    if (/reserved/i.test(message)) return "reserved";
  }
  return null;
}

function unavailableLabel(status: UsernameAvailabilityStatus): string {
  if (status === "reserved") return "Reserved";
  if (status === "invalid") return "Invalid";
  return "Used";
}

function getUsernameRenameSubmitView({
  currentUsername,
  username,
  isChecking,
  isSubmitting,
  availability,
  errors
}: UsernameRenameSubmitProps): UsernameRenameSubmitView {
  const normalized = username.trim().toLowerCase();
  const isDirty = Boolean(currentUsername) && normalized !== currentUsername;
  const errorAvailability = availabilityStatusFromErrors(errors);
  const resolvedAvailability =
    availability === "taken" || availability === "reserved" || availability === "available"
      ? availability
      : errorAvailability;

  if (isSubmitting) {
    return { state: "pending", label: "Saving…", disabled: true };
  }
  if (isDirty && isChecking) {
    return { state: "pending", label: "Checking…", disabled: true };
  }
  if (isDirty && (resolvedAvailability === "taken" || resolvedAvailability === "reserved")) {
    return { state: "unavailable", label: unavailableLabel(resolvedAvailability), disabled: true };
  }
  if (isDirty && errors.length > 0) {
    return { state: "idle", label: "Rename", disabled: true };
  }
  if (isDirty && resolvedAvailability === "available") {
    return { state: "success", label: "Save", disabled: false };
  }
  if (isDirty) {
    return { state: "pending", label: "Checking…", disabled: true };
  }
  return { state: "idle", label: "Rename", disabled: true };
}

export function UsernameRenameSubmit(props: UsernameRenameSubmitProps) {
  const { state, label, disabled } = getUsernameRenameSubmitView(props);

  return (
    <StatusSubmitButton
      state={state}
      label={label}
      disabled={disabled}
      type={disabled ? "button" : "submit"}
      size="sm"
      className="min-h-9 shrink-0 self-stretch rounded-lg"
    />
  );
}
