"use client";

import { useEffect } from "react";

import { type ResumeImportCertificationDraft } from "@tsu-stack/core";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { useAppForm } from "@/shared/form";

export type DraftCertificationFieldsProps = {
  value: ResumeImportCertificationDraft;
  onChange: (patch: Partial<ResumeImportCertificationDraft>) => void;
};

/**
 * Same field controls as the Certification sheet form in Settings, bound to an
 * onboarding draft item.
 */
export function DraftCertificationFields({ value, onChange }: DraftCertificationFieldsProps) {
  const form = useAppForm({
    defaultValues: {
      name: value.name,
      issuer: value.issuer,
      issuedAt: value.issuedAt ?? "",
      expiresAt: value.expiresAt ?? "",
      credentialUrl: value.credentialUrl ?? "",
      description: value.description ?? ""
    },
    listeners: {
      onChange: ({ formApi }) => {
        const v = formApi.state.values;
        onChange({
          name: v.name,
          issuer: v.issuer,
          issuedAt: v.issuedAt || null,
          expiresAt: v.expiresAt || null,
          credentialUrl: v.credentialUrl || null,
          description: v.description || null
        });
      }
    }
  });

  // Re-seed when switching to a different draft row (clientId).
  useEffect(() => {
    form.reset({
      name: value.name,
      issuer: value.issuer,
      issuedAt: value.issuedAt ?? "",
      expiresAt: value.expiresAt ?? "",
      credentialUrl: value.credentialUrl ?? "",
      description: value.description ?? ""
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when identity of the row changes
  }, [value.clientId]);

  return (
    <FieldGroup className="gap-4">
      <form.AppField name="name">
        {(field) => (
          <field.InputField
            label="Name"
            placeholder="e.g. AWS Certified Solutions Architect - Associate"
          />
        )}
      </form.AppField>

      <form.AppField name="issuer">
        {(field) => <field.InputField label="Issuer" placeholder="e.g. Amazon Web Services" />}
      </form.AppField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <form.AppField name="issuedAt">
          {(field) => <field.InputField label="Issued" placeholder="e.g. 2025 or 2025-03" />}
        </form.AppField>

        <form.AppField name="expiresAt">
          {(field) => (
            <field.InputField
              label="Expires"
              description="Leave blank if the credential does not expire."
              placeholder="e.g. 2028-03"
            />
          )}
        </form.AppField>
      </div>

      <form.AppField name="credentialUrl">
        {(field) => (
          <field.InputField
            label="Credential URL"
            description="Verification link — renders on the credential name."
            placeholder="https://credverify.example.com/abc"
          />
        )}
      </form.AppField>

      <form.AppField name="description">
        {(field) => (
          <field.RichTextField
            label="Description"
            placeholder="Skills validated, specialization…"
          />
        )}
      </form.AppField>
    </FieldGroup>
  );
}
