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
  className?: string;
};

function SwitchField(props: SwitchFieldProps) {
  const field = useFieldContext<boolean>();

  return (
    <Field orientation="horizontal">
      <Switch
        id={field.name}
        name={field.name}
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked)}
        onBlur={field.handleBlur}
        className={props.className}
      />
      {(props.label ?? props.description) && (
        <FieldContent>
          {props.label ? (
            <FieldLabel htmlFor={field.name}>
              <FieldTitle>{props.label}</FieldTitle>
            </FieldLabel>
          ) : null}
          {props.description ? <FieldDescription>{props.description}</FieldDescription> : null}
        </FieldContent>
      )}
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

export { SwitchField };
