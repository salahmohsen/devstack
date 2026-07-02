"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  CreateExperienceInputSchema,
  UpdateExperienceInputSchema
} from "@tsu-stack/core/portfolio";
import { Button } from "@tsu-stack/ui/components/button";
import { DialogFooter } from "@tsu-stack/ui/components/dialog.js";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area.js";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { DefaultLoader } from "@/shared/ui/default-loader";
import { useFormDirtyGuard } from "@/shared/ui/form-dirty-guard";

type ExperienceFormProps = {
  id?: string;
  onSuccess?: () => void;
  onClose?: () => void;
};

export function ExperienceForm({ id, onSuccess, onClose }: ExperienceFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const experienceQuery = useQuery({
    ...orpcQueryClient.portfolio.experiences.get.queryOptions({ input: { id: id! } }),
    enabled: isEdit
  });

  const createMutation = useMutation(
    orpcQueryClient.portfolio.experiences.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.experiences.list.queryKey()
        });
        toast.success("Experience created.");
        onSuccess?.();
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
          queryKey: orpcQueryClient.portfolio.experiences.get.queryKey({ input: { id: id! } })
        });
        toast.success("Experience updated.");
        onSuccess?.();
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
      isPresent: experience?.isPresent ?? false,
      enableAi: experience?.enableAi ?? false
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
      if (isEdit) {
        updateMutation.mutate({ id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    }
  });

  const { alertDialog, handleCloseAttempt } = useFormDirtyGuard(form, onClose);

  useEffect(() => {
    if (experience) {
      form.reset({
        title: experience.title,
        organization: experience.organization,
        description: experience.description ?? "",
        fromDate: experience.fromDate ?? "",
        toDate: experience.toDate ?? "",
        isPresent: experience.isPresent,
        enableAi: experience.enableAi
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
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <ScrollArea className="max-h-[75dvh] pe-5">
          <FieldGroup>
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
                {(field) => <field.DatePickerField label="From Date" placeholder="Start date" />}
              </form.AppField>

              <form.AppField name="toDate">
                {(field) => <field.DatePickerField label="To Date" placeholder="End date" />}
              </form.AppField>
            </div>

            <form.AppField name="isPresent">
              {(field) => (
                <field.SwitchField
                  label="Currently present"
                  description="Mark this experience as your current role."
                />
              )}
            </form.AppField>

            <form.AppField name="enableAi">
              {(field) => (
                <field.SwitchField
                  label="Enable AI"
                  description="Let AI generate or enhance this experience."
                />
              )}
            </form.AppField>
          </FieldGroup>
        </ScrollArea>

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
      </form>
      {alertDialog}
    </>
  );
}
