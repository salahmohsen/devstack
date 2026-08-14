"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  sanitizeSvg,
  StackCreateInputSchema,
  StackUpdateInputSchema,
  type StackOutput
} from "@tsu-stack/core";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";

import { SubmitButton, useAppForm } from "@/shared/form";
import { invalidateProjectsListQueries } from "@/shared/lib/invalidate-projects-list";
import { invalidateStacksListQueries } from "@/shared/lib/invalidate-stacks-list";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { DefaultLoader } from "@/shared/ui/default-loader";
import { Icon } from "@/shared/ui/icon";
import { useEntityFormDirty } from "@/shared/ui/use-entity-form-dirty";

import { getPortfolioListQueryKey } from "@/features/portfolio";

import { EntityFormSheet } from "@/pages/dashboard/_lib/entity-form-panel";

type StackFormProps = {
  initialData?: StackOutput | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StackForm({ initialData, open, onOpenChange }: StackFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!initialData;
  const id = initialData?.id;

  const stackQuery = useQuery({
    ...orpcQueryClient.stacks.get.queryOptions({
      input: { id: id! }
    }),
    enabled: isEdit && open,
    placeholderData: initialData ?? undefined
  });

  const projectsQuery = useQuery({
    ...orpcQueryClient.projects.list.queryOptions({}),
    enabled: open
  });

  const createMutation = useMutation(
    orpcQueryClient.stacks.create.mutationOptions({
      onSuccess: async () => {
        await invalidateStacksListQueries(queryClient);
        await invalidateProjectsListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
        });
        toast.success("Stack created.");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create stack.");
      }
    })
  );

  const updateMutation = useMutation(
    orpcQueryClient.stacks.update.mutationOptions({
      onSuccess: async () => {
        await invalidateStacksListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.stacks.get.queryKey({
            input: { id: id! }
          })
        });
        await invalidateProjectsListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
        });
        toast.success("Stack updated.");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update stack.");
      }
    })
  );

  const stack = stackQuery.data;

  const form = useAppForm({
    defaultValues: {
      name: stack?.name ?? "",
      description: stack?.description ?? "",
      icon: stack?.icon ?? "",
      type: stack?.type ?? "",
      includedInPortfolio: !!stack?.portfolioEntryId,
      isFeatured: !!stack?.isFeatured,
      dependencies: (stack?.dependencies ?? []).map((d) => {
        return {
          npmPackage: d.npmPackage,
          description: d.description ?? null,
          homepage: d.homepage ?? null
        };
      }),
      projectIds: (stack?.projects ?? []).map((p) => p.id)
    },
    validators: {
      onBlur: createZodFormValidator(isEdit ? StackUpdateInputSchema : StackCreateInputSchema)
    },
    onSubmit: ({ value }) => {
      if (isEdit && id) {
        updateMutation.mutate({
          id,
          data: {
            name: value.name,
            description: value.description || null,
            icon: value.icon ? sanitizeSvg(value.icon) : null,
            type: value.type || null,
            includedInPortfolio: value.includedInPortfolio,
            isFeatured: value.isFeatured,
            dependencies: value.dependencies,
            projectIds: value.projectIds
          }
        });
      } else {
        createMutation.mutate({
          name: value.name,
          description: value.description ?? null,
          icon: value.icon ? sanitizeSvg(value.icon) : null,
          type: value.type || null,
          includedInPortfolio: value.includedInPortfolio,
          isFeatured: value.isFeatured,
          dependencies: value.dependencies,
          projectIds: value.projectIds
        });
      }
    }
  });

  const busy = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    if (stack) {
      form.reset({
        name: stack.name,
        description: stack.description ?? "",
        icon: stack.icon ?? "",
        type: stack.type ?? "",
        includedInPortfolio: !!stack.portfolioEntryId,
        isFeatured: !!stack.isFeatured,
        dependencies: stack.dependencies.map((d) => {
          return {
            npmPackage: d.npmPackage,
            description: d.description ?? null,
            homepage: d.homepage ?? null
          };
        }),
        projectIds: stack.projects.map((p) => p.id)
      });
    } else if (!isEdit) {
      form.reset({
        name: "",
        description: "",
        icon: "",
        type: "",
        includedInPortfolio: false,
        isFeatured: false,
        dependencies: [],
        projectIds: []
      });
    }
  }, [open, stack, isEdit, form]);

  const isDirty = useEntityFormDirty(form, open);

  const body =
    isEdit && stackQuery.isLoading && !stack ? (
      <DefaultLoader />
    ) : isEdit && !stackQuery.isLoading && !stack ? (
      <div className="py-8 text-center text-muted-foreground">Stack not found.</div>
    ) : (
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
            {(field) => <field.InputField label="Name" placeholder="e.g. React" />}
          </form.AppField>

          <form.AppField name="icon">
            {(field) => (
              <field.IconifyField
                label="Stack Icon"
                description="Search for an icon from Iconify."
              />
            )}
          </form.AppField>

          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label="Description"
                placeholder="Brief description of the stack"
              />
            )}
          </form.AppField>

          <form.AppField name="type">
            {(field) => (
              <field.DropdownField
                label="Type"
                description="Categorize this stack."
                placeholder="Select type..."
                items={[
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
                ]}
              />
            )}
          </form.AppField>

          <form.AppField name="dependencies">
            {(field) => (
              <field.NpmPackageField
                label="Dependencies"
                description="Search and add npm packages used by this stack."
              />
            )}
          </form.AppField>

          <form.AppField name="projectIds">
            {(field) => (
              <field.ComboboxMultipleField
                label="Projects"
                description="Link projects that use this stack."
                placeholder="Search projects..."
                emptyMessage="No projects found."
                items={(projectsQuery.data ?? []).map((p) => {
                  return {
                    value: p.id,
                    label: p.title,
                    icon: p.logo ? <Icon icon={p.logo} className="size-4" /> : null
                  };
                })}
              />
            )}
          </form.AppField>

          <form.AppField name="includedInPortfolio">
            {(field) => (
              <field.SwitchField
                label="In portfolio"
                description="Include this stack in your public portfolio."
              />
            )}
          </form.AppField>

          <form.AppField name="isFeatured">
            {(field) => (
              <field.SwitchField
                label="Featured"
                description="Highlight this stack on your public profile (also adds it to the portfolio)."
              />
            )}
          </form.AppField>
        </FieldGroup>
      </Form>
    );

  return (
    <EntityFormSheet
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
      title={isEdit ? "Edit Stack" : "New Stack"}
      description={
        isEdit
          ? "Update the name or icon. Changes apply to every project using this stack."
          : "Add a shared tech stack that can be attached to any project."
      }
      updatedAt={initialData?.updatedAt}
      createdAt={initialData?.createdAt}
      actions={
        <form.AppForm>
          <SubmitButton
            type="button"
            size="sm"
            actionLabel={isEdit ? "Save" : "Create"}
            isLoading={busy}
            submitFailed={createMutation.isError || updateMutation.isError}
            resetKey={`${open}:${id ?? "new"}`}
            onClick={() => void form.handleSubmit()}
          />
        </form.AppForm>
      }
    >
      {body}
    </EntityFormSheet>
  );
}
