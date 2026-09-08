"use client";

import { useEffect } from "react";

import { type ResumeImportEducationDraft } from "@tsu-stack/core";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { useAppForm } from "@/shared/form";

export type DraftEducationFieldsProps = {
  value: ResumeImportEducationDraft;
  onChange: (patch: Partial<ResumeImportEducationDraft>) => void;
};

/**
 * Same field controls as the Education sheet form in Settings, bound to an
 * onboarding draft item.
 */
export function DraftEducationFields({ value, onChange }: DraftEducationFieldsProps) {
  const form = useAppForm({
    defaultValues: {
      school: value.school,
      degree: value.degree,
      field: value.field ?? "",
      location: value.location ?? "",
      fromDate: value.fromDate ?? "",
      toDate: value.toDate ?? "",
      isPresent: value.isPresent ?? false,
      description: value.description ?? "",
      gpa: value.gpa ?? ""
    },
    listeners: {
      onChange: ({ formApi }) => {
        const v = formApi.state.values;
        onChange({
          school: v.school,
          degree: v.degree,
          field: v.field || null,
          location: v.location || null,
          fromDate: v.fromDate || null,
          toDate: v.isPresent ? null : v.toDate || null,
          isPresent: v.isPresent,
          description: v.description || null,
          gpa: v.gpa || null
        });
      }
    }
  });

  // Re-seed when switching to a different draft row (clientId).
  useEffect(() => {
    form.reset({
      school: value.school,
      degree: value.degree,
      field: value.field ?? "",
      location: value.location ?? "",
      fromDate: value.fromDate ?? "",
      toDate: value.toDate ?? "",
      isPresent: value.isPresent ?? false,
      description: value.description ?? "",
      gpa: value.gpa ?? ""
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when identity of the row changes
  }, [value.clientId]);

  return (
    <FieldGroup className="gap-4">
      <form.AppField name="school">
        {(field) => <field.InputField label="School" placeholder="e.g. Cairo University" />}
      </form.AppField>

      <form.AppField name="degree">
        {(field) => <field.InputField label="Degree" placeholder="e.g. Bachelor of Science" />}
      </form.AppField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <form.AppField name="field">
          {(field) => (
            <field.InputField label="Field of study" placeholder="e.g. Computer Science" />
          )}
        </form.AppField>

        <form.AppField name="location">
          {(field) => <field.InputField label="Location" placeholder="e.g. Cairo, Egypt" />}
        </form.AppField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <form.AppField name="fromDate">
          {(field) => <field.InputField label="From" placeholder="e.g. 2019 or 2019-09" />}
        </form.AppField>

        <form.Subscribe selector={(s) => s.values.isPresent}>
          {(isPresent) =>
            isPresent ? null : (
              <form.AppField name="toDate">
                {(field) => <field.InputField label="To" placeholder="e.g. 2023" />}
              </form.AppField>
            )
          }
        </form.Subscribe>
      </div>

      <form.AppField name="isPresent">
        {(field) => (
          <field.SwitchField
            label="Currently enrolled"
            description="Shown as present on generated resumes."
          />
        )}
      </form.AppField>

      <form.AppField name="gpa">
        {(field) => <field.InputField label="GPA" placeholder="e.g. 3.8/4.0" />}
      </form.AppField>

      <form.AppField name="description">
        {(field) => (
          <field.RichTextField
            label="Description"
            placeholder="Honors, relevant coursework, thesis…"
          />
        )}
      </form.AppField>
    </FieldGroup>
  );
}
