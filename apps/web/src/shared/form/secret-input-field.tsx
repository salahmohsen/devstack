"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { BADGE_ICON_VARIANTS } from "@tsu-stack/ui/components/badge-effects";
import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { SecretInput } from "@tsu-stack/ui/components/secret-input";
import { Toggle } from "@tsu-stack/ui/components/toggle";
import { cn } from "@tsu-stack/ui/lib/utils";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type SecretInputFieldProps = {
  label?: string;
  placeholder?: string;
  description?: string;
  /** Server has an encrypted secret on file. */
  hasSavedSecret?: boolean;
  /** Last 4 characters for partial display. */
  savedLast4?: string | null;
  autoComplete?: string;
  disabled?: boolean;
  /** Show the in-input remove Group when a secret is on file. */
  allowClear?: boolean;
  /** Sibling form flag: secret will be removed on save. */
  cleared?: boolean;
  onClearedChange?: (cleared: boolean) => void;
  clearAriaLabels?: {
    mark: string;
    unmark: string;
  };
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    input?: string;
  };
};

/**
 * TanStack Form field for write-only secrets (API keys, webhook secrets).
 * Prefer this over PasswordInputField when the server only exposes last4.
 */
function SecretInputField(props: SecretInputFieldProps) {
  const field = useFieldContext<string>();
  const clearing = Boolean(props.cleared);
  const showClear = Boolean(props.allowClear && props.hasSavedSecret && props.onClearedChange);

  return (
    <Field className={props.classNames?.field}>
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        htmlFor={field.name}
        classNames={{
          label: props.classNames?.label,
          description: props.classNames?.description
        }}
      />
      <SecretInput
        id={field.name}
        name={field.name}
        autoComplete={props.autoComplete}
        value={field.state.value ?? ""}
        onChange={(next) => {
          field.handleChange(next);
          if (clearing) props.onClearedChange?.(false);
        }}
        onBlur={field.handleBlur}
        hasSavedSecret={props.hasSavedSecret}
        savedLast4={props.savedLast4}
        placeholder={props.placeholder}
        disabled={props.disabled === true ? true : clearing}
        className={props.classNames?.input}
        endAddon={
          showClear ? (
            <SecretClearAddon
              marked={clearing}
              markLabel={props.clearAriaLabels?.mark ?? "Remove secret"}
              unmarkLabel={props.clearAriaLabels?.unmark ?? "Keep existing secret"}
              onToggle={() => {
                const next = !clearing;
                if (next) field.handleChange("");
                props.onClearedChange?.(next);
              }}
            />
          ) : null
        }
      />
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

function SecretClearAddon({
  marked,
  markLabel,
  unmarkLabel,
  onToggle
}: {
  marked: boolean;
  markLabel: string;
  unmarkLabel: string;
  onToggle: () => void;
}) {
  const reduceMotion = Boolean(useReducedMotion());
  const label = marked ? "Will remove on save" : markLabel;

  return (
    <Toggle
      size="sm"
      variant="outline"
      pressed={marked}
      aria-label={marked ? unmarkLabel : markLabel}
      className={cn(
        "h-6 min-w-0 px-2 text-xs sm:h-5.5",
        marked && "border-destructive/40 text-destructive-foreground data-pressed:bg-destructive/8"
      )}
      onPressedChange={() => {
        onToggle();
      }}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={label}
          variants={reduceMotion ? undefined : BADGE_ICON_VARIANTS}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          exit={reduceMotion ? undefined : "exit"}
          className="inline-flex"
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </Toggle>
  );
}

export { SecretInputField };
