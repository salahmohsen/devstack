"use client";

import { useEffect } from "react";

import { type ResumeImportExperienceDraft } from "@tsu-stack/core";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { useAppForm } from "@/shared/form";

export type DraftExperienceFieldsProps = {
  value: ResumeImportExperienceDraft;
  onChange: (patch: Partial<ResumeImportExperienceDraft>) => void;
};

/**
 * Same field controls as {@link ExperienceForm}, bound to an onboarding draft item.
 */
export function DraftExperienceFields({ value, onChange }: DraftExperienceFieldsProps) {
  const form = useAppForm({
    defaultValues: {
      title: value.title,
      organization: value.organization,
      description: value.description,
      fromDate: value.fromDate ?? "",
      toDate: value.toDate ?? "",
      isPresent: value.isPresent ?? false
    },
    listeners: {
      onChange: ({ formApi }) => {
        const v = formApi.state.values;
        onChange({
          title: v.title,
          organization: v.organization,
          description: v.description,
          fromDate: v.fromDate || null,
          toDate: v.isPresent ? null : v.toDate || null,
          isPresent: v.isPresent
        });
      }
    }
  });

  // Re-seed when switching to a different draft row (clientId).
  useEffect(() => {
    form.reset({
      title: value.title,
      organization: value.organization,
      description: value.description,
      fromDate: value.fromDate ?? "",
      toDate: value.toDate ?? "",
      isPresent: value.isPresent ?? false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when identity of the row changes
  }, [value.clientId]);

  return (
    <FieldGroup className="gap-4">
      <form.AppField name="title">
        {(field) => <field.InputField label="Title" placeholder="e.g. Senior Software Engineer" />}
      </form.AppField>

      <form.AppField name="organization">
        {(field) => <field.InputField label="Organization" placeholder="e.g. Acme Corp" />}
      </form.AppField>

      <form.AppField name="description">
        {(field) => (
          <field.RichTextField label="Description" placeholder="Brief description of your role" />
        )}
      </form.AppField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <form.AppField name="fromDate">
          {(field) => <field.CalendarField label="From Date" />}
        </form.AppField>

        <form.Subscribe selector={(s) => s.values.isPresent}>
          {(isPresent) =>
            isPresent ? null : (
              <form.AppField name="toDate">
                {(field) => <field.CalendarField label="To Date" />}
              </form.AppField>
            )
          }
        </form.Subscribe>

        <form.AppField name="isPresent">
          {(field) => (
            <field.SwitchField
              label="Currently present"
              description="Mark this experience as your current role."
            />
          )}
        </form.AppField>
      </div>
    </FieldGroup>
  );
}
