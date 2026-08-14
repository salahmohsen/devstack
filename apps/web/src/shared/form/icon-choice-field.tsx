"use client";

import { type LucideIcon } from "lucide-react";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type IconChoiceOption = {
  value: string;
  label: string;
  icon: LucideIcon;
};

type IconChoiceFieldProps = {
  label?: string;
  description?: string;
  options: IconChoiceOption[];
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    group?: string;
  };
};

/**
 * Compact icon picker for a small, fixed set of Lucide icons.
 */
function IconChoiceField(props: IconChoiceFieldProps) {
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
      <div className={cn("flex flex-wrap gap-1.5", props.classNames?.group)}>
        {props.options.map((option) => {
          const Icon = option.icon;
          const active = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => field.handleChange(option.value)}
              onBlur={field.handleBlur}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg border transition-colors",
                active
                  ? "border-foreground bg-background shadow-xs"
                  : "border-border/80 text-muted-foreground hover:bg-background/60"
              )}
              aria-label={option.label}
              aria-pressed={active}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          );
        })}
      </div>
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { IconChoiceField };
export type { IconChoiceOption };
