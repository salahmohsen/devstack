"use client";

import { InfoIcon } from "lucide-react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import { Tooltip, TooltipContent, TooltipTrigger } from "@tsu-stack/ui/components/tooltip.js";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useFieldContext } from "./form-contexts";

type CheckboxFieldProps = {
  label?: string;
  description?: string;
  className?: string;
};

function CheckboxField(props: CheckboxFieldProps) {
  const field = useFieldContext<boolean>();

  return (
    <Field className={cn("flex-row items-center gap-2", props.className)}>
      <input
        id={field.name}
        name={field.name}
        type="checkbox"
        checked={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.checked)}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded border border-input bg-input/30 text-primary transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          props.className
        )}
      />
      {props.label ? <FieldLabel htmlFor={field.name}>{props.label}</FieldLabel> : null}
      {props.description ? (
        <Tooltip>
          <TooltipTrigger>
            <InfoIcon size={16} className="text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            <FieldDescription>{props.description}</FieldDescription>
          </TooltipContent>
        </Tooltip>
      ) : null}
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

export { CheckboxField };
