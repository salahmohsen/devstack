"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  CreateEducationInputSchema,
  UpdateEducationInputSchema,
  htmlToText,
  type EducationOutput
} from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import { ConfirmDialog } from "@tsu-stack/ui/components/confirm-dialog";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { cn } from "@tsu-stack/ui/lib/utils";

import { SubmitButton, useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { AiLoader } from "@/shared/ui/ai-loader";
import { SortableList } from "@/shared/ui/sortable-list";
import { useEntityFormDirty } from "@/shared/ui/use-entity-form-dirty";

import { EntityFormSheet } from "@/pages/dashboard/_lib/entity-form-panel";

import { SettingsSection } from "./settings-section";

type EducationFormValues = {
  school: string;
  degree: string;
  field: string;
  location: string;
  fromDate: string;
  toDate: string;
  isPresent: boolean;
  description: string;
  gpa: string;
};

const EMPTY_EDUCATION_FORM: EducationFormValues = {
  school: "",
  degree: "",
  field: "",
  location: "",
  fromDate: "",
  toDate: "",
  isPresent: false,
  description: "",
  gpa: ""
};

function toEducationFormValues(row: EducationOutput): EducationFormValues {
  return {
    school: row.school,
    degree: row.degree,
    field: row.field ?? "",
    location: row.location ?? "",
    fromDate: row.fromDate ?? "",
    toDate: row.toDate ?? "",
    isPresent: row.isPresent,
    description: row.description ?? "",
    gpa: row.gpa ?? ""
  };
}

function educationRange(row: EducationOutput): string | null {
  if (row.isPresent) return row.fromDate ? `${row.fromDate} — Present` : "Present";
  if (row.fromDate && row.toDate) return `${row.fromDate} — ${row.toDate}`;
  return row.fromDate ?? row.toDate;
}

function descriptionExcerpt(html: string | null): string | null {
  const text = htmlToText(html ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return text === "" ? null : text;
}

export function EducationSection() {
  const queryClient = useQueryClient();
  const listQuery = useQuery(orpcQueryClient.educations.list.queryOptions());
  const rows = listQuery.data ?? [];

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<EducationOutput | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EducationOutput | null>(null);
  const isEdit = editing != null;

  const invalidateList = async () => {
    await queryClient.invalidateQueries({ queryKey: orpcQueryClient.educations.list.key() });
  };

  const createMutation = useMutation(
    orpcQueryClient.educations.create.mutationOptions({
      onSuccess: async () => {
        await invalidateList();
        toast.success("Education added.");
        setSheetOpen(false);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to add education.");
      }
    })
  );

  const updateMutation = useMutation(
    orpcQueryClient.educations.update.mutationOptions({
      onSuccess: async () => {
        await invalidateList();
        toast.success("Education updated.");
        setSheetOpen(false);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to update education.");
      }
    })
  );

  const deleteMutation = useMutation(
    orpcQueryClient.educations.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateList();
        toast.success("Education deleted.");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to delete education.");
      }
    })
  );

  const reorderMutation = useMutation(
    orpcQueryClient.educations.reorder.mutationOptions({
      onMutate: async (input) => {
        const listKey = orpcQueryClient.educations.list.key();
        await queryClient.cancelQueries({ queryKey: listKey });
        const previous = queryClient.getQueryData<EducationOutput[]>(listKey);
        const nextSort = new Map(input.items.map((item) => [item.id, item.sortOrder]));
        queryClient.setQueryData<EducationOutput[]>(listKey, (old) => {
          if (!old) return old;
          return [...old]
            .map((row) => {
              const sortOrder = nextSort.get(row.id);
              return sortOrder === undefined ? row : { ...row, sortOrder };
            })
            .toSorted((a, b) => a.sortOrder - b.sortOrder);
        });
        return { previous };
      },
      onError: (_error, _input, context) => {
        if (context?.previous !== undefined) {
          queryClient.setQueryData(orpcQueryClient.educations.list.key(), context.previous);
        }
        toast.error("Failed to update order.");
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: orpcQueryClient.educations.list.key() });
      }
    })
  );

  const form = useAppForm({
    defaultValues: EMPTY_EDUCATION_FORM,
    validators: {
      onBlur: createZodFormValidator(
        isEdit ? UpdateEducationInputSchema : CreateEducationInputSchema
      )
    },
    onSubmit: ({ value }) => {
      const payload = {
        school: value.school.trim(),
        degree: value.degree.trim(),
        field: value.field.trim() || null,
        location: value.location.trim() || null,
        fromDate: value.fromDate.trim() || null,
        toDate: value.toDate.trim() || null,
        isPresent: value.isPresent,
        description: value.description.trim() || null,
        gpa: value.gpa.trim() || null
      };
      if (isEdit && editing) {
        updateMutation.mutate({ id: editing.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    }
  });

  // Reset-on-id: reseed the form whenever the sheet opens for a different row.
  useEffect(() => {
    if (!sheetOpen) return;
    form.reset(editing ? toEducationFormValues(editing) : EMPTY_EDUCATION_FORM);
  }, [sheetOpen, editing, form]);

  const dirty = useEntityFormDirty(form, sheetOpen);
  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <SettingsSection
        title="Education"
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
          >
            <Plus aria-hidden="true" />
            Add education
          </Button>
        }
      >
        {listQuery.isLoading ? (
          <AiLoader />
        ) : listQuery.isError ? (
          <Alert variant="error">
            <AlertTitle>Could not load education</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>
                {listQuery.error instanceof Error
                  ? listQuery.error.message
                  : "Something went wrong. Try again."}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void listQuery.refetch()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add education to include it on generated resumes.
          </p>
        ) : (
          <SortableList
            items={rows}
            sortable
            containerClassName="grid grid-cols-1 gap-2"
            onReorder={(next) => {
              reorderMutation.mutate({
                items: next.map((row, index) => {
                  return { id: row.id, sortOrder: index };
                })
              });
            }}
          >
            {(item, dragHandleProps) => {
              const excerpt = descriptionExcerpt(item.description);
              return (
                <Group aria-label="Education entry" className="w-full min-w-0 items-stretch">
                  {dragHandleProps ? (
                    <>
                      <button
                        type="button"
                        data-slot="input-control"
                        aria-label="Drag to reorder education"
                        className={cn(
                          "flex min-h-9 shrink-0 items-center justify-center self-stretch rounded-lg border border-input bg-transparent px-2",
                          dragHandleProps.className
                        )}
                        {...dragHandleProps.attributes}
                        {...dragHandleProps.listeners}
                      >
                        <GripVertical className="size-4" aria-hidden />
                      </button>
                      <GroupSeparator />
                    </>
                  ) : null}

                  <div
                    data-slot="input-control"
                    className="flex min-h-9 min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-lg border border-input px-3 py-1.5"
                  >
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.school} — {item.degree}
                      {item.field ? `, ${item.field}` : ""}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[educationRange(item), item.gpa ? `GPA ${item.gpa}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {excerpt ? (
                      <p className="truncate text-xs text-muted-foreground">{excerpt}</p>
                    ) : null}
                  </div>

                  <GroupSeparator />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit education entry — ${item.school}`}
                    className="min-h-9 shrink-0 self-stretch rounded-lg"
                    onClick={() => {
                      setEditing(item);
                      setSheetOpen(true);
                    }}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete education entry — ${item.school}`}
                    className="min-h-9 shrink-0 self-stretch rounded-lg text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </Group>
              );
            }}
          </SortableList>
        )}
      </SettingsSection>

      <EntityFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isDirty={dirty}
        title={isEdit ? "Edit Education" : "New Education"}
        description={
          isEdit
            ? "Update this entry — changes flow into generated resumes."
            : "Add education to your resume."
        }
        updatedAt={editing?.updatedAt}
        createdAt={editing?.createdAt}
        actions={
          <form.AppForm>
            <SubmitButton
              type="button"
              size="sm"
              actionLabel={isEdit ? "Save" : "Create"}
              isLoading={busy}
              submitFailed={createMutation.isError || updateMutation.isError}
              resetKey={`${sheetOpen}:${editing?.id ?? "new"}`}
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
            <form.AppField name="school">
              {(field) => <field.InputField label="School" placeholder="e.g. Cairo University" />}
            </form.AppField>

            <form.AppField name="degree">
              {(field) => (
                <field.InputField label="Degree" placeholder="e.g. Bachelor of Science" />
              )}
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

              <form.AppField name="toDate">
                {(field) => <field.InputField label="To" placeholder="e.g. 2023" />}
              </form.AppField>
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
        </Form>
      </EntityFormSheet>

      <ConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete this education entry?"
        description={
          deleteTarget
            ? `${deleteTarget.school} — ${deleteTarget.degree} will be removed from your profile and future generated resumes.`
            : "This entry will be removed from your profile and future generated resumes."
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        confirmLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id });
        }}
      />
    </>
  );
}
