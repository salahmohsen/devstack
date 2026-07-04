"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  StackCreateInputSchema,
  StackUpdateInputSchema,
  type StackOutput
} from "@tsu-stack/core/portfolio";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { DefaultLoader } from "@/shared/ui/default-loader";
import { useFormDirtyGuard } from "@/shared/ui/form-dirty-guard";

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
    ...orpcQueryClient.portfolio.stacks.get.queryOptions({ input: { id: id! } }),
    enabled: isEdit,
    placeholderData: initialData ?? undefined
  });

  const createMutation = useMutation(
    orpcQueryClient.portfolio.stacks.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.stacks.list.queryKey()
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
      enableAi: stack?.enableAi ?? false
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

  const handleClose = () => onOpenChange(false);
  const { alertDialog, handleCloseAttempt } = useFormDirtyGuard(form, handleClose);

  if (isEdit && stackQuery.isLoading && !stack) {
    return <DefaultLoader />;
  }

  if (isEdit && !stackQuery.isLoading && !stack) {
    return <div className="py-8 text-center text-muted-foreground">Stack not found.</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Stack" : "New Stack"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the name or icon. Changes apply to every project using this stack."
              : "Add a shared tech stack that can be attached to any project."}
          </DialogDescription>
        </DialogHeader>

        <Form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <DialogPanel>
            <FieldGroup>
              <form.AppField name="name">
                {(field) => <field.InputField label="Name" placeholder="e.g. React" />}
              </form.AppField>

              <form.AppField name="icon">
                {(field) => <field.IconPickerField label="Stack Icon" />}
              </form.AppField>

              <form.AppField name="description">
                {(field) => (
                  <field.RichTextField
                    label="Description"
                    placeholder="Brief description of the stack"
                  />
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
            </FieldGroup>
          </DialogPanel>

          <DialogFooter>
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
            <Button variant="outline" type="button" onClick={handleCloseAttempt}>
              Cancel
            </Button>
          </DialogFooter>
        </Form>
        {alertDialog}
      </DialogContent>
    </Dialog>
  );
}
