import { createFormHook } from "@tanstack/react-form";

import { InputGroupField } from "@/shared/form/input-group-field";

import { DatePickerField } from "./date-picker-field";
import { fieldContext, formContext } from "./form-contexts";
import { InputField } from "./input-field";
import { PasswordInputField } from "./password-input-field";
import { RichTextField } from "./rich-text-field";
import { SubmitButton } from "./submit-button";

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldComponents: {
    DatePickerField,
    InputField,
    PasswordInputField,
    RichTextField,
    InputGroupField
  },
  fieldContext,
  formComponents: {
    SubmitButton
  },
  formContext
});
