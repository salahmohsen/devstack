"use client";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type SelectableCardOption = {
  value: string;
  title: string;
  description?: string;
};

type SelectableCardsFieldProps = {
  label?: string;
  description?: string;
  options: SelectableCardOption[];
  onValueChange?: (value: string) => void;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    grid?: string;
    card?: string;
  };
};

/**
 * Single-select cards (personality, plan, similar settings choices).
 */
function SelectableCardsField(props: SelectableCardsFieldProps) {
  const field = useFieldContext<string>();
  const selected = field.state.value;

  return (
    <Field className={cn("w-full", props.classNames?.field)}>
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        classNames={{
          label: props.classNames?.label,
          description: props.classNames?.description
        }}
      />
      <div className={cn("grid gap-2 sm:grid-cols-2", props.classNames?.grid)}>
        {props.options.map((option) => {
          const active = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                field.handleChange(option.value);
                props.onValueChange?.(option.value);
              }}
              onBlur={field.handleBlur}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-start transition-colors",
                active ? "border-primary/50 bg-primary/5" : "border-border/80 hover:bg-muted/40",
                props.classNames?.card
              )}
            >
              <p className="text-sm font-medium">{option.title}</p>
              {option.description ? (
                <p className="text-xs text-muted-foreground">{option.description}</p>
              ) : null}
            </button>
          );
        })}
      </div>
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { SelectableCardsField };
export type { SelectableCardOption };
