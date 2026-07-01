import { createFormHook } from "@tanstack/react-form";

import { IconPickerField } from "@/shared/form/icon-field";
import { ImageField } from "@/shared/form/image-field";
import { InputGroupField } from "@/shared/form/input-group-field";
import { StackSelector } from "@/shared/form/stack-selector";
import { SwitchField } from "@/shared/form/switch-field";

import { CheckboxField } from "./checkbox-field";
import { ComboboxField } from "./combobox-field";
import { DatePickerField } from "./date-picker-field";
import { DropdownField } from "./dropdown-field";
import { fieldContext, formContext } from "./form-contexts";
import { InputField } from "./input-field";
import { PasswordInputField } from "./password-input-field";
import { RichTextField } from "./rich-text-field";
import { SubmitButton } from "./submit-button";

export const { useAppForm, withForm, withFieldGroup, extendForm, useTypedAppFormContext } =
  createFormHook({
    fieldComponents: {
      CheckboxField,
      ComboboxField,
      DatePickerField,
      DropdownField,
      InputField,
      PasswordInputField,
      RichTextField,
      InputGroupField,
      StackSelector,
      SwitchField,
      ImageField,
      IconPickerField
    },
    fieldContext,
    formComponents: {
      SubmitButton
    },
    formContext
  });
