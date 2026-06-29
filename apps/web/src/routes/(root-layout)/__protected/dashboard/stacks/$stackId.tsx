"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type StackOutput, StackUpdateInputSchema } from "@tsu-stack/core/portfolio";
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

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/stacks/$stackId")({
  component: EditStackPage
});

function EditStackPage() {
  const { stackId } = Route.useParams();
  const stackQuery = useQuery(orpc.portfolio.stacks.get.queryOptions({ input: { id: stackId } }));
  const stack = stackQuery.data;

  if (stackQuery.isLoading && !stack) {
    return <DefaultLoader className="mx-auto mt-16" />;
  }

  if (!stack) {
    return (
      <div className="w-full max-w-2xl min-w-0 space-y-6 p-5">
        <h1 className="text-2xl font-medium tracking-tight">Stack not found</h1>
        <Button render={<Link to="/dashboard/stacks" />}>Back to Stacks</Button>
      </div>
    );
  }

  return <EditStackForm stack={stack} stackId={stackId} key={stack.id} />;
}

function EditStackForm({ stack, stackId }: { stack: StackOutput; stackId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateMutation = useMutation(
    orpc.portfolio.stacks.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.portfolio.stacks.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: orpc.portfolio.stacks.get.queryKey({ input: { id: stackId } })
        });
        await queryClient.invalidateQueries({
          queryKey: orpc.portfolio.projects.list.queryKey()
        });
        toast.success("Stack updated.");
        await navigate({ to: "/dashboard/stacks" });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update stack.");
      }
    })
  );

  const deleteMutation = useMutation(
    orpc.portfolio.stacks.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.portfolio.stacks.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: orpc.portfolio.projects.list.queryKey()
        });
        toast.success("Stack deleted.");
        await navigate({ to: "/dashboard/stacks" });
      },
      onError: () => {
        toast.error("Failed to delete stack.");
      }
    })
  );

  const form = useAppForm({
    defaultValues: {
      name: stack.name,
      description: stack.description ?? "",
      icon: stack.icon ?? "",
      enableAi: stack.enableAi
    },
    validators: {
      onBlur: createZodFormValidator(StackUpdateInputSchema)
    },
    onSubmit: ({ value }) => {
      updateMutation.mutate({
        id: stackId,
        data: {
          name: value.name,
          description: value.description || null,
          icon: value.icon ? value.icon : null,
          enableAi: value.enableAi
        }
      });
    }
  });

  function handleDelete() {
    deleteMutation.mutate({ id: stackId });
    setDeleteDialogOpen(false);
  }

  return (
    <div className="w-full max-w-2xl min-w-0 space-y-6 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Edit Stack</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the name or icon. Changes apply to every project using this stack.
          </p>
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
                  <form.SubmitButton isLoading={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </form.SubmitButton>
                </form.AppForm>
                <Button
                  nativeButton={false}
                  variant="outline"
                  render={<Link to="/dashboard/stacks" />}
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
            <DialogTitle>Delete this stack?</DialogTitle>
            <DialogDescription>
              &quot;{stack.name}&quot; will be removed from all projects that use it.
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
