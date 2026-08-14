"use client";

import * as React from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText
} from "@tsu-stack/ui/components/input-group";

import { cn } from "#@/lib/utils";

/** Dummy chars → native browser password dots (not text bullets). */
const SAVED_SECRET_MASK_CHARS = "xxxxxxxxxxxx";

export type SecretInputProps = {
  id?: string;
  /** Draft plaintext. Empty means “keep saved secret” when hasSavedSecret. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  /** Server has an encrypted secret on file. */
  hasSavedSecret?: boolean;
  /** Last 4 chars for partial display (full secret is never returned). */
  savedLast4?: string | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoComplete?: string;
  name?: string;
  "aria-label"?: string;
  /** Trailing control(s) inside the field chrome (e.g. remove). */
  endAddon?: React.ReactNode;
};

/**
 * Write-only secret control (API keys, webhook secrets).
 *
 * - Idle with a saved secret: native password dots + last4 immediately after.
 * - Focus / type: replace with a normal password draft (leave blank to keep).
 * - No reveal/copy of the stored secret (not available client-side).
 */
function SecretInput({
  id,
  value,
  onChange,
  onBlur,
  hasSavedSecret = false,
  savedLast4 = null,
  placeholder,
  disabled = false,
  className,
  autoComplete = "off",
  name,
  "aria-label": ariaLabel,
  endAddon
}: SecretInputProps) {
  const last4 = savedLast4?.trim() ?? null;
  // Local replace mode so an empty draft after focus doesn’t snap back to the mask.
  const [replacing, setReplacing] = React.useState(false);
  const locked = Boolean(disabled && !value && hasSavedSecret && last4);
  const showSavedMask = locked ? true : Boolean(!value && hasSavedSecret && last4 && !replacing);

  const beginReplace = React.useCallback(() => {
    setReplacing(true);
    requestAnimationFrame(() => {
      if (id) document.getElementById(id)?.focus();
    });
  }, [id]);

  if (showSavedMask) {
    if (endAddon) {
      return (
        <InputGroup className={cn("w-full min-w-0 self-stretch", className)}>
          <InputGroupInput
            id={id}
            name={name}
            type="password"
            autoComplete={autoComplete}
            spellCheck={false}
            readOnly
            tabIndex={locked ? -1 : 0}
            value={SAVED_SECRET_MASK_CHARS}
            aria-label={
              ariaLabel ??
              (locked
                ? `Secret on file, ends with ${last4}. Will remove on save.`
                : `Secret on file, ends with ${last4}. Focus to replace.`)
            }
            className="w-auto max-w-none min-w-0 shrink-0 font-mono"
            style={{ width: `${SAVED_SECRET_MASK_CHARS.length * 0.625}em` }}
            onFocus={locked ? undefined : beginReplace}
          />
          <InputGroupText aria-hidden className="font-mono text-sm text-foreground">
            {last4}
          </InputGroupText>
          <InputGroupAddon align="inline-end">{endAddon}</InputGroupAddon>
        </InputGroup>
      );
    }

    // label focuses the readonly input (no click handler on a static div).
    return (
      <label
        htmlFor={locked ? undefined : id}
        className={cn(
          "relative flex w-full items-center overflow-visible rounded-lg border border-input bg-background px-[calc(--spacing(3)-1px)] text-base shadow-xs/5 ring-ring/24 transition-shadow",
          locked ? "cursor-default" : "cursor-text",
          "h-8.5 sm:h-7.5 sm:text-sm",
          "not-dark:bg-clip-padding dark:bg-input/32",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)]",
          "before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
          "has-focus-within:border-ring has-focus-within:ring-[3px]",
          className
        )}
      >
        <input
          id={id}
          name={name}
          type="password"
          autoComplete={autoComplete}
          spellCheck={false}
          readOnly
          tabIndex={locked ? -1 : 0}
          value={SAVED_SECRET_MASK_CHARS}
          size={SAVED_SECRET_MASK_CHARS.length}
          aria-label={
            ariaLabel ??
            (locked
              ? `Secret on file, ends with ${last4}. Will remove on save.`
              : `Secret on file, ends with ${last4}. Focus to replace.`)
          }
          className="leading-inherit m-0 w-auto max-w-none min-w-0 shrink-0 border-0 bg-transparent p-0 font-mono text-sm text-foreground outline-none"
          style={{ width: `${SAVED_SECRET_MASK_CHARS.length * 0.625}em` }}
          onFocus={locked ? undefined : beginReplace}
        />
        <span aria-hidden className="shrink-0 font-mono text-sm text-foreground">
          {last4}
        </span>
      </label>
    );
  }

  return (
    <InputGroup className={cn("w-full min-w-0 self-stretch", className)}>
      <InputGroupInput
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        spellCheck={false}
        disabled={disabled}
        value={value}
        aria-label={ariaLabel}
        placeholder={placeholder ?? (hasSavedSecret ? "Leave blank to keep" : "Secret")}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          if (!value.trim()) setReplacing(false);
          onBlur?.(e);
        }}
      />
      {endAddon ? <InputGroupAddon align="inline-end">{endAddon}</InputGroupAddon> : null}
    </InputGroup>
  );
}

export { SecretInput };
