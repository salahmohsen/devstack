"use client";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText
} from "@tsu-stack/ui/components/input-group";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type UrlFieldKind = "hostname" | "url";

type UrlFieldProps = {
  label?: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  /**
   * `hostname` stores the host only (custom domain).
   * `url` stores a full `https://…` value; the scheme is shown as the start addon.
   */
  kind?: UrlFieldKind;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    input?: string;
    inputGroup?: string;
  };
};

function stripScheme(value: string): string {
  return value.trim().replace(/^https?:\/\//i, "");
}

function toHostname(value: string): string {
  const withoutScheme = stripScheme(value);
  const host = withoutScheme.split("/")[0] ?? "";
  return host.replace(/:\d+$/, "").replace(/\.$/, "");
}

/**
 * Coss URL prefix (`p-input-group-3` / `p-input-10`): `https://` start addon,
 * addon after the input in DOM (`align="inline-start"`).
 */
function UrlField(props: UrlFieldProps) {
  const field = useFieldContext<string>();
  const kind = props.kind ?? "url";
  const raw = field.state.value ?? "";
  const display = stripScheme(raw);
  const placeholder =
    props.placeholder ?? (kind === "hostname" ? "portfolio.example.com" : "example.com");

  return (
    <Field className={props.classNames?.field}>
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        htmlFor={field.name}
        classNames={{
          label: props.classNames?.label,
          description: props.classNames?.description
        }}
      />
      <InputGroup className={props.classNames?.inputGroup}>
        <InputGroupInput
          id={field.name}
          name={field.name}
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={props.disabled}
          value={display}
          placeholder={placeholder}
          className={props.classNames?.input}
          onBlur={field.handleBlur}
          onChange={(event) => {
            const next = event.target.value;
            if (kind === "hostname") {
              field.handleChange(toHostname(next));
              return;
            }
            const hostAndPath = stripScheme(next);
            field.handleChange(hostAndPath.length === 0 ? "" : `https://${hostAndPath}`);
          }}
        />
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { UrlField };
export type { UrlFieldKind };
