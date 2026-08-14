"use client";

import { XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as React from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

export type TagsInputProps = {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** Max tags kept after normalize. Default 50. */
  maxItems?: number;
  /** Max characters per tag. Default 120. */
  maxItemLength?: number;
  /** Shown under the control. Pass `null` to hide. */
  hint?: string | null;
  className?: string;
  inputClassName?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

function normalizeTags(items: string[], maxItems: number, maxItemLength: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const value = raw.trim().slice(0, maxItemLength);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= maxItems) break;
  }
  return out;
}

/**
 * Free-type multi-value input with chips rendered inside the field shell
 * (same visual language as ComboboxChips, without option selection).
 */
function TagsInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  maxItems = 50,
  maxItemLength = 120,
  hint,
  className,
  inputClassName,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid
}: TagsInputProps): React.ReactElement {
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const reduceMotion = Boolean(useReducedMotion());

  const commit = React.useCallback(
    (raw: string) => {
      const tokens = raw
        .split(/[,;\n]/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (tokens.length === 0) return;
      onChange(normalizeTags([...value, ...tokens], maxItems, maxItemLength));
      setDraft("");
    },
    [maxItemLength, maxItems, onChange, value]
  );

  const removeAt = React.useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [onChange, value]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      e.stopPropagation();
      commit(draft);
      return;
    }
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      e.preventDefault();
      removeAt(value.length - 1);
    }
  }

  const showHint = hint !== null;
  const hintText = hint === undefined ? `Press Enter or comma to add. Max ${maxItems}.` : hint;

  return (
    <div className="w-full min-w-0 space-y-1.5">
      <div
        role="group"
        data-slot="tags-input"
        aria-invalid={ariaInvalid}
        className={cn(
          "relative flex min-h-9 w-full min-w-0 flex-wrap gap-1 rounded-lg border border-input bg-background p-[calc(--spacing(1)-1px)] text-base shadow-xs/5 ring-ring/24 transition-shadow outline-none *:min-h-7 not-dark:bg-clip-padding before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] not-has-disabled:not-focus-within:not-aria-invalid:before:shadow-[0_1px_--theme(--color-black/4%)] focus-within:border-ring focus-within:ring-[3px] has-disabled:pointer-events-none has-disabled:opacity-64 has-aria-invalid:border-destructive/36 focus-within:has-aria-invalid:border-destructive/64 focus-within:has-aria-invalid:ring-destructive/16 has-[:disabled,:focus-within,[aria-invalid]]:shadow-none sm:min-h-8 sm:text-sm sm:*:min-h-6 dark:not-has-disabled:bg-input/32 dark:not-has-disabled:not-focus-within:not-aria-invalid:before:shadow-[0_-1px_--theme(--color-white/6%)] dark:has-aria-invalid:ring-destructive/24",
          "max-h-28 overflow-y-auto",
          className
        )}
        onClick={() => {
          if (!disabled) inputRef.current?.focus();
        }}
      >
        <AnimatePresence initial={false}>
          {value.map((tag, index) => (
            <motion.span
              key={tag}
              layout={!reduceMotion}
              data-slot="tags-input-chip"
              initial={reduceMotion ? false : { opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={
                reduceMotion
                  ? { opacity: 0, transition: { duration: 0 } }
                  : { opacity: 0, y: 12, filter: "blur(4px)" }
              }
              transition={
                reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.25 }
              }
              className="flex items-center rounded-[calc(var(--radius-md)-1px)] bg-accent ps-2 text-sm font-medium text-accent-foreground outline-none sm:text-xs/(--text-xs--line-height)"
            >
              <span className="max-w-56 truncate">{tag}</span>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${tag}`}
                className="h-full shrink-0 cursor-pointer px-1.5 opacity-80 hover:opacity-100 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 sm:[&_svg:not([class*='size-'])]:size-3.5"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(index);
                }}
              >
                <XIcon />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={draft}
          disabled={disabled}
          autoComplete="off"
          aria-label={ariaLabel}
          placeholder={value.length > 0 ? undefined : placeholder}
          className={cn(
            "min-w-12 flex-1 bg-transparent text-base outline-none sm:text-sm",
            value.length > 0 ? "ps-0.5" : "ps-2",
            inputClassName
          )}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (draft.trim()) commit(draft);
            onBlur?.();
          }}
        />
      </div>
      {showHint && hintText ? <p className="text-xs text-muted-foreground">{hintText}</p> : null}
    </div>
  );
}

export { TagsInput, normalizeTags };
