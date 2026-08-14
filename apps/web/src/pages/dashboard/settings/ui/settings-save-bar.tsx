"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Button } from "@tsu-stack/ui/components/button";
import { StatusSubmitButton } from "@tsu-stack/ui/components/status-submit-button";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useStatusSubmitState } from "@/shared/form/use-status-submit-state";

type SettingsSaveBarProps = {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saveLabel?: string;
  canSubmit?: boolean;
  /** Change when field values change so Failed clears after an edit. */
  statusKey?: unknown;
  /** Header sits in SettingsFrame actions; bar is the old sticky footer. */
  placement?: "header" | "bar";
  className?: string;
};

/**
 * Sticky dirty-state bar. Ephemeral: animates in on dirty, holds Saved 800ms, then leaves.
 */
export function SettingsSaveBar({
  dirty,
  saving = false,
  onSave,
  onDiscard,
  saveLabel = "Save",
  canSubmit,
  statusKey,
  placement = "header",
  className
}: SettingsSaveBarProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const derived = useStatusSubmitState({
    mode: "ephemeral",
    actionLabel: saveLabel,
    isDirty: dirty,
    isSubmitting: saving,
    canSubmit,
    valuesKey: statusKey
  });

  const isHeader = placement === "header";

  return (
    <AnimatePresence>
      {derived.mounted ? (
        <motion.output
          key="settings-save-bar"
          className={cn(
            "flex flex-wrap items-center justify-end gap-2",
            !isHeader &&
              "sticky bottom-0 z-10 -mx-1 mt-4 border-t border-border/80 bg-card/95 px-1 py-3 backdrop-blur supports-backdrop-filter:bg-card/80 md:-mx-2 md:px-2",
            className
          )}
          aria-live="polite"
          initial={reduceMotion ? false : { opacity: 0, y: isHeader ? -4 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: isHeader ? -4 : 8 }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }
          }
        >
          <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onDiscard}>
            Discard
          </Button>
          <StatusSubmitButton
            state={derived.state}
            label={derived.label}
            disabled={derived.disabled}
            type="button"
            size="sm"
            onClick={onSave}
          />
        </motion.output>
      ) : null}
    </AnimatePresence>
  );
}
