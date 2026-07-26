"use client";

import { useEffect } from "react";

import { type ResumeImportStackDraft } from "@tsu-stack/core";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { useAppForm } from "@/shared/form";

const STACK_TYPE_ITEMS = [
  { value: "framework", label: "Framework" },
  { value: "language", label: "Language" },
  { value: "database", label: "Database" },
  { value: "ui", label: "UI" },
  { value: "auth", label: "Auth" },
  { value: "deployment", label: "Deployment" },
  { value: "testing", label: "Testing" },
  { value: "ai", label: "AI" },
  { value: "tooling", label: "Tooling" },
  { value: "storage", label: "Storage" },
  { value: "state management", label: "State Management" },
  { value: "other", label: "Other" }
] as const;

export type DraftStackFieldsProps = {
  value: ResumeImportStackDraft;
  /** Stable identity for re-seeding (name can change while editing). */
  rowKey: string;
  onChange: (patch: Partial<ResumeImportStackDraft>) => void;
};

/**
 * Same field controls as {@link StackForm} for name / type / description.
 * Omits icon, npm deps, and project links (not in resume-import draft).
 */
export function DraftStackFields({ value, rowKey, onChange }: DraftStackFieldsProps) {
  const form = useAppForm({
    defaultValues: {
      name: value.name,
      description: value.description ?? "",
      type: value.type ?? ""
    },
    listeners: {
      onChange: ({ formApi }) => {
        const v = formApi.state.values;
        onChange({
          name: v.name,
          description: v.description || null,
          type: v.type || null
        });
      }
    }
  });

  useEffect(() => {
    form.reset({
      name: value.name,
      description: value.description ?? "",
      type: value.type ?? ""
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowKey]);

  return (
    <FieldGroup className="gap-4">
      <form.AppField name="name">
        {(field) => <field.InputField label="Name" placeholder="e.g. React" />}
      </form.AppField>

      <form.AppField name="type">
        {(field) => (
          <field.DropdownField
            label="Type"
            description="Categorize this stack."
            placeholder="Select type..."
            items={[...STACK_TYPE_ITEMS]}
          />
        )}
      </form.AppField>

      <form.AppField name="description">
        {(field) => (
          <field.RichTextField label="Description" placeholder="Brief description of the stack" />
        )}
      </form.AppField>
    </FieldGroup>
  );
}
