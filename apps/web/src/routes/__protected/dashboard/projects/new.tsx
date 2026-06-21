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
import { Input } from "@tsu-stack/ui/components/input";
import { Separator } from "@tsu-stack/ui/components/separator";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";

export const Route = createFileRoute("/__protected/dashboard/projects/new")({
  component: NewProjectPage
});

function NewProjectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const experiencesQuery = useQuery(orpc.portfolio.experiences.list.queryOptions());

  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(null);
  const [stacks, setStacks] = useState<Array<{ name: string; iconUrl: string }>>([]);
  const [newStackName, setNewStackName] = useState("");

  function addStack() {
    const name = newStackName.trim();
    if (!name || stacks.some((s) => s.name === name)) return;
    setStacks([...stacks, { name, iconUrl: "" }]);
    setNewStackName("");
  }

  function removeStack(name: string) {
    setStacks(stacks.filter((s) => s.name !== name));
  }

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
      description: "",
      logo: "",
      fromDate: "",
      toDate: ""
    },
    validators: {
      onBlur: createZodFormValidator(CreateProjectInputSchema)
    },
    onSubmit: ({ value }) => {
      createMutation.mutate({
        ...value,
        description: value.description,
        logo: value.logo || null,
        fromDate: value.fromDate || null,
        toDate: value.toDate || null,
        experienceId: selectedExperienceId,
        stacks:
          stacks.length > 0
            ? stacks.map((s) => {
                return { name: s.name, iconUrl: s.iconUrl || null };
              })
            : undefined
      });
    }
  });

  return (
    <div className="max-w-2xl min-w-0 space-y-6">
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

              {experiencesQuery.data && experiencesQuery.data.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Associated Experience
                  </label>
                  <select
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

              <Separator />

              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Tech Stacks</label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. React"
                      value={newStackName}
                      onChange={(e) => setNewStackName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addStack();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addStack}>
                      Add
                    </Button>
                  </div>
                </div>

                {stacks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {stacks.map((stack) => (
                      <span
                        key={stack.name}
                        className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium"
                      >
                        {stack.name}
                        <button
                          type="button"
                          className="ml-0.5 text-muted-foreground hover:text-foreground"
                          onClick={() => removeStack(stack.name)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

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
