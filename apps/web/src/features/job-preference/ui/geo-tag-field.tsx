"use client";

import { useQuery } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { FieldLabelWithTooltip } from "@/shared/form/field-label-with-tooltip";
import { useFieldContext } from "@/shared/form/form-contexts";

const SEARCH_DEBOUNCE_MS = 250;
const MAX_ITEMS = 50;
const MAX_ITEM_LENGTH = 120;
const SUGGESTION_LIMIT = 8;

const SHELL_CLASS =
  "relative flex min-h-9 w-full min-w-0 flex-wrap gap-1 rounded-lg border border-input bg-background p-[calc(--spacing(1)-1px)] text-base shadow-xs/5 ring-ring/24 transition-shadow outline-none *:min-h-7 not-dark:bg-clip-padding before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] not-has-disabled:not-focus-within:not-aria-invalid:before:shadow-[0_1px_--theme(--color-black/4%)] focus-within:border-ring focus-within:ring-[3px] has-disabled:pointer-events-none has-disabled:opacity-64 has-aria-invalid:border-destructive/36 focus-within:has-aria-invalid:border-destructive/64 focus-within:has-aria-invalid:ring-destructive/16 has-[:disabled,:focus-within,[aria-invalid]]:shadow-none sm:min-h-8 sm:text-sm sm:*:min-h-6 dark:not-has-disabled:bg-input/32 dark:not-has-disabled:not-focus-within:not-aria-invalid:before:shadow-[0_-1px_--theme(--color-white/6%)] dark:has-aria-invalid:ring-destructive/24 max-h-28 overflow-y-auto";

const CHIP_CLASS =
  "flex items-center rounded-[calc(var(--radius-md)-1px)] bg-accent ps-2 text-sm font-medium text-accent-foreground outline-none sm:text-xs/(--text-xs--line-height)";

type GeoTagFieldProps = {
  label?: string;
  description?: string;
  placeholder?: string;
  /** "country" picks add the suggestion's ISO country code; manual entry must be a 2-letter code. */
  kind: "country" | "city";
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
  };
};

type CityOption = { value: string; country: string };

function isValidCountryCode(raw: string): boolean {
  return /^[a-z]{2}$/i.test(raw.trim());
}

/** Tokens to add from free-typed text (Enter / comma). Invalid country codes are dropped. */
function draftTokens(draft: string, kind: "country" | "city"): string[] {
  const tokens = draft
    .split(/[,;\n]/)
    .map((token) => token.trim().slice(0, MAX_ITEM_LENGTH))
    .filter(Boolean);
  if (kind === "country") {
    return tokens.filter(isValidCountryCode).map((token) => token.toUpperCase());
  }
  return tokens;
}

function optionToken(option: CityOption, kind: "country" | "city"): string {
  return kind === "country" ? option.country.toUpperCase() : option.value;
}

