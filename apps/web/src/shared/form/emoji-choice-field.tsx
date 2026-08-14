"use client";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type EmojiChoiceOption = {
  value: string;
  label: string;
  emoji: string;
};

type EmojiChoiceFieldProps = {
  label?: string;
  description?: string;
  options: EmojiChoiceOption[];
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    group?: string;
  };
};

/**
 * Single-select emoji / glyph chips (hub avatars and similar).
 */
function EmojiChoiceField(props: EmojiChoiceFieldProps) {
  const field = useFieldContext<string>();
  const selected = field.state.value;

  return (
    <Field className={props.classNames?.field}>
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        classNames={{
          label: props.classNames?.label,
          description: props.classNames?.description
        }}
      />
      <div className={cn("flex flex-wrap gap-2", props.classNames?.group)}>
        {props.options.map((option) => {
          const active = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              title={option.label}
              onClick={() => field.handleChange(option.value)}
              onBlur={field.handleBlur}
              className={cn(
                "flex size-11 items-center justify-center rounded-lg border text-lg transition-colors",
                active ? "border-primary/50 bg-primary/5" : "border-border/80 hover:bg-muted/40"
              )}
            >
              <span aria-hidden>{option.emoji}</span>
              <span className="sr-only">{option.label}</span>
            </button>
          );
        })}
      </div>
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { EmojiChoiceField };
export type { EmojiChoiceOption };
