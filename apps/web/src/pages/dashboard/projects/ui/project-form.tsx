"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SparklesIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  type ProjectOutput
} from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Form } from "@tsu-stack/ui/components/form";
import { Group, GroupSeparator, GroupText } from "@tsu-stack/ui/components/group";
import { Label } from "@tsu-stack/ui/components/label";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger
} from "@tsu-stack/ui/components/tooltip";

import { useAppForm } from "@/shared/form";
import { invalidateProjectsListQueries } from "@/shared/lib/invalidate-projects-list";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { DefaultLoader } from "@/shared/ui/default-loader";
import { EntityFormSheet } from "@/shared/ui/entity-form-sheet";
import { Icon } from "@/shared/ui/icon";
import { useEntityFormDirty } from "@/shared/ui/use-entity-form-dirty";

import { useGetGithubProfileReposQuery } from "@/features/github";
import { getPortfolioListQueryKey } from "@/features/portfolio";
import {
  cancelDetectStacksJob,
  startDetectStacksJob,
  useDetectStacksJobSelector
} from "@/features/stacks";

import { setDetectStacksFormMergeHandler } from "@/pages/dashboard/projects/_lib/detect-stacks-form-bridge";

type ProjectFormProps = {
  initialData?: ProjectOutput | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProjectForm({ initialData, open, onOpenChange }: ProjectFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!initialData;
  const id = initialData?.id;

  const experiencesQuery = useQuery(orpcQueryClient.experiences.list.queryOptions());
  const stacksQuery = useQuery(orpcQueryClient.stacks.list.queryOptions());
  // Dashboard form: session user's private repos only.
  const reposQuery = useGetGithubProfileReposQuery("me", true);
  const stacks = stacksQuery.data ?? [];
  const repos = reposQuery.data ?? [];

  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(null);

  // Detached detect job — field selectors so stepLabel ticks don't re-render the whole form.
  const detectStatus = useDetectStacksJobSelector((s) => s.status);
  const detectStepLabel = useDetectStacksJobSelector((s) => s.stepLabel);
  const detectJobProjectId = useDetectStacksJobSelector((s) => s.projectId);
  const isDetectRunningForThis = detectStatus === "running" && !!id && detectJobProjectId === id;

  const createMutation = useMutation(
    orpcQueryClient.projects.create.mutationOptions({
      onSuccess: async () => {
        await invalidateProjectsListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
        });
        toast.success("Project created.");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to create project.");
      }
    })
  );

  const updateMutation = useMutation(
    orpcQueryClient.projects.update.mutationOptions({
      onSuccess: async () => {
        await invalidateProjectsListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.projects.get.queryKey({
            input: { id: id! }
          })
        });
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
        });
        toast.success("Project updated.");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to update project.");
      }
    })
  );

  const form = useAppForm({
    defaultValues: {
      title: initialData?.title ?? "",
      year: initialData?.year ?? new Date().getFullYear(),
      summary: initialData?.summary ?? "",
      description: initialData?.description ?? "",
      analysis: initialData?.analysis ?? "",
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
        analysis: value.analysis?.trim() ? value.analysis : null,
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

  const busy = createMutation.isPending || updateMutation.isPending;

  const handleStartDetect = () => {
    // Single-flight + reopen ready review is handled inside the job runner.
    if (detectStatus === "running" || detectStatus === "ready") {
      startDetectStacksJob({
        projectId: id ?? "",
        repos: form.getFieldValue("repos") ?? []
      });
      return;
    }
    if (!id) {
      toast.error("Save the project first to detect stacks.");
      return;
    }
    const selectedRepos = form.getFieldValue("repos") ?? [];
    if (selectedRepos.length === 0) {
      toast.error("Select at least one repository first.");
      return;
    }
    startDetectStacksJob({ projectId: id, repos: selectedRepos });
  };

  // Reset only when the sheet opens or the edited project id changes.
  const projectIdKey = initialData?.id ?? "new";

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      form.reset({
        title: initialData.title,
        year: initialData.year,
        summary: initialData.summary ?? "",
        description: initialData.description ?? "",
        analysis: initialData.analysis ?? "",
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
        analysis: "",
        logo: "",
        repos: [],
        demoUrl: "",
        isPresent: false,
        stackIds: [],
        includedInPortfolio: false
      });
      setSelectedExperienceId(null);
    }
    // Reset only when the sheet opens or project id changes (not every
    // projects.list identity change), so detect-stacks can keep stackIds.
  }, [open, projectIdKey, form]);

  // Register form merge handler so the global results host can update stackIds
  // when the form is still open for the same project after apply.
  useEffect(() => {
    if (!open || !id) {
      setDetectStacksFormMergeHandler(null);
      return;
    }
    setDetectStacksFormMergeHandler((jobProjectId, upserted) => {
      if (jobProjectId !== id) return;
      const stackIds = upserted.map((s) => s.id);
      const current = form.getFieldValue("stackIds") ?? [];
      form.setFieldValue("stackIds", Array.from(new Set([...current, ...stackIds])));
    });
    return () => {
      setDetectStacksFormMergeHandler(null);
    };
  }, [open, id, form]);

  const isDirty = useEntityFormDirty(form, open);

  return (
    <EntityFormSheet
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
      className="max-w-xl sm:max-w-xl"
      title={isEdit ? "Edit Project" : "New Project"}
      description={isEdit ? "Update your project details." : "Add a new project to your portfolio."}
      footer={({ requestClose }) => (
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" type="button" disabled={busy} onClick={requestClose}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void form.handleSubmit()}>
            {isEdit
              ? updateMutation.isPending
                ? "Saving..."
                : "Save"
              : createMutation.isPending
                ? "Creating..."
                : "Create"}
          </Button>
        </div>
      )}
    >
      <Form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <div className="space-y-4">
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

          <form.AppField name="analysis">
            {(field) => (
              <field.MarkdownField
                label="Analysis"
                description="Private markdown notes for the resume agent. Not shown on the public portfolio."
                placeholder="What you did, why, trade-offs, metrics, lessons…"
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
                placeholder="Select repositories..."
                emptyMessage="No repositories found."
                classNames={{
                  content: "max-h-48 [&_[data-slot=scroll-area-viewport]]:max-h-44",
                  chips: "max-h-24"
                }}
              />
            )}
          </form.AppField>

          <form.AppField name="stackIds">
            {(field) => (
              <form.Subscribe selector={(state) => state.values.repos}>
                {(selectedRepos) => {
                  // Ready job can reopen review without repos; new runs need id + repos.
                  const canDetect = detectStatus === "ready" || (!!id && !!selectedRepos?.length);
                  return (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={field.name}>Stack</Label>
                      <Group
                        aria-label="Project stacks"
                        className="w-full min-w-0 [&>*:first-child]:min-w-0 [&>*:first-child]:flex-1 [&>*:first-child]:overflow-hidden"
                      >
                        <field.ComboboxMultipleField
                          items={stacks.map((stack) => {
                            return {
                              label: stack.name,
                              value: stack.id,
                              icon: stack.icon ? <Icon icon={stack.icon} /> : undefined
                            };
                          })}
                          classNames={{
                            field: "contents",
                            chips: "rounded-e-none before:rounded-none"
                          }}
                          placeholder="Select stacks..."
                          emptyMessage="No stacks found."
                        />
                        {isDetectRunningForThis ? (
                          <>
                            <GroupText
                              aria-live="polite"
                              className="cursor-default gap-2 px-2"
                              role="status"
                            >
                              <DefaultLoader size="xs" />
                              <span className="max-w-28 min-w-0 shimmer truncate text-sm font-medium text-foreground">
                                {detectStepLabel ?? "Detecting…"}
                              </span>
                            </GroupText>
                            <GroupSeparator />
                            <TooltipProvider delay={0}>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      aria-label="Cancel stack detection"
                                      onClick={() => cancelDetectStacksJob()}
                                      size="icon"
                                      type="button"
                                      variant="outline"
                                    />
                                  }
                                >
                                  <XIcon aria-hidden="true" />
                                </TooltipTrigger>
                                <TooltipPopup>Cancel</TooltipPopup>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            type="button"
                            className="shrink-0"
                            onClick={handleStartDetect}
                            disabled={!canDetect}
                          >
                            <SparklesIcon />
                            Detect Stacks
                          </Button>
                        )}
                      </Group>
                      {!id ? (
                        <p className="text-xs text-muted-foreground">
                          Save the project first to enable automatic stack detection.
                        </p>
                      ) : !selectedRepos?.length ? (
                        <p className="text-xs text-muted-foreground">
                          Select repositories above to enable automatic stack detection.
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              </form.Subscribe>
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
        </div>
      </Form>
    </EntityFormSheet>
  );
}
