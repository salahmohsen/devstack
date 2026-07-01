"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ExperienceOutput, UpdateExperienceInputSchema } from "@tsu-stack/core/portfolio";
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

export const Route = createFileRoute(
  "/(root-layout)/__protected/dashboard/experiences/$experienceId"
)({
  component: EditExperiencePage
});

function EditExperiencePage() {
  const { experienceId } = Route.useParams();
  const experienceQuery = useQuery(
    orpcQueryClient.portfolio.experiences.get.queryOptions({ input: { id: experienceId } })
  );
  const experience = experienceQuery.data;

  if (experienceQuery.isLoading && !experience) {
    return <DefaultLoader className="mx-auto mt-16" />;
  }

  if (!experience) {
    return (
      <div className="w-full max-w-2xl min-w-0 space-y-6 p-5">
        <h1 className="text-2xl font-medium tracking-tight">Experience not found</h1>
        <Button nativeButton={false} render={<Link to="/dashboard/experiences" />}>
          Back to Experiences
        </Button>
      </div>
    );
  }

  return (
    <EditExperienceForm experience={experience} experienceId={experienceId} key={experience.id} />
  );
}

function EditExperienceForm({
  experience,
  experienceId
}: {
  experience: ExperienceOutput;
  experienceId: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateMutation = useMutation(
    orpcQueryClient.portfolio.experiences.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.experiences.list.queryKey()
        });
        toast.success("Experience updated.");
        await navigate({ to: "/dashboard/experiences" });
      }
    })
  );

  const deleteMutation = useMutation(
    orpcQueryClient.portfolio.experiences.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.experiences.list.queryKey()
        });
        toast.success("Experience deleted.");
        await navigate({ to: "/dashboard/experiences" });
      }
    })
  );

  const form = useAppForm({
    defaultValues: {
      title: experience.title,
      organization: experience.organization,
      description: experience.description ?? "",
      fromDate: experience.fromDate ?? "",
      toDate: experience.toDate ?? "",
      isPresent: experience.isPresent,
      enableAi: experience.enableAi
    },
    validators: {
      onBlur: createZodFormValidator(UpdateExperienceInputSchema)
    },
    onSubmit: ({ value }) => {
      updateMutation.mutate({
        id: experienceId,
        data: {
          ...value,
          description: value.description,
          fromDate: value.fromDate || null,
          toDate: value.toDate || null
        }
      });
    }
  });

  function handleDelete() {
    deleteMutation.mutate({ id: experienceId });
    setDeleteDialogOpen(false);
  }

  return (
    <div className="w-full max-w-2xl min-w-0 space-y-6 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Edit Experience</h1>
          <p className="mt-1 text-sm text-muted-foreground">Update your position details.</p>
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

              <div className="flex items-center gap-2">
                <form.AppForm>
                  <form.SubmitButton isLoading={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </form.SubmitButton>
                </form.AppForm>
                <Button
                  nativeButton={false}
                  variant="outline"
                  render={<Link to="/dashboard/experiences" />}
                >
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
            <DialogTitle>Delete this experience?</DialogTitle>
            <DialogDescription>
              This will permanently delete this experience and all its associated projects.
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
