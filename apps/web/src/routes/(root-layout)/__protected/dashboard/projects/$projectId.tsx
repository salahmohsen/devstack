"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ProjectOutput, UpdateProjectInputSchema } from "@tsu-stack/core/portfolio";
import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { DefaultLoader } from "@/shared/ui/default-loader";

import { GitHubRepoCombobox } from "@/features/github";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/projects/$projectId")({
  component: EditProjectPage
});

function EditProjectPage() {
  const { projectId } = Route.useParams();

  const projectQuery = useQuery(
    orpc.portfolio.projects.get.queryOptions({ input: { id: projectId } })
  );
  const project = projectQuery.data;

  if (projectQuery.isLoading && !project) {
    return <DefaultLoader className="mx-auto mt-16" />;
  }

  if (!project) {
    return (
      <div className="w-full max-w-2xl min-w-0 space-y-6 p-5">
        <h1 className="text-2xl font-medium tracking-tight">Project not found</h1>
        <Button render={<Link to="/dashboard/projects" />}>Back to Projects</Button>
      </div>
    );
  }

  return <EditProjectForm project={project} projectId={projectId} key={project.id} />;
}

function EditProjectForm({ project, projectId }: { project: ProjectOutput; projectId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const experiencesQuery = useQuery(orpc.portfolio.experiences.list.queryOptions());

  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(
    project.experienceId ?? null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateMutation = useMutation(
    orpc.portfolio.projects.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.portfolio.projects.list.queryKey() });
        toast.success("Project updated.");
        await navigate({ to: "/dashboard/projects" });
      }
    })
  );

  const deleteMutation = useMutation(
    orpc.portfolio.projects.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.portfolio.projects.list.queryKey() });
        toast.success("Project deleted.");
        await navigate({ to: "/dashboard/projects" });
      }
    })
  );

  const form = useAppForm({
    defaultValues: {
      title: project.title,
      year: project.year,
      description: project.description ?? "",
      logo: project.logo ?? "",
      repo: project.repo ?? "",
      fromDate: project.fromDate ?? "",
      toDate: project.toDate ?? "",
      isPresent: project.isPresent,
      enableAi: project.enableAi,
      stackIds: project.stacks.map((s) => s.id)
    },
    validators: {
      onBlur: createZodFormValidator(UpdateProjectInputSchema)
    },
    onSubmit: ({ value }) => {
      updateMutation.mutate({
        id: projectId,
        data: {
          ...value,
          description: value.description,
          logo: value.logo || null,
          repo: value.repo || null,
          fromDate: value.fromDate || null,
          toDate: value.toDate || null,
          experienceId: selectedExperienceId,
          enableAi: value.enableAi,
          stackIds: value.stackIds ?? []
        }
      });
    }
  });

  function handleDelete() {
    deleteMutation.mutate({ id: projectId });
    setDeleteDialogOpen(false);
  }

  return (
    <div className="w-full max-w-2xl min-w-0 space-y-6 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Edit Project</h1>
          <p className="mt-1 text-sm text-muted-foreground">Update your project details.</p>
        </div>
        <Button
          variant="destructive"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? "Deleting..." : "Delete"}
        </Button>
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

              <form.AppField name="repo">
                {() => (
                  <GitHubRepoCombobox
                    label="Repository"
                    description="Pick one of your GitHub repositories (public or private)."
                  />
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

              <form.AppField name="description">
                {(field) => (
                  <field.RichTextField
                    label="Description"
                    placeholder="Brief description of the project"
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
                  <form.SubmitButton isLoading={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save"}
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this project?</DialogTitle>
            <DialogDescription>
              This will permanently delete this project and its associated tech stacks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
              variant="destructive"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
