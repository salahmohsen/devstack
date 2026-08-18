"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, SparklesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  type ProjectOutput
} from "@tsu-stack/core";
import { Form } from "@tsu-stack/ui/components/form";
import { Label } from "@tsu-stack/ui/components/label";

import { SubmitButton, useAppForm } from "@/shared/form";
import { invalidateProjectsListQueries } from "@/shared/lib/invalidate-projects-list";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { AiFlowTrigger } from "@/shared/ui/ai-flow-trigger";
import { AiLoader } from "@/shared/ui/ai-loader";
import { Icon } from "@/shared/ui/icon";
import { useEntityFormDirty } from "@/shared/ui/use-entity-form-dirty";

import { useGetGithubProfileReposQuery } from "@/features/github";
import { getPortfolioListQueryKey } from "@/features/portfolio";
import {
  cancelDetectStacksJob,
  startDetectStacksJob,
  useDetectStacksJobSelector
} from "@/features/stacks";

import { EntityFormSheet } from "@/pages/dashboard/_lib/entity-form-panel";
import { setDetectStacksFormMergeHandler } from "@/pages/dashboard/projects/_lib/detect-stacks-form-bridge";

type ProjectFormSeed = { id: string } | ProjectOutput;

type ProjectFormProps = {
  initialData?: ProjectFormSeed | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (id: string) => void;
};

function isProjectOutput(data: ProjectFormSeed): data is ProjectOutput {
  return "title" in data;
}

const PROJECT_LOGO_UPLOAD_LABELS = {
  empty: "Upload logo",
  change: "Change logo",
  ariaUpload: "Upload project logo",
  ariaRemove: "Remove project logo",
  persistError: "Could not update project logo",
  uploadError: "Could not upload project logo"
} as const;

export function ProjectForm({ initialData, open, onOpenChange, onSaved }: ProjectFormProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(initialData?.id);
  const id = initialData?.id;
  const seed = initialData && isProjectOutput(initialData) ? initialData : undefined;

  const projectQuery = useQuery({
    ...orpcQueryClient.projects.get.queryOptions({
      input: { id: id! }
    }),
    enabled: isEdit && open,
    placeholderData: seed
  });
  const project = projectQuery.data;

  const experiencesQuery = useQuery({
    ...orpcQueryClient.experiences.list.queryOptions(),
    enabled: open
  });
  const stacksQuery = useQuery({
    ...orpcQueryClient.stacks.list.queryOptions(),
    enabled: open
  });
  // Dashboard form: session user's private repos only.
  const reposQuery = useGetGithubProfileReposQuery("me", true, open);
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
      onSuccess: async (created) => {
        await invalidateProjectsListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
        });
        toast.success("Project created.");
        onSaved?.(created.id);
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to create project.");
      }
    })
  );

  const updateMutation = useMutation(
    orpcQueryClient.projects.update.mutationOptions({
      onSuccess: async (updated) => {
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
        onSaved?.(updated?.id ?? id!);
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to update project.");
      }
    })
  );

  const form = useAppForm({
    defaultValues: {
      title: seed?.title ?? "",
      year: seed?.year ?? new Date().getFullYear(),
      summary: seed?.summary ?? "",
      description: seed?.description ?? "",
      analysis: seed?.analysis ?? "",
      logo: seed?.logo ?? "",
      repos: (seed?.repos ?? []) as string[],
      demoUrl: seed?.demoUrl ?? "",
      isPresent: seed?.isPresent ?? false,
      stackIds: (seed?.stacks.map((s) => s.id) ?? []) as string[],
      includedInPortfolio: !!seed?.portfolioEntryId
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

  // Reset once per open/id. Skip later `project` identity changes so detect-stacks keeps stackIds.
  const projectIdKey = id ?? "new";
  const resetKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      resetKeyRef.current = null;
      return;
    }
    const source = seed ?? project ?? null;
    if (isEdit && (!source || !source.title)) return;
    if (resetKeyRef.current === projectIdKey) return;
    resetKeyRef.current = projectIdKey;
    if (source) {
      form.reset({
        title: source.title,
        year: source.year,
        summary: source.summary ?? "",
        description: source.description ?? "",
        analysis: source.analysis ?? "",
        logo: source.logo ?? "",
        repos: source.repos ?? [],
        demoUrl: source.demoUrl ?? "",
        isPresent: source.isPresent,
        stackIds: source.stacks.map((s) => s.id),
        includedInPortfolio: !!source.portfolioEntryId
      });
      setSelectedExperienceId(source.experienceId ?? null);
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
  }, [open, projectIdKey, isEdit, form, seed, project]);

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

  const showLoader = isEdit && projectQuery.isLoading && !project;
  const showMissing = isEdit && !projectQuery.isLoading && !project;

  return (
    <EntityFormSheet
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
      title={isEdit ? "Edit Project" : "New Project"}
      description={isEdit ? "Update your project details." : "Add a new project to your portfolio."}
      updatedAt={project?.updatedAt}
      createdAt={project?.createdAt}
      actions={
        <form.AppForm>
          <SubmitButton
            type="button"
            size="sm"
            actionLabel={isEdit ? "Save" : "Create"}
            isLoading={busy}
            submitFailed={createMutation.isError || updateMutation.isError}
            resetKey={`${open}:${id ?? "new"}`}
            onClick={() => void form.handleSubmit()}
          />
        </form.AppForm>
      }
    >
      {showLoader ? (
        <AiLoader />
      ) : showMissing ? (
        <div className="py-8 text-center text-muted-foreground">Project not found.</div>
      ) : (
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
              {(field) => (
                <field.AvatarUploadField
                  key={`${open}:${projectIdKey}`}
                  label="Project logo"
                  description="Shown next to the project title on your public portfolio."
                  shape="rounded"
                  emptyIcon={ImageIcon}
                  labels={PROJECT_LOGO_UPLOAD_LABELS}
                />
              )}
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
              {(field) => <field.UrlField label="Demo URL" placeholder="example.com" />}
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
                        {/*
                        Chips sit in a rounded frame. Detect stacks bleeds over that
                        frame (no clip, no radius) so the footer is square and full-bleed.
                      */}
                        <div
                          role="group"
                          aria-label="Project stacks"
                          className="relative flex w-full min-w-0 flex-col"
                        >
                          <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-lg border border-input bg-background shadow-xs/5 not-dark:bg-clip-padding dark:bg-input/32">
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
                                chips:
                                  "rounded-none border-0 bg-transparent shadow-none before:hidden focus-within:border-transparent focus-within:ring-0 dark:bg-transparent"
                              }}
                              placeholder="Select stacks..."
                              emptyMessage="No stacks found."
                            />
                          </div>
                          <AiFlowTrigger
                            idleLabel="Detect stacks"
                            icon={<SparklesIcon aria-hidden />}
                            running={isDetectRunningForThis}
                            stepLabel={detectStepLabel}
                            runningFallback="Detecting…"
                            onStart={handleStartDetect}
                            onCancel={() => cancelDetectStacksJob()}
                            disabled={!canDetect}
                            layout="stretch"
                            className="relative z-10 -mx-px -mt-px w-[calc(100%+2px)]"
                          />
                        </div>
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
      )}
    </EntityFormSheet>
  );
}
