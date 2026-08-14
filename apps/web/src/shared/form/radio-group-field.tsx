"use client";

import { Field, FieldError, FieldItem, FieldLabel } from "@tsu-stack/ui/components/field";
import { Radio, RadioGroup } from "@tsu-stack/ui/components/radio-group";
import { cn } from "@tsu-stack/ui/lib/utils";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type RadioGroupOption = {
  value: string;
  label: string;
  description?: string;
};

type RadioGroupFieldProps = {
  label?: string;
  description?: string;
  options: RadioGroupOption[];
  orientation?: "horizontal" | "vertical";
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    group?: string;
    item?: string;
  };
};

/**
 * Single-choice radios bound to a string form field (coss RadioGroup + Field).
 */
function RadioGroupField(props: RadioGroupFieldProps) {
  const field = useFieldContext<string>();
  const horizontal = props.orientation === "horizontal";

  return (
    <Field className={cn("gap-2", props.classNames?.field)}>
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        classNames={{
          label: props.classNames?.label,
          description: props.classNames?.description
        }}
      />
      <RadioGroup
        value={field.state.value}
        onValueChange={(value) => {
          if (typeof value === "string") field.handleChange(value);
        }}
        onBlur={field.handleBlur}
        className={cn(horizontal && "flex-row flex-wrap gap-4", props.classNames?.group)}
      >
        {props.options.map((option) => (
          <FieldItem key={option.value} className={props.classNames?.item}>
            <FieldLabel className="flex items-start gap-2 font-normal">
              <Radio value={option.value} />
              <span className="flex flex-col gap-0.5">
                <span>{option.label}</span>
                {option.description ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </FieldLabel>
          </FieldItem>
        ))}
      </RadioGroup>
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { RadioGroupField };
export type { RadioGroupOption };
