"use client";

import { useQuery } from "@tanstack/react-query";
import { PencilIcon, TriangleAlertIcon } from "lucide-react";
import { useMemo, type Dispatch, type SetStateAction } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  type ApplicationOutput,
  type ApplyPackageDraft,
  type ApplyPackageExperienceDraft,
  type ApplyPackageProjectDraft,
  type ApplyPackageStackDraft
} from "@tsu-stack/core";
import { Alert, AlertAction, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import { Input } from "@tsu-stack/ui/components/input";
import { Switch } from "@tsu-stack/ui/components/switch";
import { Textarea } from "@tsu-stack/ui/components/textarea";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  buildApplyPackageDocPreview,
  type ApplyPackageLiveRows
} from "@/shared/resume-doc-preview/apply-doc-preview-model";
import { ResumeDocCompactStrip } from "@/shared/resume-doc-preview/resume-doc-compact-strip";
import {
  ResumeDocPreview,
  type ResumeDocEditHandlers
} from "@/shared/resume-doc-preview/resume-doc-preview";

import { getProfileQueryOptions } from "@/features/profile";

export type ApplyPackageResumePaneProps = {
  application: ApplicationOutput;
  /** Local draft under edit; null for legacy accepted packages without a draft. */
  draft: ApplyPackageDraft | null;
  /** Non-null by contract — the dialog guards the null-draft cases. */
  onDraftChange: Dispatch<SetStateAction<ApplyPackageDraft>>;
  busy: boolean;
};

const CHIP_PILL =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap";

/** Flat textareas for the compact (below-lg) editors — old sheet semantics. */
function bulletsToText(bullets: string[]): string {
  return bullets.join("\n");
}

function textToBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

