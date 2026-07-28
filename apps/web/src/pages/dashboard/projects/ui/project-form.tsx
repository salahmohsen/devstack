"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SparklesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  type DetectStacksResult,
  type ProjectOutput,
  type StackOutput
} from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Form } from "@tsu-stack/ui/components/form";
import { Group } from "@tsu-stack/ui/components/group";
import { Label } from "@tsu-stack/ui/components/label";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { EntityFormSheet } from "@/shared/ui/entity-form-sheet";
import { Icon } from "@/shared/ui/icon";
import { useEntityFormDirty } from "@/shared/ui/use-entity-form-dirty";

import { useGetGithubProfileReposQuery } from "@/features/github";
import { getPortfolioListQueryKey } from "@/features/portfolio";
import { useDetectStacksMutation } from "@/features/stacks";

import { DetectStacksDialog } from "./detect-stacks-dialog";

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
  const [detectDialogOpen, setDetectDialogOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [results, setResults] = useState<DetectStacksResult | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);
  const detectAbortRef = useRef<AbortController | null>(null);

  const detectionHook = useDetectStacksMutation();

  /**
   * Abort in-flight detect-stacks. Call when the detect dialog closes or the
   * parent project form sheet closes — never leave a stream running detached.
   */
  const handleCancelDetect = (options?: { silent?: boolean }) => {
    const controller = detectAbortRef.current;
    if (!controller) {
      setIsDetecting(false);
      setCurrentStep(null);
      return;
    }
    controller.abort();
    detectAbortRef.current = null;
    setIsDetecting(false);
    setCurrentStep(null);
    detectionHook.reset();
    if (!options?.silent) {
      toast.info("Stack detection cancelled.");
    }
  };

  const handleOpenDetectDialog = () => {
    const selectedRepos = form.getFieldValue("repos") ?? [];
    if (selectedRepos.length === 0) {
      toast.error("Select at least one repository first.");
      return;
    }

    detectAbortRef.current?.abort();
    const controller = new AbortController();
    detectAbortRef.current = controller;

    setResults(null);
    setDetectError(null);
    setCurrentStep("Initializing");
    setIsDetecting(true);
    setDetectDialogOpen(true);

    void detectionHook
      .mutateAsync({
        projectId: id ?? "",
        repos: selectedRepos,
        onStepChange: setCurrentStep,
        onPartialResults: setResults,
        signal: controller.signal
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        setResults(result);
        setCurrentStep(null);
      })
      .catch((error: unknown) => {
        const aborted =
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError") ||
          (error instanceof Error && error.name === "AbortError");
        if (aborted) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Stack detection failed. Please try again.";
        console.debug("Stack detection failed:", error);
        setDetectError(message);
        toast.error(message);
        setCurrentStep(null);
      })
      .finally(() => {
        if (detectAbortRef.current === controller) {
          detectAbortRef.current = null;
          setIsDetecting(false);
        }
      });
  };

  const createMutation = useMutation(
    orpcQueryClient.projects.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.projects.list.queryKey()
        });
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
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.projects.list.queryKey()
        });
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

  const handleSheetOpenChange = (next: boolean) => {
    if (!next) {
      handleCancelDetect({ silent: true });
      setDetectDialogOpen(false);
      setResults(null);
      setDetectError(null);
    }
    onOpenChange(next);
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

  const isDirty = useEntityFormDirty(form, open);

  // Parent sheet closed from outside — always stop detect.
  useEffect(() => {
    if (open) return;
    handleCancelDetect({ silent: true });
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect -- sync detect UI to closed form prop
    setDetectDialogOpen(false);
    setResults(null);
    setDetectError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to form open
  }, [open]);

  useEffect(
    () => () => {
      detectAbortRef.current?.abort();
      detectAbortRef.current = null;
    },
    []
  );

  return (
    <>
      <EntityFormSheet
        open={open}
        onOpenChange={handleSheetOpenChange}
        isDirty={isDirty}
        className="max-w-xl sm:max-w-xl"
        title={isEdit ? "Edit Project" : "New Project"}
        description={
          isEdit ? "Update your project details." : "Add a new project to your portfolio."
        }
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
                  {(selectedRepos) => (
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
                        <Button
                          variant="outline"
                          type="button"
                          className="shrink-0"
                          onClick={handleOpenDetectDialog}
                          disabled={!selectedRepos?.length || isDetecting}
                        >
                          <SparklesIcon />
                          {isDetecting ? "Detecting…" : "Detect Stacks"}
                        </Button>
                      </Group>
                      {!selectedRepos?.length ? (
                        <p className="text-xs text-muted-foreground">
                          Select repositories above to enable automatic stack detection.
                        </p>
                      ) : null}
                    </div>
                  )}
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

      <DetectStacksDialog
        open={detectDialogOpen}
        setOpen={(next) => {
          if (!next) {
            handleCancelDetect();
            setResults(null);
            setDetectError(null);
          }
          setDetectDialogOpen(next);
        }}
        onStacksSelected={async (upserted) => {
          const stackIds = upserted.map((s) => s.id);
          const current = form.getFieldValue("stackIds") ?? [];
          const merged = Array.from(new Set([...current, ...stackIds]));
          form.setFieldValue("stackIds", merged);

          const listKey = orpcQueryClient.stacks.list.queryKey();
          queryClient.setQueryData<StackOutput[]>(listKey, (prev) => {
            const existing = prev ?? [];
            const byId = new Map(existing.map((s) => [s.id, s]));
            for (const s of upserted) {
              if (byId.has(s.id)) continue;
              byId.set(s.id, {
                id: s.id,
                name: s.name,
                description: s.description,
                icon: s.icon,
                type: s.type,
                healthStatus: null,
                confidence: null,
                projectCount: 0,
                sortOrder: existing.length,
                portfolioEntryId: null,
                includedInPortfolio: false,
                dependencies: [],
                projects: [],
                updatedAt: new Date(),
                createdAt: new Date()
              });
            }
            return Array.from(byId.values());
          });

          void queryClient.invalidateQueries({ queryKey: listKey });
        }}
        isDetecting={isDetecting}
        currentStep={currentStep}
        results={results}
        error={detectError}
        onCancel={() => handleCancelDetect()}
      />
    </>
  );
}
