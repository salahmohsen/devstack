"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { useEffect } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  sanitizeSvg,
  StackCreateInputSchema,
  StackUpdateInputSchema,
  type StackOutput
} from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { DefaultLoader } from "@/shared/ui/default-loader";
import { EntityFormSheet } from "@/shared/ui/entity-form-sheet";
import { Icon } from "@/shared/ui/icon";

import { getPortfolioListQueryKey } from "@/features/portfolio";

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
    ...orpcQueryClient.projects.list.queryOptions({})
  });

  const createMutation = useMutation(
    orpcQueryClient.stacks.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.stacks.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.projects.list.queryKey()
        });
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
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.stacks.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.stacks.get.queryKey({
            input: { id: id! }
          })
        });
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.projects.list.queryKey()
        });
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
          dependencies: value.dependencies,
          projectIds: value.projectIds
        });
      }
    }
  });

  const isDirty = useSelector(form.store, (s) => s.isDirty && s.isTouched);
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
        dependencies: [],
        projectIds: []
      });
    }
  }, [open, stack, isEdit, form]);

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
      footer={({ requestClose }) => (
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" type="button" disabled={busy} onClick={requestClose}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void form.handleSubmit()}>
            {isEdit
              ? updateMutation.isPending
                ? "Saving..."
                : "Save"
              : createMutation.isPending
                ? "Creating..."
                : "Create"}
          </Button>
        </div>
      )}
    >
      {body}
    </EntityFormSheet>
  );
}
