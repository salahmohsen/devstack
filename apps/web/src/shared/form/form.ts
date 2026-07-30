import { createFormHook } from "@tanstack/react-form";

import { CalendarField } from "@/shared/form/calendar-field";
import { IconPickerField } from "@/shared/form/icon-field";
import { IconifyField } from "@/shared/form/iconify-field";
import { ImageField } from "@/shared/form/image-field";
import { InputGroupField } from "@/shared/form/input-group-field";
import { NpmPackageField } from "@/shared/form/npm-package-field";
import { StackSelector } from "@/shared/form/stack-selector";
import { SwitchField } from "@/shared/form/switch-field";

import { CheckboxField } from "./checkbox-field";
import { ComboboxField } from "./combobox-field";
import { ComboboxMultipleField } from "./combobox-multiple-field";
import { DropdownField } from "./dropdown-field";
import { fieldContext, formContext } from "./form-contexts";
import { InputField } from "./input-field";
import { MarkdownField } from "./markdown-field";
import { NumberFieldForm } from "./number-field";
import { PasswordInputField } from "./password-input-field";
import { RichTextField } from "./rich-text-field";
import { SecretInputField } from "./secret-input-field";
import { SubmitButton } from "./submit-button";
import { YearField } from "./year-field";

export const { useAppForm, withForm, withFieldGroup, extendForm, useTypedAppFormContext } =
  createFormHook({
    fieldComponents: {
      CheckboxField,
      ComboboxField,
      ComboboxMultipleField,
      CalendarField,
      DropdownField,
      InputField,
      MarkdownField,
      NpmPackageField,
      NumberFieldForm,
      PasswordInputField,
      SecretInputField,
      RichTextField,
      YearField,
      InputGroupField,
      StackSelector,
      SwitchField,
      ImageField,
      IconPickerField,
      IconifyField
    },
    fieldContext,
    formComponents: {
      SubmitButton
    },
    formContext
  });
