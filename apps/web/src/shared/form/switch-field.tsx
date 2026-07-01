"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle
} from "@tsu-stack/ui/components/field";
import { Switch } from "@tsu-stack/ui/components/switch";

import { useFieldContext } from "./form-contexts";

type SwitchFieldProps = {
  label?: string;
  description?: string;
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

  return (
    <Field orientation="horizontal" className={props.classNames?.field}>
      <Switch
        id={field.name}
        name={field.name}
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked)}
        onBlur={field.handleBlur}
        className={props.classNames?.input}
      />
      {(props.label ?? props.description) && (
        <FieldContent className={props.classNames?.content}>
          {props.label ? (
            <FieldLabel htmlFor={field.name} className={props.classNames?.label}>
              <FieldTitle>{props.label}</FieldTitle>
            </FieldLabel>
          ) : null}
          {props.description ? (
            <FieldDescription className={props.classNames?.description}>
              {props.description}
            </FieldDescription>
          ) : null}
        </FieldContent>
      )}
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { SwitchField };
