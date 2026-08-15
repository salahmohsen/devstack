"use client";

import { CheckIcon } from "lucide-react";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { ToggleGroup, ToggleGroupItem } from "@tsu-stack/ui/components/toggle-group";
import { cn } from "@tsu-stack/ui/lib/utils";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type ToggleGroupOption = {
  value: string;
  label: string;
};

type ToggleGroupFieldProps = {
  label?: string;
  description?: string;
  options: ToggleGroupOption[];
  /** When false, selecting a value replaces the previous selection. Default true. */
  multiple?: boolean;
  variant?: "default" | "outline";
  /** Render a check next to the label when that option is selected. */
  showSelectedCheck?: boolean;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    group?: string;
  };
};

/**
 * Toggle group bound to a `string[]` form field.
 * With `multiple={false}`, at most one value is kept.
 */
function ToggleGroupField(props: ToggleGroupFieldProps) {
  const multiple = props.multiple ?? true;
  const field = useFieldContext<string[]>();
  const selected = field.state.value ?? [];
  const selectedSet = new Set(selected);

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
      <ToggleGroup
        multiple={multiple}
        variant={props.variant ?? "outline"}
        value={selected}
        onValueChange={(next) => {
          const modes = (Array.isArray(next) ? next : [next]).filter(
            (v): v is string => typeof v === "string" && v.length > 0
          );
          if (multiple) {
            field.handleChange(modes);
            return;
          }
          field.handleChange(modes.slice(0, 1));
        }}
        className={cn("flex flex-wrap", props.classNames?.group)}
      >
        {props.options.map((option) => {
          const isSelected = selectedSet.has(option.value);
          return (
            <ToggleGroupItem key={option.value} value={option.value}>
              {props.showSelectedCheck && isSelected ? <CheckIcon aria-hidden="true" /> : null}
              {option.label}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { ToggleGroupField };
export type { ToggleGroupOption };
