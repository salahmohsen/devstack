"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { CreateProjectInputSchema } from "@tsu-stack/core/portfolio";
import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";

import { GitHubRepoMultiCombobox } from "@/features/github";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/projects/new")({
  component: NewProjectPage
});

function NewProjectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const experiencesQuery = useQuery(orpc.portfolio.experiences.list.queryOptions());

  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(null);

  const createMutation = useMutation(
    orpc.portfolio.projects.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.portfolio.projects.list.queryKey() });
        toast.success("Project created.");
        await navigate({ to: "/dashboard/projects" });
      }
    })
  );

  const form = useAppForm({
    defaultValues: {
      title: "",
      year: new Date().getFullYear(),
      summary: "",
      description: "",
      logo: "",
      repos: [] as string[],
      demoUrl: "",
      isPresent: false,
      enableAi: false,
      stackIds: [] as string[]
    },
    validators: {
      onChange: createZodFormValidator(CreateProjectInputSchema)
    },
    onSubmit: ({ value }) => {
      createMutation.mutate({
        ...value,
        summary: value.summary,
        description: value.description,
        logo: value.logo ?? null,
        repos: value.repos ?? [],
        demoUrl: value.demoUrl ?? null,
        experienceId: selectedExperienceId,
        enableAi: value.enableAi,
        stackIds: value.stackIds ?? []
      });
    }
  });

  return (
    <div className="w-full max-w-2xl min-w-0 space-y-6 p-5">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">New Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add a new project to your portfolio.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField name="title">
                {(field) => (
                  <field.InputField label="Title" placeholder="e.g. My Awesome Project" />
                )}
              </form.AppField>

              <div className="grid grid-cols-2 gap-4">
                <form.AppField name="year">
                  {(field) => <field.InputField label="Year" type="number" />}
                </form.AppField>

                <form.AppField name="logo">
                  {(field) => <field.InputField label="Logo URL" placeholder="https://..." />}
                </form.AppField>
              </div>

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
                  <label
                    htmlFor="project-experience"
                    className="text-sm font-medium text-foreground"
                  >
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
                  <field.RichTextField
                    label="Summary"
                    placeholder="Brief overview of the project"
                  />
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

              <div className="flex items-center gap-2">
                <form.AppForm>
                  <form.SubmitButton isLoading={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </form.SubmitButton>
                </form.AppForm>
                <Button variant="outline" render={<Link to="/dashboard/projects" />}>
                  Cancel
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
