"use client";

import { Field, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import { Slider } from "@tsu-stack/ui/components/slider";
import { cn } from "@tsu-stack/ui/lib/utils";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type SliderFieldProps = {
  label?: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Formats the live value shown next to the label. Default: raw number. */
  formatValue?: (value: number) => string;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    slider?: string;
  };
};

function SliderField(props: SliderFieldProps) {
  const field = useFieldContext<number>();
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const step = props.step ?? 1;
  const value = typeof field.state.value === "number" ? field.state.value : min;
  const display = props.formatValue ? props.formatValue(value) : String(value);

  return (
    <Field className={cn("w-full max-w-lg min-w-0 space-y-3", props.classNames?.field)}>
      <div className="flex items-center justify-between gap-3">
        <FieldLabelWithTooltip
          label={props.label}
          description={props.description}
          htmlFor={field.name}
          classNames={{
            label: props.classNames?.label,
            description: props.classNames?.description
          }}
        />
        {props.label ? (
          <span className="text-sm font-medium text-foreground tabular-nums">{display}</span>
        ) : (
          <FieldLabel htmlFor={field.name} className="sr-only">
            {display}
          </FieldLabel>
        )}
      </div>
      <Slider
        id={field.name}
        aria-label={props.label ?? "Slider"}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) => {
          const raw = Array.isArray(next) ? next[0] : next;
          if (typeof raw !== "number" || Number.isNaN(raw)) return;
          field.handleChange(Math.min(max, Math.max(min, Math.round(raw))));
        }}
        onValueCommitted={() => field.handleBlur()}
        className={props.classNames?.slider}
      />
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { SliderField };
