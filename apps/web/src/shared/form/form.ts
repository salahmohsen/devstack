import { createFormHook } from "@tanstack/react-form";

import { AvatarUploadField } from "@/shared/form/avatar-upload-field";
import { CalendarField } from "@/shared/form/calendar-field";
import { IconPickerField } from "@/shared/form/icon-field";
import { IconifyField } from "@/shared/form/iconify-field";
import { InputGroupField } from "@/shared/form/input-group-field";
import { NpmPackageField } from "@/shared/form/npm-package-field";
import { StackSelector } from "@/shared/form/stack-selector";
import { SwitchField } from "@/shared/form/switch-field";

import { CheckboxField } from "./checkbox-field";
import { ComboboxField } from "./combobox-field";
import { ComboboxMultipleField } from "./combobox-multiple-field";
import { DropdownField } from "./dropdown-field";
import { EmojiChoiceField } from "./emoji-choice-field";
import { fieldContext, formContext } from "./form-contexts";
import { IconChoiceField } from "./icon-choice-field";
import { InputField } from "./input-field";
import { MarkdownField } from "./markdown-field";
import { NotificationChannelsField } from "./notification-channels-field";
import { NumberFieldForm } from "./number-field";
import { PasswordInputField } from "./password-input-field";
import { RadioGroupField } from "./radio-group-field";
import { RichTextField } from "./rich-text-field";
import { SecretInputField } from "./secret-input-field";
import { SelectableCardsField } from "./selectable-cards-field";
import { SliderField } from "./slider-field";
import { SubmitButton } from "./submit-button";
import { TagsField } from "./tags-field";
import { ToggleGroupField } from "./toggle-group-field";
import { UrlField } from "./url-field";
import { UsernameField } from "./username-field";
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
      RadioGroupField,
      SecretInputField,
      SelectableCardsField,
      EmojiChoiceField,
      IconChoiceField,
      NotificationChannelsField,
      RichTextField,
      SliderField,
      TagsField,
      ToggleGroupField,
      YearField,
      InputGroupField,
      StackSelector,
      SwitchField,
      AvatarUploadField,
      IconPickerField,
      IconifyField,
      UrlField,
      UsernameField
    },
    fieldContext,
    formComponents: {
      SubmitButton
    },
    formContext
  });
