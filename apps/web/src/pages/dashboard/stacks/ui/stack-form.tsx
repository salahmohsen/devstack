"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  sanitizeSvg,
  StackCreateInputSchema,
  StackUpdateInputSchema,
  type StackOutput
} from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
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
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";
import { Input } from "@tsu-stack/ui/components/input";

import { useAppForm } from "@/shared/form";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { DefaultLoader } from "@/shared/ui/default-loader";
import { useFormDirtyGuard } from "@/shared/ui/form-dirty-guard";

import { getPortfolioListQueryOptions } from "@/features/portfolio";

type StackFormProps = {
  initialData?: StackOutput | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StackForm({ initialData, open, onOpenChange }: StackFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!initialData;
  const id = initialData?.id;

  const stackQuery = useQuery({
    ...orpcQueryClient.stacks.get.queryOptions({
      input: { id: id! }
    }),
    enabled: isEdit,
    placeholderData: initialData ?? undefined
  });

  const createMutation = useMutation(
    orpcQueryClient.stacks.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.stacks.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryOptions().queryKey
        });
        toast.success("Stack created.");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create stack.");
      }
    })
  );

  const updateMutation = useMutation(
    orpcQueryClient.stacks.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.stacks.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.stacks.get.queryKey({
            input: { id: id! }
          })
        });
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.projects.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryOptions().queryKey
        });
        toast.success("Stack updated.");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update stack.");
      }
    })
  );

  const stack = stackQuery.data;

  const [dependencies, setDependencies] = useState<
    Array<{
      npmPackage: string;
      description: string | null;
      homepage: string | null;
    }>
  >([]);

  const [depSearchQuery, setDepSearchQuery] = useState("");
  const [depDebouncedQuery] = useDebouncedValue(depSearchQuery, 300);

  const npmSearchQuery = useQuery({
    ...orpcQueryClient.stacks.searchNpm.queryOptions({ input: { query: depDebouncedQuery } }),
    enabled: depDebouncedQuery.length >= 2
  });

  const searchResults = npmSearchQuery.data?.items ?? [];
  const existingPackages = new Set(dependencies.map((d) => d.npmPackage));

  useEffect(() => {
    if (stack?.dependencies) {
      setDependencies(
        stack.dependencies.map((d) => {
          return {
            npmPackage: d.npmPackage,
            description: d.description ?? null,
            homepage: d.homepage ?? null
          };
        })
      );
    }
  }, [stack?.dependencies]);

  const form = useAppForm({
    defaultValues: {
      name: stack?.name ?? "",
      description: stack?.description ?? "",
      icon: stack?.icon ?? "",
      includedInPortfolio: !!stack?.portfolioEntryId
    },
    validators: {
      onBlur: createZodFormValidator(isEdit ? StackUpdateInputSchema : StackCreateInputSchema)
    },
    onSubmit: ({ value }) => {
      if (isEdit && id) {
        updateMutation.mutate({
          id,
          data: {
            name: value.name,
            description: value.description || null,
            icon: value.icon ? sanitizeSvg(value.icon) : null,
            includedInPortfolio: value.includedInPortfolio,
            dependencies
          }
        });
      } else {
        createMutation.mutate({
          name: value.name,
          description: value.description ?? null,
          icon: value.icon ? sanitizeSvg(value.icon) : null,
          includedInPortfolio: value.includedInPortfolio,
          dependencies
        });
      }
    }
  });

  const handleClose = () => onOpenChange(false);
  const { alertDialog, handleCloseAttempt } = useFormDirtyGuard(form, handleClose);

  if (isEdit && stackQuery.isLoading && !stack) {
    return <DefaultLoader />;
  }

  if (isEdit && !stackQuery.isLoading && !stack) {
    return <div className="py-8 text-center text-muted-foreground">Stack not found.</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Stack" : "New Stack"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the name or icon. Changes apply to every project using this stack."
              : "Add a shared tech stack that can be attached to any project."}
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
          <DialogPanel>
            <FieldGroup>
              <form.AppField name="name">
                {(field) => <field.InputField label="Name" placeholder="e.g. React" />}
              </form.AppField>

              <form.AppField name="icon">
                {(field) => (
                  <field.IconifyField
                    label="Stack Icon"
                    description="Search for an icon from Iconify."
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

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Dependencies</label>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Input
                      placeholder="Search npm packages..."
                      value={depSearchQuery}
                      onChange={(e) => setDepSearchQuery(e.target.value)}
                    />
                    {searchResults.length > 0 && depDebouncedQuery.length >= 2 && (
                      <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-background shadow-md">
                        {searchResults.map((item) => (
                          <button
                            key={item.name}
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                            disabled={existingPackages.has(item.name)}
                            onClick={() => {
                              setDependencies((prev) => [
                                ...prev,
                                {
                                  npmPackage: item.name,
                                  description: item.description || null,
                                  homepage: item.links.npm || null
                                }
                              ]);
                              setDepSearchQuery("");
                            }}
                          >
                            <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate font-medium">{item.name}</span>
                            {item.description && (
                              <span className="truncate text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {dependencies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {dependencies.map((dep) => (
                        <Badge
                          key={dep.npmPackage}
                          variant="secondary"
                          size="lg"
                          className="gap-1 pr-1"
                        >
                          {dep.npmPackage}
                          <button
                            type="button"
                            className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                            onClick={() => {
                              setDependencies((prev) =>
                                prev.filter((d) => d.npmPackage !== dep.npmPackage)
                              );
                            }}
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <form.AppField name="includedInPortfolio">
                {(field) => (
                  <field.SwitchField
                    label="In portfolio"
                    description="Include this stack in your public portfolio."
                  />
                )}
              </form.AppField>
            </FieldGroup>
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
