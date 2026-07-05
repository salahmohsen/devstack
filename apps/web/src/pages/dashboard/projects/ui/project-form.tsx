"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  type ProjectOutput
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
import { Form } from "@tsu-stack/ui/components/form";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { useFormDirtyGuard } from "@/shared/ui/form-dirty-guard";
import { Icon } from "@/shared/ui/icon";

import { useGetGithubProfileReposQuery } from "@/features/github";

type ProjectFormProps = {
  initialData?: ProjectOutput | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProjectForm({ initialData, open, onOpenChange }: ProjectFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!initialData;
  const id = initialData?.id;

  const experiencesQuery = useQuery(orpcQueryClient.portfolio.experiences.list.queryOptions());
  const stacksQuery = useQuery(orpcQueryClient.portfolio.stacks.list.queryOptions());
  const reposQuery = useGetGithubProfileReposQuery();
  const stacks = stacksQuery.data ?? [];
  const repos = reposQuery.data ?? [];

  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(null);

  const createMutation = useMutation(
    orpcQueryClient.portfolio.projects.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.projects.list.queryKey()
        });
        toast.success("Project created.");
        onOpenChange(false);
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
          queryKey: orpcQueryClient.portfolio.projects.get.queryKey({
            input: { id: id! }
          })
        });
        toast.success("Project updated.");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update project.");
      }
    })
  );

  const form = useAppForm({
    defaultValues: {
      title: initialData?.title ?? "",
      year: initialData?.year ?? new Date().getFullYear(),
      summary: initialData?.summary ?? "",
      description: initialData?.description ?? "",
      logo: initialData?.logo ?? "",
      repos: (initialData?.repos ?? []) as string[],
      demoUrl: initialData?.demoUrl ?? "",
      isPresent: initialData?.isPresent ?? false,
      stackIds: (initialData?.stacks.map((s) => s.id) ?? []) as string[],
      includedInPortfolio: !!initialData?.portfolioEntryId
    },
    validators: {
      onChange: createZodFormValidator(isEdit ? UpdateProjectInputSchema : CreateProjectInputSchema)
    },
    onSubmit: ({ value }) => {
      const payload = {
        ...value,
        includedInPortfolio: value.includedInPortfolio,
        year: value.year ?? new Date().getFullYear(),
        summary: value.summary,
        description: value.description,
        logo: value.logo ?? null,
        repos: value.repos ?? [],
        demoUrl: value.demoUrl ?? null,
        experienceId: selectedExperienceId,
        stackIds: value.stackIds ?? []
      };
      if (isEdit && id) {
        updateMutation.mutate({ id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    }
  });

  const handleClose = () => onOpenChange(false);
  const { alertDialog, handleCloseAttempt } = useFormDirtyGuard(form, handleClose);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      form.reset({
        title: initialData.title,
        year: initialData.year,
        summary: initialData.summary ?? "",
        description: initialData.description ?? "",
        logo: initialData.logo ?? "",
        repos: initialData.repos ?? [],
        demoUrl: initialData.demoUrl ?? "",
        isPresent: initialData.isPresent,
        stackIds: initialData.stacks.map((s) => s.id),
        includedInPortfolio: !!initialData.portfolioEntryId
      });
      setSelectedExperienceId(initialData.experienceId ?? null);
    } else {
      form.reset({
        title: "",
        year: new Date().getFullYear(),
        summary: "",
        description: "",
        logo: "",
        repos: [],
        demoUrl: "",
        isPresent: false,
        stackIds: [],
        includedInPortfolio: false
      });
      setSelectedExperienceId(null);
    }
  }, [open, initialData, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-6xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update your project details." : "Add a new project to your portfolio."}
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
          <DialogPanel className="space-y-4">
            <form.AppField name="logo">
              {(field) => <field.ImageField label="Project logo" />}
            </form.AppField>

            <form.AppField name="title">
              {(field) => <field.InputField label="Title" placeholder="e.g. My Awesome Project" />}
            </form.AppField>

            <form.AppField name="year">{(field) => <field.YearField label="Year" />}</form.AppField>

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

            <form.AppField name="demoUrl">
              {(field) => (
                <field.InputField label="Demo URL" type="url" placeholder="https://example.com" />
              )}
            </form.AppField>

            <form.AppField name="repos">
              {(field) => (
                <field.ComboboxMultipleField
                  items={repos.map((repo) => {
                    return { label: repo.fullName, value: repo.url };
                  })}
                  label="Repositories"
                  description="Pick one or more of your GitHub repositories (public or private)."
                  placeholder="Select repositories..."
                  emptyMessage="No repositories found."
                />
              )}
            </form.AppField>

            <form.AppField name="stackIds">
              {(field) => (
                <field.ComboboxMultipleField
                  items={stacks.map((stack) => {
                    return {
                      label: stack.name,
                      value: stack.id,
                      icon: stack.icon ? <Icon nameIcon={stack.icon} /> : undefined
                    };
                  })}
                  label="Tech Stacks"
                  description="Pick existing stacks to associate with this project."
                  placeholder="Select stacks..."
                  emptyMessage="No stacks found."
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

            <form.AppField name="includedInPortfolio">
              {(field) => (
                <field.SwitchField
                  label="In portfolio"
                  description="Include this project in your public portfolio."
                />
              )}
            </form.AppField>
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