/** Resume paper of the review dialog: tailored document + include toggles + evidence hover. */
export function ApplyPackageResumePane({
  application,
  draft,
  onDraftChange,
  busy
}: ApplyPackageResumePaneProps) {
  const hasDraft = draft != null;

  const experiencesQuery = useQuery({
    ...orpcQueryClient.experiences.list.queryOptions(),
    enabled: hasDraft
  });
  const projectsQuery = useQuery({
    ...orpcQueryClient.projects.list.queryOptions(),
    enabled: hasDraft
  });
  const stacksQuery = useQuery({
    ...orpcQueryClient.stacks.list.queryOptions(),
    enabled: hasDraft
  });
  const educationsQuery = useQuery({
    ...orpcQueryClient.educations.list.queryOptions(),
    enabled: hasDraft
  });
  const certificationsQuery = useQuery({
    ...orpcQueryClient.certifications.list.queryOptions(),
    enabled: hasDraft
  });
  const profileQuery = useQuery({ ...getProfileQueryOptions(), enabled: hasDraft });
  const jobPreferenceQuery = useQuery({
    ...orpcQueryClient.jobPreference.get.queryOptions(),
    enabled: hasDraft
  });

  const queriesPending =
    experiencesQuery.isPending ||
    projectsQuery.isPending ||
    stacksQuery.isPending ||
    educationsQuery.isPending ||
    certificationsQuery.isPending ||
    profileQuery.isPending ||
    jobPreferenceQuery.isPending;

  // A failed portfolio query must never render as "Not on this resume" —
  // block the preview and surface the failure instead.
  const queriesErrored =
    experiencesQuery.isError ||
    projectsQuery.isError ||
    stacksQuery.isError ||
    educationsQuery.isError ||
    certificationsQuery.isError ||
    profileQuery.isError ||
    jobPreferenceQuery.isError;

  function retryPortfolioQueries() {
    void experiencesQuery.refetch();
    void projectsQuery.refetch();
    void stacksQuery.refetch();
    void educationsQuery.refetch();
    void certificationsQuery.refetch();
    void profileQuery.refetch();
    void jobPreferenceQuery.refetch();
  }

  const reviewApplyKit = jobPreferenceQuery.data?.reviewApplyKit ?? true;

  const liveRows = useMemo<ApplyPackageLiveRows | null>(() => {
    if (queriesPending || queriesErrored) return null;
    return {
      profile: {
        name: profileQuery.data?.name ?? "Candidate",
        email: profileQuery.data?.email ?? "",
        summary: profileQuery.data?.summary ?? null
      },
      contacts: profileQuery.data?.contacts ?? [],
      experiences: experiencesQuery.data ?? [],
      projects: projectsQuery.data ?? [],
      stacks: stacksQuery.data ?? [],
      educations: educationsQuery.data ?? [],
      certifications: certificationsQuery.data ?? []
    };
  }, [
    queriesPending,
    queriesErrored,
    profileQuery.data,
    experiencesQuery.data,
    projectsQuery.data,
    stacksQuery.data,
    educationsQuery.data,
    certificationsQuery.data
  ]);

  const preview = useMemo(() => {
    if (!draft || !liveRows) return null;
    return buildApplyPackageDocPreview(draft, liveRows, {
      reviewApplyKit,
      jobSkills: [...(application.requiredSkills ?? []), ...(application.preferredSkills ?? [])]
    });
  }, [draft, liveRows, reviewApplyKit, application.requiredSkills, application.preferredSkills]);

  const includeByClientId = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (draft) {
      for (const exp of draft.experiences) map[exp.experienceId] = exp.include;
      for (const project of draft.projects) map[project.projectId] = project.include;
    }
    return map;
  }, [draft]);

  /** Draft-owned counts for the pane bar; page-budget hides annotate on top. */
  const counts = useMemo(() => {
    if (!draft) return null;
    return {
      experiences: draft.experiences.filter((exp) => exp.include).length,
      experiencesTotal: draft.experiences.length,
      projects: draft.projects.filter((project) => project.include).length,
      projectsTotal: draft.projects.length,
      stacks: draft.stacks.filter((stack) => stack.include).length,
      stacksTotal: draft.stacks.length
    };
  }, [draft]);

  const hiddenCount = preview ? preview.hiddenExperienceCount + preview.hiddenProjectCount : 0;

  const portfolioErrorRow = queriesErrored ? (
    <Alert variant="error">
      <TriangleAlertIcon />
      <AlertTitle className="min-w-0">
        Couldn&apos;t load your portfolio data — the paper may be incomplete.
      </AlertTitle>
      <AlertAction>
        <Button variant="outline" size="sm" type="button" onClick={retryPortfolioQueries}>
          Retry
        </Button>
      </AlertAction>
    </Alert>
  ) : null;

  function updateDraft(patch: Partial<ApplyPackageDraft>) {
    onDraftChange((prev) => {
      return { ...prev, ...patch };
    });
  }

  function updateExperience(experienceId: string, patch: Partial<ApplyPackageExperienceDraft>) {
    onDraftChange((prev) => {
      return {
        ...prev,
        experiences: prev.experiences.map((exp) =>
          exp.experienceId === experienceId ? { ...exp, ...patch } : exp
        )
      };
    });
  }

  function updateProject(projectId: string, patch: Partial<ApplyPackageProjectDraft>) {
    onDraftChange((prev) => {
      return {
        ...prev,
        projects: prev.projects.map((project) =>
          project.projectId === projectId ? { ...project, ...patch } : project
        )
      };
    });
  }

  function updateStack(stackId: string, patch: Partial<ApplyPackageStackDraft>) {
    onDraftChange((prev) => {
      return {
        ...prev,
        stacks: prev.stacks.map((stack) =>
          stack.stackId === stackId ? { ...stack, ...patch } : stack
        )
      };
    });
  }

  function handleIncludeChange(clientId: string, include: boolean) {
    onDraftChange((prev) => {
      if (prev.experiences.some((exp) => exp.experienceId === clientId)) {
        return {
          ...prev,
          experiences: prev.experiences.map((exp) =>
            exp.experienceId === clientId ? { ...exp, include } : exp
          )
        };
      }
      return {
        ...prev,
        projects: prev.projects.map((project) =>
          project.projectId === clientId ? { ...project, include } : project
        )
      };
    });
  }

  // Paper skill stubs carry the live stack name — map back to the draft row id.
  function handleStackIncludeChange(name: string, include: boolean) {
    const stackId = (stacksQuery.data ?? []).find((stack) => stack.name === name)?.id;
    if (!stackId) return;
    updateStack(stackId, { include });
  }

  // Identity (name/org/title/dates) is live-owned — paper edits there no-op;
  // the rewritten text fields (headline, summary, bullets, project summary)
  // commit into the draft.
  const paperEdit: ResumeDocEditHandlers = {
    onProfileChange: () => undefined,
    onSummaryChange: (text) => updateDraft({ professionalSummary: text || null }),
    onExperienceChange: () => undefined,
    onEducationChange: () => undefined,
    onProjectChange: () => undefined,
    onBulletsChange: (clientId, lines) => {
      onDraftChange((prev) => {
        if (prev.experiences.some((exp) => exp.experienceId === clientId)) {
          return {
            ...prev,
            experiences: prev.experiences.map((exp) =>
              exp.experienceId === clientId ? { ...exp, rewrittenBullets: lines } : exp
            )
          };
        }
        return {
          ...prev,
          projects: prev.projects.map((project) =>
            project.projectId === clientId ? { ...project, rewrittenBullets: lines } : project
          )
        };
      });
    },
    onProjectSummaryChange: (projectId, text) =>
      updateProject(projectId, { rewrittenSummary: text }),
    onHeadlineChange: (text) => updateDraft({ headline: text })
  };

  // Draft retention shipped after this kit was accepted — editing requires a re-prepare.
  if (draft == null && application.resumeId != null) {
    return (
      <div className="grid h-full place-items-center p-6">
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          The last draft predates draft retention — prepare the package again to edit the tailored
          resume.
        </p>
      </div>
    );
  }

  if (draft == null) {
    return (
      <div className="grid h-full place-items-center p-6">
        <p className="text-sm text-muted-foreground">
          No draft to edit — prepare the package again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={cn(
              CHIP_PILL,
              "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
            )}
          >
            Tailored for this role
          </span>
          {counts ? (
            <span className={cn(CHIP_PILL, "bg-muted text-muted-foreground tabular-nums")}>
              Experiences {counts.experiences}/{counts.experiencesTotal} · Projects{" "}
              {counts.projects}/{counts.projectsTotal} · Skills {counts.stacks}/{counts.stacksTotal}
              {hiddenCount > 0 ? (
                <span className="font-normal text-muted-foreground/70">
                  {" "}
                  · {hiddenCount} hidden to fit pages
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
        <span
          className={cn(
            CHIP_PILL,
            "hidden bg-muted/60 font-medium text-muted-foreground sm:inline-flex"
          )}
        >
          <PencilIcon className="size-3" aria-hidden />
          Click any text on the paper to edit
        </span>
      </div>

      {/* lg+ — paper-first: the pane owns the scroll, the paper sits centered. */}
      <div className="hidden min-h-0 flex-1 justify-center overflow-y-auto bg-muted/40 px-6 py-6 lg:flex">
        <div className="w-full max-w-160">
          {portfolioErrorRow ??
            (preview ? (
              <ResumeDocPreview
                model={preview.model}
                edit={paperEdit}
                evidenceByClientId={preview.evidenceByClientId}
                includeByClientId={includeByClientId}
                onIncludeChange={handleIncludeChange}
                onStackIncludeChange={handleStackIncludeChange}
                className="motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0"
              />
            ) : (
              <ResumeDocPreview skeleton className="mx-auto max-w-160" />
            ))}
        </div>
      </div>

      {/* below-lg — compact strip + stacked editors (old sheet commit semantics). */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:hidden">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {portfolioErrorRow}
          <ResumeDocCompactStrip model={preview?.model} />

          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background p-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="apply-resume-headline"
                className="text-xs font-semibold text-muted-foreground"
              >
                Headline
              </label>
              <Input
                id="apply-resume-headline"
                value={draft.headline ?? ""}
                disabled={busy}
                placeholder="Target role line (optional)"
                onChange={(e) => updateDraft({ headline: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="apply-resume-summary"
                className="text-xs font-semibold text-muted-foreground"
              >
                Professional summary
              </label>
              <Textarea
                id="apply-resume-summary"
                rows={4}
                value={draft.professionalSummary ?? ""}
                disabled={busy}
                onChange={(e) => updateDraft({ professionalSummary: e.target.value || null })}
              />
            </div>
          </div>

          {draft.experiences.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              <p className="px-0.5 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                Experience
              </p>
              {draft.experiences.map((exp) => {
                const switchId = `exp-include-${exp.experienceId}`;
                return (
                  <div
                    key={exp.experienceId}
                    className={cn(
                      "flex flex-col gap-2 rounded-xl border p-3.5",
                      exp.include
                        ? "border-border bg-background"
                        : "border-border/50 bg-muted/20 opacity-70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{exp.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{exp.companyName}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        <span id={`${switchId}-label`}>Include</span>
                        <Switch
                          id={switchId}
                          checked={exp.include}
                          disabled={busy}
                          aria-label={`Include ${exp.title} on the resume`}
                          aria-labelledby={`${switchId}-label`}
                          onCheckedChange={(checked) =>
                            updateExperience(exp.experienceId, { include: checked })
                          }
                        />
                      </div>
                    </div>
                    <Textarea
                      rows={Math.max(3, exp.rewrittenBullets.length || 3)}
                      value={bulletsToText(exp.rewrittenBullets)}
                      disabled={busy || !exp.include}
                      placeholder="One bullet per line"
                      aria-label={`Bullets for ${exp.title}`}
                      onChange={(e) =>
                        updateExperience(exp.experienceId, {
                          rewrittenBullets: textToBullets(e.target.value)
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          {draft.projects.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              <p className="px-0.5 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                Projects
              </p>
              {draft.projects.map((project) => {
                const switchId = `project-include-${project.projectId}`;
                return (
                  <div
                    key={project.projectId}
                    className={cn(
                      "flex flex-col gap-2 rounded-xl border p-3.5",
                      project.include
                        ? "border-border bg-background"
                        : "border-border/50 bg-muted/20 opacity-70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium">{project.name}</p>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        <span id={`${switchId}-label`}>Include</span>
                        <Switch
                          id={switchId}
                          checked={project.include}
                          disabled={busy}
                          aria-label={`Include ${project.name} on the resume`}
                          aria-labelledby={`${switchId}-label`}
                          onCheckedChange={(checked) =>
                            updateProject(project.projectId, { include: checked })
                          }
                        />
                      </div>
                    </div>
                    <Textarea
                      rows={3}
                      value={project.rewrittenSummary}
                      disabled={busy || !project.include}
                      placeholder="Project summary"
                      aria-label={`Summary for ${project.name}`}
                      onChange={(e) =>
                        updateProject(project.projectId, { rewrittenSummary: e.target.value })
                      }
                    />
                    {project.rewrittenBullets != null ? (
                      <Textarea
                        rows={Math.max(2, project.rewrittenBullets.length || 2)}
                        value={bulletsToText(project.rewrittenBullets)}
                        disabled={busy || !project.include}
                        placeholder="Optional bullets, one per line"
                        aria-label={`Bullets for ${project.name}`}
                        onChange={(e) =>
                          updateProject(project.projectId, {
                            rewrittenBullets: textToBullets(e.target.value)
                          })
                        }
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {draft.stacks.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="px-0.5 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                Skills / stacks
              </p>
              <div className="flex flex-wrap gap-2">
                {draft.stacks.map((stack) => {
                  const switchId = `stack-include-${stack.stackId}`;
                  return (
                    <div
                      key={stack.stackId}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
                        stack.include
                          ? "border-border bg-background"
                          : "border-border/50 bg-muted/20 opacity-70"
                      )}
                    >
                      <Switch
                        id={switchId}
                        checked={stack.include}
                        disabled={busy}
                        aria-label={`Include ${stack.name}`}
                        onCheckedChange={(checked) =>
                          updateStack(stack.stackId, { include: checked })
                        }
                        className="[--thumb-size:--spacing(3)]"
                      />
                      <span id={`${switchId}-label`}>{stack.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
