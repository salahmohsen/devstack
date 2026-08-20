"use client";

import  { type ReactNode } from "react";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { RangeSlider } from "@/shared/ui/motion/range-slider";

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
  /** Extra content under the slider (usage meters, hints). */
  footer?: ReactNode;
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
    <Field className={cn("w-full max-w-lg min-w-0 gap-3", props.classNames?.field)}>
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
        <span className="text-sm font-medium text-foreground tabular-nums">{display}</span>
      </div>
      <RangeSlider
        id={field.name}
        aria-label={props.label ?? "Slider"}
        min={min}
        max={max}
        step={step}
        value={value}
        formatValueText={props.formatValue}
        onValueChange={(next) => {
          if (typeof next !== "number" || Number.isNaN(next)) return;
          field.handleChange(Math.min(max, Math.max(min, next)));
        }}
        onCommit={() => field.handleBlur()}
        className={props.classNames?.slider}
      />
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
      {props.footer ? <div className="w-full">{props.footer}</div> : null}
    </Field>
  );
}

export { SliderField };
