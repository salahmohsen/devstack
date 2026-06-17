"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { CreateExperienceInputSchema } from "@tsu-stack/core/portfolio";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";
import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";

export const Route = createFileRoute("/{-$locale}/__protected/dashboard/experiences/new")({
  component: NewExperiencePage
});

function NewExperiencePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    orpc.portfolio.experiences.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.portfolio.experiences.list.queryKey()
        });
        toast.success("Experience created.");
        await navigate({ to: "/dashboard/experiences" });
      }
    })
  );

  const form = useAppForm({
    defaultValues: {
      title: "",
      organization: "",
      description: "",
      fromDate: "",
      toDate: ""
    },
    validators: {
      onBlur: createZodFormValidator(CreateExperienceInputSchema)
    },
    onSubmit: ({ value }) => {
      createMutation.mutate({
        ...value,
        description: value.description,
        fromDate: value.fromDate || null,
        toDate: value.toDate || null
      });
    }
  });

  return (
    <div className="max-w-2xl min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">New Experience</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add a new position to your resume.</p>
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
              form.handleSubmit();
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

              <div className="flex items-center gap-2">
                <form.AppForm>
                  <form.SubmitButton isLoading={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </form.SubmitButton>
                </form.AppForm>
                <Button variant="outline" render={<Link to="/dashboard/experiences" />}>
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
