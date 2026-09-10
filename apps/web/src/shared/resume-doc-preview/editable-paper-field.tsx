import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

/**
 * Click-to-edit text on the resume paper (grill Q2 lock).
 *
 * - Rest: identical typography to the surrounding paper (no affordance).
 * - Hover: brand-green tint + dashed underline + ✎ cue.
 * - Editing: a real input/textarea, same font/size/weight, focus ring.
 * - Commit on blur or ⌘/Ctrl+Enter, Esc cancels, Tab commits (moves on).
 *
 * Inline by default so a field inside a composed line ("Title, Company")
 * keeps the line's natural flow — the paper must match the PDF at rest.
 */
type EditablePaperFieldProps = {
  value: string;
  onCommit: (value: string) => void;
  /** Auto-growing textarea (block level) for summary paragraphs. */
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel: string;
  /** Commit an emptied field instead of restoring (Q6: empty bullet = delete). */
  allowEmpty?: boolean;
  /**
   * Busy lock (send window): rest-state clicks don't enter edit mode and an
   * in-flight edit is cancelled (reverted to value) — no edits can land into
   * a draft the send closure no longer sees. Undefined keeps the interactive
   * behavior identical for existing consumers.
   */
  disabled?: boolean;
};

export function EditablePaperField({
  value,
  onCommit,
  multiline = false,
  placeholder,
  className,
  ariaLabel,
  allowEmpty = false,
  disabled = false
}: EditablePaperFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const reactId = useId();

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Auto-grow the multiline editor to its content (never a fixed one-liner).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (editing && multiline && el) {
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editing, multiline, draft]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next === value.trim()) {
      setDraft(value);
      return;
    }
    if (!next && !allowEmpty) {
      setDraft(value);
      return;
    }
    onCommit(next);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  const beginEdit = () => {
    if (disabled) return;
    setDraft(value);
    setEditing(true);
  };

  // Disabled mid-edit (busy lock flipped on during a send): cancel — revert
  // to value, never commit into a frozen draft.
  useEffect(() => {
    if (disabled && editing) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect -- cancel-on-disable is deliberate
      setEditing(false);
      setDraft(value);
    }
  }, [disabled, editing, value]);

  if (editing) {
    const shared = {
      value: draft,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(event.target.value),
      onBlur: commit,
      placeholder,
      "aria-label": ariaLabel,
      id: reactId
    };
    return multiline ? (
      <textarea
        {...shared}
        ref={inputRef as React.Ref<HTMLTextAreaElement>}
        rows={1}
        className={cn(
          "-mx-0.5 block w-full resize-none overflow-hidden rounded-sm bg-transparent px-0.5 py-0 outline-none",
          "border-b border-dashed border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/40",
          "font-[inherit] leading-[inherit] text-inherit",
          className
        )}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            commit();
          }
          // plain Enter stays a newline; Tab naturally commits via blur
        }}
      />
    ) : (
      <input
        {...shared}
        ref={inputRef as React.Ref<HTMLInputElement>}
        type="text"
        style={{ width: `${Math.max(draft.length + 2, 8)}ch` }}
        className={cn(
          "-mx-0.5 inline-block rounded-sm bg-transparent px-0.5 py-0 align-baseline outline-none",
          "border-b border-dashed border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/40",
          "font-[inherit] leading-[inherit] text-inherit",
          className
        )}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          // Tab commits via blur and moves focus to the next field
        }}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`${ariaLabel} — click to edit`}
      aria-disabled={disabled ? true : undefined}
      data-disabled={disabled ? "" : undefined}
      onClick={beginEdit}
      className={cn(
        "group/field relative inline text-left font-[inherit] leading-[inherit] text-inherit",
        "-mx-0.5 rounded-sm px-0.5 transition-colors duration-100 outline-none",
        disabled
          ? "cursor-default"
          : "cursor-text hover:bg-brand/10 focus-visible:bg-brand/10 focus-visible:ring-2 focus-visible:ring-brand/40",
        className
      )}
    >
      <span
        className={cn(
          "border-b border-transparent",
          !disabled && "group-hover/field:border-dashed group-hover/field:border-brand/50"
        )}
      >
        {value || <span className="text-muted-foreground/50 italic">{placeholder}</span>}
      </span>
      {!disabled ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-1.5 -right-1 text-[0.7em] text-brand/0 transition-colors duration-100 select-none group-hover/field:text-brand/70"
        >
          ✎
        </span>
      ) : null}
    </button>
  );
}