function GeoTagField(props: GeoTagFieldProps) {
  const field = useFieldContext<string[]>();
  const values = field.state.value;
  const [draft, setDraft] = useState("");
  const [debounced, setDebounced] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(draft.trim().slice(0, 60));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const citiesQuery = useQuery({
    ...orpcQueryClient.jobDiscovery.searchCities.queryOptions({ input: { q: debounced } }),
    enabled: debounced.length > 0,
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous
  });

  const options = useMemo(() => {
    const selected = new Set(values.map((value) => value.toLowerCase()));
    const seen = new Set<string>();
    const out: CityOption[] = [];
    for (const option of citiesQuery.data?.options ?? []) {
      const token = optionToken(option, props.kind);
      if (selected.has(token.toLowerCase())) continue;
      const key = `${option.value}\u0000${option.country.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(option);
      if (out.length >= SUGGESTION_LIMIT) break;
    }
    return out;
  }, [citiesQuery.data?.options, props.kind, values]);

  const open = focused && draft.trim().length > 0;
  const clampedHighlight =
    options.length === 0 ? -1 : Math.min(Math.max(highlight, 0), options.length - 1);

  useEffect(() => {
    setHighlight(-1);
  }, [debounced, citiesQuery.data]);

  const addTokens = useCallback(
    (tokens: string[]) => {
      if (tokens.length === 0) return;
      const seen = new Set(values.map((value) => value.toLowerCase()));
      const next = [...values];
      for (const token of tokens) {
        const key = token.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(token);
        if (next.length >= MAX_ITEMS) break;
      }
      field.handleChange(next);
    },
    [field, values]
  );

  const removeAt = useCallback(
    (index: number) => {
      field.handleChange(values.filter((_, i) => i !== index));
    },
    [field, values]
  );

  const pick = useCallback(
    (option: CityOption) => {
      addTokens([optionToken(option, props.kind)]);
      setDraft("");
    },
    [addTokens, props.kind]
  );

  const commitDraft = useCallback(() => {
    addTokens(draftTokens(draft, props.kind));
    setDraft("");
  }, [addTokens, draft, props.kind]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!open || options.length === 0) return;
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setHighlight((current) => {
        const base = current < 0 ? (delta === 1 ? -1 : 0) : current;
        return Math.min(Math.max(base + delta, 0), options.length - 1);
      });
      return;
    }
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      event.stopPropagation();
      if (open && clampedHighlight >= 0 && options[clampedHighlight]) {
        pick(options[clampedHighlight]!);
        return;
      }
      commitDraft();
      return;
    }
    if (event.key === "Escape") {
      setHighlight(-1);
      inputRef.current?.blur();
      return;
    }
    if (event.key === "Backspace" && draft === "" && values.length > 0) {
      event.preventDefault();
      removeAt(values.length - 1);
    }
  }

  const hint =
    props.kind === "country"
      ? "Search a city to add its country, or type a 2-letter code like DE."
      : "Press Enter or comma to add. Max 50.";

  return (
    <Field className={cn("w-full min-w-0 self-stretch", props.classNames?.field)}>
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        htmlFor={field.name}
        classNames={{
          label: props.classNames?.label,
          description: props.classNames?.description
        }}
      />
      <div className="relative">
        <div data-slot="geo-tag-field" className={SHELL_CLASS}>
          {values.map((value, index) => (
            <span className={CHIP_CLASS} key={`${value}-${index}`}>
              <span className="max-w-56 truncate">{value}</span>
              <button
                type="button"
                aria-label={`Remove ${value}`}
                className="h-full shrink-0 cursor-pointer px-1.5 opacity-80 hover:opacity-100 [&_svg:not([class*='size-'])]:size-4 sm:[&_svg:not([class*='size-'])]:size-3.5"
                onClick={(event) => {
                  event.stopPropagation();
                  removeAt(index);
                }}
              >
                <XIcon aria-hidden="true" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            id={field.name}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={
              open && clampedHighlight >= 0 ? `${listId}-${clampedHighlight}` : undefined
            }
            aria-autocomplete="list"
            aria-label={props.label ?? props.placeholder ?? "Locations"}
            autoComplete="off"
            placeholder={values.length > 0 ? undefined : props.placeholder}
            className={cn(
              "min-w-12 flex-1 bg-transparent text-base outline-none sm:text-sm",
              values.length > 0 ? "ps-0.5" : "ps-2"
            )}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              if (draft.trim()) commitDraft();
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
        {open ? (
          <div
            id={listId}
            role="listbox"
            aria-label={props.label}
            className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-sm shadow-md"
          >
            {options.length === 0 ? (
              <div
                className="px-2 py-1.5 text-muted-foreground"
                role="option"
                aria-selected={false}
              >
                {citiesQuery.isFetching ? "Searching…" : "No matches. Type to add anyway."}
              </div>
            ) : (
              options.map((option, index) => (
                <div
                  id={`${listId}-${index}`}
                  key={`${option.value}-${option.country}`}
                  role="option"
                  aria-selected={index === clampedHighlight}
                  className={cn(
                    "flex cursor-pointer items-baseline justify-between gap-2 rounded-md px-2 py-1.5",
                    index === clampedHighlight && "bg-accent text-accent-foreground"
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(option)}
                >
                  <span className="min-w-0 truncate">{option.value}</span>
                  <span className="shrink-0 text-xs text-muted-foreground uppercase">
                    {option.country}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { GeoTagField };
