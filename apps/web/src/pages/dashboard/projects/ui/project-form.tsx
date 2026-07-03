"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { CreateProjectInputSchema, UpdateProjectInputSchema } from "@tsu-stack/core/portfolio";
import { Button } from "@tsu-stack/ui/components/button";
import { DialogFooter } from "@tsu-stack/ui/components/dialog.js";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area.js";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { DefaultLoader } from "@/shared/ui/default-loader";
import { useFormDirtyGuard } from "@/shared/ui/form-dirty-guard";

import { GitHubRepoMultiCombobox } from "@/features/github";

type ProjectFormProps = {
  id?: string;
  onSuccess?: () => void;
  onClose?: () => void;
};

export function ProjectForm({ id, onSuccess, onClose }: ProjectFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const projectQuery = useQuery({
    ...orpcQueryClient.portfolio.projects.get.queryOptions({ input: { id: id! } }),
    enabled: isEdit
  });

  const experiencesQuery = useQuery(orpcQueryClient.portfolio.experiences.list.queryOptions());

  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(null);

  const createMutation = useMutation(
    orpcQueryClient.portfolio.projects.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.projects.list.queryKey()
        });
        toast.success("Project created.");
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create project.");
      }
    })
  );

  const updateMutation = useMutation(
    orpcQueryClient.portfolio.projects.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.projects.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.projects.get.queryKey({ input: { id: id! } })
        });
        toast.success("Project updated.");
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update project.");
      }
    })
  );

  const project = projectQuery.data;

  useEffect(() => {
    if (project) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setSelectedExperienceId(project.experienceId ?? null);
    }
  }, [project]);

  const form = useAppForm({
    defaultValues: {
      title: project?.title ?? "",
      year: project?.year ?? new Date().getFullYear(),
      summary: project?.summary ?? "",
      description: project?.description ?? "",
      logo: project?.logo ?? "",
      repos: (project?.repos ?? []) as string[],
      demoUrl: project?.demoUrl ?? "",
      isPresent: project?.isPresent ?? false,
      enableAi: project?.enableAi ?? false,
      stackIds: (project?.stacks.map((s) => s.id) ?? []) as string[]
    },
    validators: {
      onChange: createZodFormValidator(isEdit ? UpdateProjectInputSchema : CreateProjectInputSchema)
    },
    onSubmit: ({ value }) => {
      const payload = {
        ...value,
        year: value.year ?? new Date().getFullYear(),
        summary: value.summary,
        description: value.description,
        logo: value.logo ?? null,
        repos: value.repos ?? [],
        demoUrl: value.demoUrl ?? null,
        experienceId: selectedExperienceId,
        enableAi: value.enableAi,
        stackIds: value.stackIds ?? []
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
    if (project) {
      form.reset({
        title: project.title,
        year: project.year,
        summary: project.summary ?? "",
        description: project.description ?? "",
        logo: project.logo ?? "",
        repos: project.repos ?? [],
        demoUrl: project.demoUrl ?? "",
        isPresent: project.isPresent,
        enableAi: project.enableAi,
        stackIds: project.stacks.map((s) => s.id)
      });
    }
  }, [project, form]);

  if (isEdit && projectQuery.isLoading && !project) {
    return <DefaultLoader />;
  }

  if (isEdit && !projectQuery.isLoading && !project) {
    return <div className="py-8 text-center text-muted-foreground">Project not found.</div>;
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
              {(field) => <field.InputField label="Title" placeholder="e.g. My Awesome Project" />}
            </form.AppField>

            <form.AppField name="year">
              {(field) => <field.InputField label="Year" type="number" />}
            </form.AppField>

            <form.AppField name="logo">
              {(field) => <field.ImageField label="Project logo" />}
            </form.AppField>

            <form.AppField name="repos">
              {() => (
                <GitHubRepoMultiCombobox
                  label="Repositories"
                  description="Pick one or more of your GitHub repositories (public or private)."
                />
              )}
            </form.AppField>

            <form.AppField name="demoUrl">
              {(field) => (
                <field.InputField label="Demo URL" type="url" placeholder="https://example.com" />
              )}
            </form.AppField>

            {experiencesQuery.data && experiencesQuery.data.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="project-experience" className="text-sm font-medium text-foreground">
                  Associated Experience
                </label>
                <select
                  id="project-experience"
                  className="flex h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm"
                  value={selectedExperienceId ?? ""}
                  onChange={(e) => setSelectedExperienceId(e.target.value || null)}
                >
                  <option value="">None</option>
                  {experiencesQuery.data.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.title} — {exp.organization}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form.AppField name="summary">
              {(field) => (
                <field.RichTextField label="Summary" placeholder="Brief overview of the project" />
              )}
            </form.AppField>

            <form.AppField name="description">
              {(field) => (
                <field.RichTextField
                  label="Description"
                  placeholder="Brief description of the project"
                />
              )}
            </form.AppField>

            <form.AppField name="isPresent">
              {(field) => (
                <field.SwitchField
                  label="Currently present"
                  description="Mark this project as ongoing."
                />
              )}
            </form.AppField>

            <form.AppField name="enableAi">
              {(field) => (
                <field.SwitchField
                  label="Enable AI"
                  description="Let AI generate or enhance this project."
                />
              )}
            </form.AppField>

            <form.AppField name="stackIds">
              {(field) => (
                <field.StackSelector
                  label="Tech Stacks"
                  description="Pick existing stacks or create a new one."
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
