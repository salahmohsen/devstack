"use client";

import { useState } from "react";

import { type UsernameAvailabilityStatus } from "@tsu-stack/core";
import {
  StatusSubmitButton,
  type StatusSubmitVisual
} from "@tsu-stack/ui/components/status-submit-button";

type UsernameRenameSubmitProps = {
  currentUsername: string;
  username: string;
  isValidating: boolean;
  isSubmitting: boolean;
  errors: unknown[];
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

export function UsernameRenameSubmit({
  currentUsername,
  username,
  isValidating,
  isSubmitting,
  errors
}: UsernameRenameSubmitProps) {
  const normalized = username.trim().toLowerCase();
  const isDirty = Boolean(currentUsername) && normalized !== currentUsername;
  const [snapshot, setSnapshot] = useState({
    currentUsername,
    isValidating,
    settledValue: currentUsername
  });

  if (currentUsername !== snapshot.currentUsername) {
    setSnapshot({ currentUsername, isValidating, settledValue: currentUsername });
  } else if (isValidating !== snapshot.isValidating) {
    setSnapshot({
      currentUsername,
      isValidating,
      settledValue: isValidating ? snapshot.settledValue : normalized
    });
  }

  const availability = availabilityStatusFromErrors(errors);
  const isPendingCheck = isDirty && (isValidating || snapshot.settledValue !== normalized);

  let state: StatusSubmitVisual = "idle";
  let label = "Rename";
  let disabled = true;

  if (isSubmitting) {
    state = "pending";
    label = "Saving…";
  } else if (isPendingCheck) {
    state = "pending";
    label = "Checking…";
  } else if (isDirty && (availability === "taken" || availability === "reserved")) {
    state = "unavailable";
    label = unavailableLabel(availability);
  } else if (isDirty && errors.length === 0) {
    state = "success";
    label = "Save";
    disabled = false;
  }

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
