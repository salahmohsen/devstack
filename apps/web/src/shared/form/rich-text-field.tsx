import { Field, FieldError } from "@tsu-stack/ui/components/field";
import {
  RichTextEditor,
  type RichTextEditorProps
} from "@tsu-stack/ui/components/rich-text-editor";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type RichTextFieldProps = Omit<RichTextEditorProps, "value" | "onChange" | "onBlur"> & {
  label?: string;
  description?: string;
};

function RichTextField({ label, description, ...editorProps }: RichTextFieldProps) {
  const field = useFieldContext<string>();

  return (
    <Field>
      <FieldLabelWithTooltip label={label} description={description} />
      <RichTextEditor
        value={field.state.value ?? ""}
        onChange={(html) => field.handleChange(html)}
        onBlur={field.handleBlur}
        className="w-full"
        {...editorProps}
      />
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

export { RichTextField };
