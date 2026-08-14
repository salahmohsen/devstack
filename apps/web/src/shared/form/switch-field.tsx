"use client";

import { InfoIcon } from "lucide-react";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle
} from "@tsu-stack/ui/components/field";
import { Switch } from "@tsu-stack/ui/components/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@tsu-stack/ui/components/tooltip.js";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useFieldContext } from "./form-contexts";

type SwitchFieldProps = {
  label?: string;
  description?: string;
  disabled?: boolean;
  /** `card` is the settings row: title + copy on the left, switch on the right. */
  layout?: "row" | "card";
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    content?: string;
    input?: string;
  };
};

function SwitchField(props: SwitchFieldProps) {
  const field = useFieldContext<boolean>();
  const layout = props.layout ?? "row";

  if (layout === "card") {
    return (
      <Field className={cn("w-full", props.classNames?.field)}>
        <FieldLabel
          htmlFor={field.name}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-lg border border-border/80 px-3 py-2.5",
            props.disabled
              ? "cursor-default opacity-80"
              : "cursor-pointer hover:bg-accent/50 has-data-checked:border-primary/48 has-data-checked:bg-accent/50",
            props.classNames?.label
          )}
        >
          <span className="min-w-0">
            {props.label ? <FieldTitle>{props.label}</FieldTitle> : null}
            {props.description ? (
              <FieldDescription className={props.classNames?.description}>
                {props.description}
              </FieldDescription>
            ) : null}
          </span>
          <Switch
            id={field.name}
            name={field.name}
            checked={field.state.value}
            disabled={props.disabled}
            onCheckedChange={(checked) => field.handleChange(checked)}
            onBlur={field.handleBlur}
            className={props.classNames?.input}
          />
        </FieldLabel>
        <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
      </Field>
    );
  }

  return (
    <Field className={cn("flex-row items-center gap-3", props.classNames?.field)}>
      <Switch
        id={field.name}
        name={field.name}
        checked={field.state.value}
        disabled={props.disabled}
        onCheckedChange={(checked) => field.handleChange(checked)}
        onBlur={field.handleBlur}
        className={props.classNames?.input}
      />
      {(props.label ?? props.description) && (
        <FieldContent className={cn("flex-row items-center gap-1", props.classNames?.content)}>
          {props.label ? (
            <FieldLabel htmlFor={field.name} className={props.classNames?.label}>
              <FieldTitle>{props.label}</FieldTitle>
            </FieldLabel>
          ) : null}
          {props.description ? (
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon size={16} className="text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <FieldDescription className={props.classNames?.description}>
                  {props.description}
                </FieldDescription>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </FieldContent>
      )}
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { SwitchField };
