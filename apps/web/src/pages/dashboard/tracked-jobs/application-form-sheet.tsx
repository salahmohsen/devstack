"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  APPLICATION_OUTCOME_LABELS,
  CreateApplicationInputSchema,
  UpdateApplicationInputSchema,
  applicationSourceOptions,
  employmentTypeOptions,
  hiringUrgencyOptions,
  type ApplicationOutcome,
  type ApplicationOutput,
  type ApplicationSource,
  type EmploymentType
} from "@tsu-stack/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Button } from "@tsu-stack/ui/components/button";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@tsu-stack/ui/components/menu";

import { SubmitButton, useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { useEntityFormDirty } from "@/shared/ui/use-entity-form-dirty";

import {
  useCreateApplicationMutation,
  useDeleteApplicationsMutation,
  useSetOutcomeMutation,
  useUpdateApplicationMutation
} from "@/features/applications";

import { EntityFormSheet } from "@/pages/dashboard/_lib/entity-form-panel";

type ApplicationFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: ApplicationOutput | null;
};

type FormValues = {
  companyName: string;
  title: string;
  url: string;
  source: ApplicationSource | "";
  location: string;
  salaryRange: string;
  employmentType: EmploymentType;
  description: string;
  notes: string;
  hiringUrgency: "unknown" | "immediate" | "soon" | "flexible";
  resumeId: string;
  recruiterEmail: string;
};

const emptyValues: FormValues = {
  companyName: "",
  title: "",
  url: "",
  source: "",
  location: "",
  salaryRange: "",
  employmentType: "unknown",
  description: "",
  notes: "",
  hiringUrgency: "unknown",
  resumeId: "",
  recruiterEmail: ""
};

function toFormValues(item: ApplicationOutput): FormValues {
  return {
    companyName: item.companyName,
    title: item.title,
    url: item.url ?? "",
    source: item.source ?? "",
    location: item.location ?? "",
    salaryRange: item.salaryRange ?? "",
    employmentType: item.employmentType,
    description: item.description ?? "",
    notes: item.notes ?? "",
    hiringUrgency: item.hiringUrgency,
    resumeId: item.resumeId ?? "",
    recruiterEmail: item.recruiterEmail ?? ""
  };
}

