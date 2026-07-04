"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  CreateExperienceInputSchema,
  UpdateExperienceInputSchema,
  type ExperienceOutput
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

type ExperienceFormProps = {
  initialData?: ExperienceOutput | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ExperienceForm({ initialData, open, onOpenChange }: ExperienceFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!initialData;
  const id = initialData?.id;

  const experienceQuery = useQuery({
    ...orpcQueryClient.portfolio.experiences.get.queryOptions({
      input: { id: id! }
    }),
    enabled: isEdit,
    placeholderData: initialData ?? undefined
  });

  const createMutation = useMutation(
    orpcQueryClient.portfolio.experiences.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.experiences.list.queryKey()
        });
        toast.success("Experience created.");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create experience.");
      }
    })
  );

  const updateMutation = useMutation(
    orpcQueryClient.portfolio.experiences.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.experiences.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.experiences.get.queryKey({
            input: { id: id! }
          })
        });
        toast.success("Experience updated.");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update experience.");
      }
    })
  );

  const experience = experienceQuery.data;

  const form = useAppForm({
    defaultValues: {
      title: experience?.title ?? "",
      organization: experience?.organization ?? "",
      description: experience?.description ?? "",
      fromDate: experience?.fromDate ?? "",
      toDate: experience?.toDate ?? "",
      isPresent: experience?.isPresent ?? false
    },
    validators: {
      onBlur: createZodFormValidator(
        isEdit ? UpdateExperienceInputSchema : CreateExperienceInputSchema
      )
    },
    onSubmit: ({ value }) => {
      const payload = {
        ...value,
        description: value.description,
        fromDate: value.fromDate || null,
        toDate: value.toDate || null
      };
      if (isEdit && id) {
        updateMutation.mutate({ id: id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    }
  });

  const handleClose = () => onOpenChange(false);
  const { alertDialog, handleCloseAttempt } = useFormDirtyGuard(form, handleClose);

  useEffect(() => {
    if (experience) {
      form.reset({
        title: experience.title,
        organization: experience.organization,
        description: experience.description ?? "",
        fromDate: experience.fromDate ?? "",
        toDate: experience.toDate ?? "",
        isPresent: experience.isPresent
      });
    }
  }, [experience, form]);

  if (isEdit && experienceQuery.isLoading && !experience) {
    return <DefaultLoader />;
  }

  if (isEdit && !experienceQuery.isLoading && !experience) {
    return <div className="py-8 text-center text-muted-foreground">Experience not found.</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-6xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Experience" : "New Experience"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update your position details." : "Add a new position to your resume."}
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
            <FieldGroup className="gap-4">
              <form.AppField name="title">
                {(field) => (
                  <field.InputField label="Title" placeholder="e.g. Senior Software Engineer" />
                )}
              </form.AppField>

              <form.AppField name="organization">
                {(field) => <field.InputField label="Organization" placeholder="e.g. Acme Corp" />}
              </form.AppField>

              <form.AppField name="description">
                {(field) => (
                  <field.RichTextField
                    label="Description"
                    placeholder="Brief description of your role"
                  />
                )}
              </form.AppField>

              <div className="grid grid-cols-2 gap-4">
                <form.AppField name="fromDate">
                  {(field) => <field.CalendarField label="From Date" />}
                </form.AppField>

                <form.AppField name="toDate">
                  {(field) => <field.CalendarField label="To Date" />}
                </form.AppField>

                <form.AppField name="isPresent">
                  {(field) => (
                    <field.SwitchField
                      label="Currently present"
                      description="Mark this experience as your current role."
                    />
                  )}
                </form.AppField>
              </div>
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
