"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  CreateExperienceInputSchema,
  UpdateExperienceInputSchema,
  type ExperienceOutput
} from "@tsu-stack/core";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";

import { SubmitButton, useAppForm } from "@/shared/form";
import { invalidateExperiencesListQueries } from "@/shared/lib/invalidate-experiences-list";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { DefaultLoader } from "@/shared/ui/default-loader";
import { useEntityFormDirty } from "@/shared/ui/use-entity-form-dirty";

import { getPortfolioListQueryKey } from "@/features/portfolio";

import { EntityFormSheet } from "@/pages/dashboard/_lib/entity-form-panel";

type ExperienceFormSeed = { id: string } | ExperienceOutput;

type ExperienceFormProps = {
  initialData?: ExperienceFormSeed | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (id: string) => void;
};

function isExperienceOutput(data: ExperienceFormSeed): data is ExperienceOutput {
  return "title" in data;
}

export function ExperienceForm({ initialData, open, onOpenChange, onSaved }: ExperienceFormProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(initialData?.id);
  const id = initialData?.id;
  const seed = initialData && isExperienceOutput(initialData) ? initialData : undefined;

  const experienceQuery = useQuery({
    ...orpcQueryClient.experiences.get.queryOptions({
      input: { id: id! }
    }),
    enabled: isEdit && open,
    placeholderData: seed
  });

  const createMutation = useMutation(
    orpcQueryClient.experiences.create.mutationOptions({
      onSuccess: async (created) => {
        await invalidateExperiencesListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
        });
        toast.success("Experience created.");
        onSaved?.(created.id);
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create experience.");
      }
    })
  );

  const updateMutation = useMutation(
    orpcQueryClient.experiences.update.mutationOptions({
      onSuccess: async (updated) => {
        await invalidateExperiencesListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.experiences.get.queryKey({
            input: { id: id! }
          })
        });
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
        });
        toast.success("Experience updated.");
        onSaved?.(updated?.id ?? id!);
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to update experience.");
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
      includedInPortfolio: !!experience?.portfolioEntryId
    },
    validators: {
      onBlur: createZodFormValidator(
        isEdit ? UpdateExperienceInputSchema : CreateExperienceInputSchema
      )
    },
    onSubmit: ({ value }) => {
      const payload = {
        ...value,
        includedInPortfolio: value.includedInPortfolio,
        description: value.description,
        fromDate: value.fromDate ?? null,
        toDate: value.toDate ?? null
      };
      if (isEdit && id) {
        updateMutation.mutate({ id: id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    }
  });

  const busy = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    if (experience) {
      form.reset({
        title: experience.title,
        organization: experience.organization,
        description: experience.description ?? "",
        fromDate: experience.fromDate ?? "",
        toDate: experience.toDate ?? "",
        isPresent: experience.isPresent,
        includedInPortfolio: !!experience.portfolioEntryId
      });
    } else if (!isEdit) {
      form.reset({
        title: "",
        organization: "",
        description: "",
        fromDate: "",
        toDate: "",
        isPresent: false,
        includedInPortfolio: false
      });
    }
  }, [open, experience, isEdit, form]);

  const isDirty = useEntityFormDirty(form, open);

  const body =
    isEdit && experienceQuery.isLoading && !experience ? (
      <DefaultLoader />
    ) : isEdit && !experienceQuery.isLoading && !experience ? (
      <div className="py-8 text-center text-muted-foreground">Experience not found.</div>
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
          <form.AppField name="title">
            {(field) => (
              <field.InputField
                description="test test test"
                label="Title"
                placeholder="e.g. Senior Software Engineer"
              />
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

          <form.AppField name="includedInPortfolio">
            {(field) => (
              <field.SwitchField
                label="In portfolio"
                description="Include this experience in your public portfolio."
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
      title={isEdit ? "Edit Experience" : "New Experience"}
      description={isEdit ? "Update your position details." : "Add a new position to your resume."}
      updatedAt={experience?.updatedAt}
      createdAt={experience?.createdAt}
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
