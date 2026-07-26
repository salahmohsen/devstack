"use client";

import { useEffect } from "react";

import { type ResumeImportProjectDraft } from "@tsu-stack/core";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { useAppForm } from "@/shared/form";

export type DraftProjectFieldsProps = {
  value: ResumeImportProjectDraft;
  onChange: (patch: Partial<ResumeImportProjectDraft>) => void;
  /** Draft experiences available to link as parent. */
  experienceOptions: Array<{ value: string; label: string }>;
  /** Stack name suggestions (usually other draft stacks). */
  stackNameOptions: string[];
};

/**
 * Same primary field controls as {@link ProjectForm} (title, year, summary,
 * description, experience, stacks), bound to an onboarding draft item.
 * Omits logo/repos/detect-stacks (not part of resume-import draft).
 */
export function DraftProjectFields({
  value,
  onChange,
  experienceOptions,
  stackNameOptions
}: DraftProjectFieldsProps) {
  const form = useAppForm({
    defaultValues: {
      title: value.title,
      year: value.year,
      summary: value.summary,
      description: value.description,
      experienceClientId: value.experienceClientId ?? "",
      stackNames: value.stackNames ?? [],
      isPresent: false
    },
    listeners: {
      onChange: ({ formApi }) => {
        const v = formApi.state.values;
        onChange({
          title: v.title,
          year: v.year,
          summary: v.summary,
          description: v.description,
          experienceClientId: v.experienceClientId || null,
          stackNames: v.stackNames
        });
      }
    }
  });

  useEffect(() => {
    form.reset({
      title: value.title,
      year: value.year,
      summary: value.summary,
      description: value.description,
      experienceClientId: value.experienceClientId ?? "",
      stackNames: value.stackNames ?? [],
      isPresent: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.clientId]);

  const stackItems = Array.from(
    new Set([...stackNameOptions, ...(value.stackNames ?? [])].filter(Boolean))
  ).map((name) => {
    return { label: name, value: name };
  });

  return (
    <FieldGroup className="gap-4">
      <form.AppField name="title">
        {(field) => <field.InputField label="Title" placeholder="e.g. My Awesome Project" />}
      </form.AppField>

      <form.AppField name="year">{(field) => <field.YearField label="Year" />}</form.AppField>

      {experienceOptions.length > 0 ? (
        <form.AppField name="experienceClientId">
          {(field) => (
            <field.DropdownField
              label="Associated Experience"
              description="Optional parent experience for this project."
              placeholder="None"
              items={[
                { value: "", label: "None" },
                ...experienceOptions.map((opt) => {
                  return { value: opt.value, label: opt.label };
                })
              ]}
            />
          )}
        </form.AppField>
      ) : null}

      <form.AppField name="summary">
        {(field) => (
          <field.RichTextField label="Summary" placeholder="Brief overview of the project" />
        )}
      </form.AppField>

      <form.AppField name="description">
        {(field) => (
          <field.RichTextField label="Description" placeholder="Brief description of the project" />
        )}
      </form.AppField>

      <form.AppField name="stackNames">
        {(field) => (
          <field.ComboboxMultipleField
            items={stackItems}
            label="Stacks"
            description="Link extracted stacks (names). You can also type new names."
            placeholder="Select stacks..."
            emptyMessage="No stacks in draft. Add stacks in the Stacks tab first."
          />
        )}
      </form.AppField>
    </FieldGroup>
  );
}
