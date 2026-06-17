import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import { RichTextEditor, type RichTextEditorProps } from "@tsu-stack/ui/components/rich-text-editor";

import { useFieldContext } from "./form-contexts";

type RichTextFieldProps = Omit<RichTextEditorProps, "value" | "onChange" | "onBlur"> & {
  label?: string;
  description?: string;
};

function RichTextField({ label, description, ...editorProps }: RichTextFieldProps) {
  const field = useFieldContext<string>();

  return (
    <Field>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <RichTextEditor
        value={field.state.value ?? ""}
        onChange={(html) => field.handleChange(html)}
        onBlur={field.handleBlur}
        {...editorProps}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

export { RichTextField };
