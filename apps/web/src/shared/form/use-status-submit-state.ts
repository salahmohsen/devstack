"use client";

import { useEffect, useRef, useState } from "react";

import { type StatusSubmitVisual } from "@tsu-stack/ui/components/status-submit-button";

export const STATUS_SUBMIT_SAVED_HOLD_MS = 800;

export type StatusSubmitMode = "persist" | "ephemeral";

type UseStatusSubmitStateInput = {
  mode: StatusSubmitMode;
  actionLabel: string;
  isDirty: boolean;
  isSubmitting: boolean;
  canSubmit?: boolean;
  /** Change this when field values change so Failed clears after an edit. */
  valuesKey?: unknown;
  /** Reset session Saved when a sheet remounts / reopens. */
  resetKey?: unknown;
  /**
   * When set, overrides inferring Failed from “still dirty after submit”.
   * Pass mutation.isError from sheets that stay dirty until they close.
   */
  submitFailed?: boolean;
};

export type StatusSubmitDerived = {
  state: StatusSubmitVisual;
  label: string;
  mounted: boolean;
  disabled: boolean;
  type: "button" | "submit";
};

export function useStatusSubmitState(input: UseStatusSubmitStateInput): StatusSubmitDerived {
  const canSubmit = input.canSubmit ?? true;
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [failed, setFailed] = useState(false);
  const [holdSaved, setHoldSaved] = useState(false);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    setFailed(false);
  }, [input.valuesKey]);

  useEffect(() => {
    setHasSavedSession(false);
    setFailed(false);
    setHoldSaved(false);
    wasSubmitting.current = false;
  }, [input.resetKey]);

  useEffect(() => {
    if (input.isSubmitting) {
      setFailed(false);
      wasSubmitting.current = true;
      return;
    }
    if (!wasSubmitting.current) return;
    wasSubmitting.current = false;
    const inferFail = input.submitFailed === undefined && input.isDirty;
    if (input.submitFailed === true || inferFail) {
      setFailed(true);
      return;
    }
    setHasSavedSession(true);
    if (input.mode === "ephemeral") {
      setHoldSaved(true);
    }
  }, [input.isSubmitting, input.isDirty, input.mode, input.submitFailed]);

  useEffect(() => {
    if (!holdSaved) return;
    const timer = window.setTimeout(() => setHoldSaved(false), STATUS_SUBMIT_SAVED_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [holdSaved]);

  let state: StatusSubmitVisual;
  let label: string;
  if (input.isSubmitting) {
    state = "pending";
    label = "Submitted";
  } else if (failed) {
    state = "failed";
    label = "Failed";
  } else if (input.isDirty) {
    state = "warning";
    label = "Save";
  } else if (input.mode === "persist" && hasSavedSession) {
    state = "success";
    label = "Saved";
  } else if (input.mode === "ephemeral" && holdSaved) {
    state = "success";
    label = "Saved";
  } else {
    state = "idle";
    label = input.actionLabel;
  }

  const mounted =
    input.mode === "persist" || input.isDirty || input.isSubmitting || failed || holdSaved;

  const disabled =
    state === "pending" ||
    state === "success" ||
    ((state === "warning" || state === "idle") && !canSubmit);

  return {
    state,
    label,
    mounted,
    disabled,
    type: disabled ? "button" : "submit"
  };
}
