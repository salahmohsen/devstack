"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { StackCreateInputSchema, StackUpdateInputSchema } from "@tsu-stack/core/portfolio";
import { Button } from "@tsu-stack/ui/components/button";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { DefaultLoader } from "@/shared/ui/default-loader";

type StackFormProps = {
  id?: string;
  onSuccess?: () => void;
  onClose?: () => void;
};

export function StackForm({ id, onSuccess, onClose }: StackFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const stackQuery = useQuery({
    ...orpcQueryClient.portfolio.stacks.get.queryOptions({ input: { id: id! } }),
    enabled: isEdit
  });

  const createMutation = useMutation(
    orpcQueryClient.portfolio.stacks.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.stacks.list.queryKey()
        });
        toast.success("Stack created.");
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create stack.");
      }
    })
  );

  const updateMutation = useMutation(
    orpcQueryClient.portfolio.stacks.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.stacks.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.stacks.get.queryKey({ input: { id: id! } })
        });
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.projects.list.queryKey()
        });
        toast.success("Stack updated.");
        onSuccess?.();
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
      enableAi: stack?.enableAi ?? false
    },
    validators: {
      onBlur: createZodFormValidator(isEdit ? StackUpdateInputSchema : StackCreateInputSchema)
    },
    onSubmit: ({ value }) => {
      if (isEdit) {
        updateMutation.mutate({
          id,
          data: {
            name: value.name,
            description: value.description || null,
            icon: value.icon ? value.icon : null,
            enableAi: value.enableAi
          }
        });
      } else {
        createMutation.mutate({
          name: value.name,
          description: value.description || null,
          icon: value.icon ? value.icon : null,
          enableAi: value.enableAi
        });
      }
    }
  });

  useEffect(() => {
    if (stack) {
      form.reset({
        name: stack.name,
        description: stack.description ?? "",
        icon: stack.icon ?? "",
        enableAi: stack.enableAi
      });
    }
  }, [stack]);

  if (isEdit && stackQuery.isLoading && !stack) {
    return <DefaultLoader />;
  }

  if (isEdit && !stackQuery.isLoading && !stack) {
    return <div className="py-8 text-center text-muted-foreground">Stack not found.</div>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.AppField name="name">
          {(field) => <field.InputField label="Name" placeholder="e.g. React" />}
        </form.AppField>

        <form.AppField name="icon">
          {(field) => <field.IconPickerField label="Stack Icon" />}
        </form.AppField>

        <form.AppField name="description">
          {(field) => (
            <field.RichTextField label="Description" placeholder="Brief description of the stack" />
          )}
        </form.AppField>

        <form.AppField name="enableAi">
          {(field) => (
            <field.SwitchField
              label="Enable AI"
              description="Let AI generate or enhance this stack."
            />
          )}
        </form.AppField>

        <div className="flex items-center gap-2">
          <form.AppForm>
            <form.SubmitButton isLoading={createMutation.isPending || updateMutation.isPending}>
              {isEdit
                ? updateMutation.isPending
                  ? "Saving..."
                  : "Save"
                : createMutation.isPending
                  ? "Creating..."
                  : "Create"}
            </form.SubmitButton>
          </form.AppForm>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
