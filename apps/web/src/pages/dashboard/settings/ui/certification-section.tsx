"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  CreateCertificationInputSchema,
  UpdateCertificationInputSchema,
  htmlToText,
  type CertificationOutput
} from "@tsu-stack/core";
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

type CertificationFormValues = {
  name: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  credentialUrl: string;
  description: string;
};

const EMPTY_CERTIFICATION_FORM: CertificationFormValues = {
  name: "",
  issuer: "",
  issuedAt: "",
  expiresAt: "",
  credentialUrl: "",
  description: ""
};

function toCertificationFormValues(row: CertificationOutput): CertificationFormValues {
  return {
    name: row.name,
    issuer: row.issuer,
    issuedAt: row.issuedAt ?? "",
    expiresAt: row.expiresAt ?? "",
    credentialUrl: row.credentialUrl ?? "",
    description: row.description ?? ""
  };
}

function certificationRange(row: CertificationOutput): string | null {
  const parts = [row.issuedAt, row.expiresAt ? `Expires ${row.expiresAt}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function descriptionExcerpt(html: string | null): string | null {
  const text = htmlToText(html ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return text === "" ? null : text;
}

export function CertificationSection() {
  const queryClient = useQueryClient();
  const listQuery = useQuery(orpcQueryClient.certifications.list.queryOptions());
  const rows = listQuery.data ?? [];

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CertificationOutput | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CertificationOutput | null>(null);
  const isEdit = editing != null;

  const invalidateList = async () => {
    await queryClient.invalidateQueries({ queryKey: orpcQueryClient.certifications.list.key() });
  };

  const createMutation = useMutation(
    orpcQueryClient.certifications.create.mutationOptions({
      onSuccess: async () => {
        await invalidateList();
        toast.success("Certification added.");
        setSheetOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add certification.");
      }
    })
  );

  const updateMutation = useMutation(
    orpcQueryClient.certifications.update.mutationOptions({
      onSuccess: async () => {
        await invalidateList();
        toast.success("Certification updated.");
        setSheetOpen(false);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to update certification.");
      }
    })
  );

  const deleteMutation = useMutation(
    orpcQueryClient.certifications.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateList();
        toast.success("Certification deleted.");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to delete certification.");
      }
    })
  );

  const reorderMutation = useMutation(
    orpcQueryClient.certifications.reorder.mutationOptions({
      onMutate: async (input) => {
        const listKey = orpcQueryClient.certifications.list.key();
        await queryClient.cancelQueries({ queryKey: listKey });
        const previous = queryClient.getQueryData<CertificationOutput[]>(listKey);
        const nextSort = new Map(input.items.map((item) => [item.id, item.sortOrder]));
        queryClient.setQueryData<CertificationOutput[]>(listKey, (old) => {
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
          queryClient.setQueryData(orpcQueryClient.certifications.list.key(), context.previous);
        }
        toast.error("Failed to update order.");
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: orpcQueryClient.certifications.list.key() });
      }
    })
  );

  const form = useAppForm({
    defaultValues: EMPTY_CERTIFICATION_FORM,
    validators: {
      onBlur: createZodFormValidator(
        isEdit ? UpdateCertificationInputSchema : CreateCertificationInputSchema
      )
    },
    onSubmit: ({ value }) => {
      const payload = {
        name: value.name.trim(),
        issuer: value.issuer.trim(),
        issuedAt: value.issuedAt.trim() || null,
        expiresAt: value.expiresAt.trim() || null,
        credentialUrl: value.credentialUrl.trim() || null,
        description: value.description.trim() || null
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
    form.reset(editing ? toCertificationFormValues(editing) : EMPTY_CERTIFICATION_FORM);
  }, [sheetOpen, editing, form]);

  const dirty = useEntityFormDirty(form, sheetOpen);
  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <SettingsSection
        title="Certifications"
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
            Add certification
          </Button>
        }
      >
        {listQuery.isLoading ? (
          <AiLoader />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add certifications to include them on generated resumes.
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
            {(item, dragHandleProps) => (
              <Group aria-label="Certification entry" className="w-full min-w-0 items-stretch">
                {dragHandleProps ? (
                  <>
                    <button
                      type="button"
                      data-slot="input-control"
                      aria-label="Drag to reorder certifications"
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
                  <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                    <span className="truncate">{`${item.name} — ${item.issuer}`}</span>
                    {item.credentialUrl ? (
                      <a
                        href={item.credentialUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open credential for ${item.name}`}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    ) : null}
                  </p>
                  {certificationRange(item) ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {certificationRange(item)}
                    </p>
                  ) : null}
                  {descriptionExcerpt(item.description) ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {descriptionExcerpt(item.description)}
                    </p>
                  ) : null}
                </div>

                <GroupSeparator />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Edit certification ${item.name}`}
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
                  aria-label={`Delete certification ${item.name}`}
                  className="min-h-9 shrink-0 self-stretch rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(item)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </Group>
            )}
          </SortableList>
        )}
      </SettingsSection>

      <EntityFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isDirty={dirty}
        title={isEdit ? "Edit Certification" : "New Certification"}
        description={
          isEdit
            ? "Update this entry — changes flow into generated resumes."
            : "Add a certification to your resume."
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
            <form.AppField name="name">
              {(field) => (
                <field.InputField
                  label="Name"
                  placeholder="e.g. AWS Certified Solutions Architect - Associate"
                />
              )}
            </form.AppField>

            <form.AppField name="issuer">
              {(field) => (
                <field.InputField label="Issuer" placeholder="e.g. Amazon Web Services" />
              )}
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
        </Form>
      </EntityFormSheet>

      <ConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete this certification?"
        description={
          deleteTarget
            ? `${deleteTarget.name} — ${deleteTarget.issuer} will be removed from your profile and future generated resumes.`
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