export function ApplicationFormSheet({
  open,
  onOpenChange,
  mode,
  initialData
}: ApplicationFormSheetProps) {
  const isEdit = mode === "edit";
  const id = initialData?.id;
  /** Remount / reset when create vs this application id changes. */
  const formKey = isEdit && id ? id : "new";
  const [deleteOpen, setDeleteOpen] = useState(false);

  const resumesQuery = useQuery(orpcQueryClient.resume.list.queryOptions());
  const createMutation = useCreateApplicationMutation();
  const updateMutation = useUpdateApplicationMutation();
  const setOutcomeMutation = useSetOutcomeMutation();
  const deleteMutation = useDeleteApplicationsMutation();

  const form = useAppForm({
    defaultValues: isEdit && initialData ? toFormValues(initialData) : emptyValues,
    validators: {
      onBlur: createZodFormValidator(
        isEdit ? UpdateApplicationInputSchema : CreateApplicationInputSchema
      )
    },
    onSubmit: ({ value }) => {
      const payload = {
        companyName: value.companyName,
        title: value.title,
        url: value.url || null,
        source: value.source === "" ? null : value.source,
        location: value.location || null,
        salaryRange: value.salaryRange || null,
        employmentType: value.employmentType,
        description: value.description || null,
        notes: value.notes || null,
        hiringUrgency: value.hiringUrgency,
        resumeId: value.resumeId ? value.resumeId : null,
        ...(isEdit
          ? { recruiterEmail: value.recruiterEmail.trim() ? value.recruiterEmail.trim() : null }
          : {})
      };
      if (isEdit && id) {
        updateMutation.mutate({ id, data: payload }, { onSuccess: () => onOpenChange(false) });
      } else {
        createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
      }
    }
  });

  // Reset when the sheet opens or the edited application changes (not every list refetch).
  useEffect(() => {
    if (!open) return;
    form.reset(isEdit && initialData ? toFormValues(initialData) : emptyValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- formKey drives intentional resets
  }, [open, formKey, form]);

  const isDirty = useEntityFormDirty(form, open);

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    setOutcomeMutation.isPending ||
    deleteMutation.isPending;

  const resumeOptions = resumesQuery.data ?? [];

  return (
    <>
      <EntityFormSheet
        open={open}
        onOpenChange={onOpenChange}
        isDirty={isDirty}
        title={isEdit ? "Edit application" : "Add application"}
        description={
          isEdit
            ? "Update details or close this application with an outcome."
            : "Track a job and link a resume from your library."
        }
        updatedAt={initialData?.updatedAt}
        createdAt={initialData?.createdAt}
        actions={
          <form.AppForm>
            <SubmitButton
              type="button"
              size="sm"
              actionLabel={isEdit ? "Save" : "Add to pipeline"}
              isLoading={busy}
              submitFailed={createMutation.isError || updateMutation.isError}
              resetKey={`${open}:${id ?? "new"}`}
              onClick={() => void form.handleSubmit()}
            />
          </form.AppForm>
        }
      >
        <Form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <FieldGroup className="gap-4">
            <form.AppField name="companyName">
              {(field) => <field.InputField label="Company *" placeholder="Acme Corp" />}
            </form.AppField>
            <form.AppField name="title">
              {(field) => <field.InputField label="Role / title *" placeholder="Senior Engineer" />}
            </form.AppField>
            <form.AppField name="url">
              {(field) => (
                <field.UrlField label="Job posting URL" placeholder="jobs.example.com/…" />
              )}
            </form.AppField>
            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField name="source">
                {(field) => (
                  <field.DropdownField
                    label="Source"
                    placeholder="How you found this role"
                    items={[
                      { value: "", label: "Not set" },
                      ...applicationSourceOptions().map((o) => {
                        return {
                          value: o.value,
                          label: o.label
                        };
                      })
                    ]}
                  />
                )}
              </form.AppField>
              <form.AppField name="location">
                {(field) => (
                  <field.InputField label="Location" placeholder="Remote, Hybrid, city…" />
                )}
              </form.AppField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField name="salaryRange">
                {(field) => <field.InputField label="Salary range" placeholder="e.g. $150–180k" />}
              </form.AppField>
              <form.AppField name="employmentType">
                {(field) => (
                  <field.DropdownField
                    label="Employment type"
                    items={employmentTypeOptions().map((o) => {
                      return {
                        value: o.value,
                        label: o.label
                      };
                    })}
                  />
                )}
              </form.AppField>
            </div>
            <form.AppField name="hiringUrgency">
              {(field) => (
                <field.DropdownField
                  label="Hiring urgency"
                  items={hiringUrgencyOptions().map((o) => {
                    return {
                      value: o.value,
                      label: o.label
                    };
                  })}
                />
              )}
            </form.AppField>
            <form.AppField name="resumeId">
              {(field) => (
                <field.DropdownField
                  label="Resume"
                  items={[
                    { value: "", label: "No resume linked" },
                    ...resumeOptions.map((r) => {
                      return {
                        value: r.id,
                        label: r.default ? `${r.filename} (default)` : r.filename
                      };
                    })
                  ]}
                />
              )}
            </form.AppField>
            {isEdit ? (
              <form.AppField name="recruiterEmail">
                {(field) => (
                  <field.InputField
                    label="Recruiter email"
                    type="email"
                    placeholder="recruiter@company.com"
                  />
                )}
              </form.AppField>
            ) : null}
            <form.AppField name="description">
              {(field) => (
                <field.MarkdownField
                  label="Job description"
                  placeholder="Paste the posting — powers future match scoring."
                />
              )}
            </form.AppField>
            <form.AppField name="notes">
              {(field) => (
                <field.MarkdownField
                  label="Notes"
                  placeholder="Referred by…, things to emphasize…"
                />
              )}
            </form.AppField>
            {isEdit && id ? (
              <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                <Menu>
                  <MenuTrigger render={<Button type="button" variant="outline" disabled={busy} />}>
                    Close as…
                  </MenuTrigger>
                  <MenuPopup align="start">
                    {(Object.keys(APPLICATION_OUTCOME_LABELS) as ApplicationOutcome[]).map(
                      (outcome) => (
                        <MenuItem
                          key={outcome}
                          onClick={() =>
                            setOutcomeMutation.mutate(
                              { id, outcome },
                              { onSuccess: () => onOpenChange(false) }
                            )
                          }
                        >
                          {APPLICATION_OUTCOME_LABELS[outcome]}
                        </MenuItem>
                      )
                    )}
                  </MenuPopup>
                </Menu>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete
                </Button>
              </div>
            ) : null}
          </FieldGroup>
        </Form>
      </EntityFormSheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete application?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the application. Closed outcomes keep history without
              deleting — only use delete for mistakes or test data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (!id) return;
                deleteMutation.mutate(
                  { ids: [id] },
                  {
                    onSuccess: () => {
                      setDeleteOpen(false);
                      onOpenChange(false);
                    }
                  }
                );
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
