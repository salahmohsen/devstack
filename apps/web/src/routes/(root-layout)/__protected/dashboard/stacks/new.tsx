"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { StackCreateInputSchema } from "@tsu-stack/core/portfolio";
import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/stacks/new")({
  component: NewStackPage
});

function NewStackPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    orpcQueryClient.portfolio.stacks.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.stacks.list.queryKey()
        });
        toast.success("Stack created.");
        await navigate({ to: "/dashboard/stacks" });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create stack.");
      }
    })
  );

  const form = useAppForm({
    defaultValues: {
      name: "",
      description: "",
      icon: "",
      enableAi: false
    },
    validators: {
      onBlur: createZodFormValidator(StackCreateInputSchema)
    },
    onSubmit: ({ value }) => {
      createMutation.mutate({
        name: value.name,
        description: value.description || null,
        icon: value.icon ? value.icon : null,
        enableAi: value.enableAi
      });
    }
  });

  return (
    <div className="w-full max-w-2xl min-w-0 space-y-6 p-5">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">New Stack</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a shared tech stack that can be attached to any project.
        </p>
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
              <form.AppField name="name">
                {(field) => <field.InputField label="Name" placeholder="e.g. React" />}
              </form.AppField>

              <form.AppField name="icon">
                {(field) => (
                  <field.InputField
                    label="Icon URL"
                    placeholder="https://..."
                    description="Optional image URL shown next to the stack name."
                  />
                )}
              </form.AppField>

              <form.AppField name="description">
                {(field) => (
                  <field.RichTextField
                    label="Description"
                    placeholder="Brief description of the stack"
                  />
                )}
              </form.AppField>

              <form.AppField name="enableAi">
                {(field) => (
                  <field.SwitchField
                    label="Enable AI"
                    description="Let AI generate or enhance this stack."
                  />
                )}
              </form.AppField>

              <div className="flex items-center gap-2">
                <form.AppForm>
                  <form.SubmitButton isLoading={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </form.SubmitButton>
                </form.AppForm>
                <Button variant="outline" render={<Link to="/dashboard/stacks" />}>
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
