"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  type ApplicationOutput,
  type ApplyPackageDraft,
  type ApplyPackageExperienceDraft,
  type ApplyPackageProjectDraft,
  type ApplyPackageStackDraft
} from "@tsu-stack/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { Field, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle
} from "@tsu-stack/ui/components/sheet";
import { Switch } from "@tsu-stack/ui/components/switch";
import { Textarea } from "@tsu-stack/ui/components/textarea";
import { cn } from "@tsu-stack/ui/lib/utils";

import { FileDiff } from "@/shared/ui/agents/file-diff";

import {
  experienceMasterMarkdown,
  experienceSnapshotMarkdown,
  parseApplyPackageDraft,
  projectMasterMarkdown,
  projectSnapshotMarkdown,
  snapshotFileDiffLines,
  useAcceptApplyPackageMutation,
  useGenerateApplyPackageMutation
} from "@/features/applications";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";

type ApplyPackageSheetProps = {
  open: boolean;
  application: ApplicationOutput | null;
  onOpenChange: (open: boolean) => void;
};

function cloneDraft(draft: ApplyPackageDraft): ApplyPackageDraft {
  return structuredClone(draft);
}

function bulletsToText(bullets: string[]): string {
  return bullets.join("\n");
}

function textToBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

type ApplyPackageSheetFormProps = {
  application: ApplicationOutput;
  initialDraft: ApplyPackageDraft;
  onClose: () => void;
  busy: boolean;
  acceptPending: boolean;
  generatePending: boolean;
  onAccept: (draft: ApplyPackageDraft) => void;
  onRegenerate: () => void;
};

function SnapshotDiff({
  file,
  master,
  snapshot
}: {
  file: string;
  master: string;
  snapshot: string;
}) {
  const lines = snapshotFileDiffLines(master, snapshot);
  if (!lines) return null;
  return (
    <FileDiff
      file={file}
      lines={lines}
      status="complete"
      defaultOpen
      collapseOnComplete={false}
      language="text"
      copyText={snapshot}
      copyLabel="Copy suggestion"
      maxHeight={280}
      className="w-full min-w-0"
    />
  );
}

function ApplyPackageSheetForm({
  application,
  initialDraft,
  onClose,
  busy,
  acceptPending,
  generatePending,
  onAccept,
  onRegenerate
}: ApplyPackageSheetFormProps) {
  const [draft, setDraft] = useState(() => cloneDraft(initialDraft));
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const experiencesQuery = useQuery(orpcQueryClient.experiences.list.queryOptions());
  const projectsQuery = useQuery(orpcQueryClient.projects.list.queryOptions());
  const experienceById = useMemo(
    () => new Map((experiencesQuery.data ?? []).map((row) => [row.id, row] as const)),
    [experiencesQuery.data]
  );
  const projectById = useMemo(
    () => new Map((projectsQuery.data ?? []).map((row) => [row.id, row] as const)),
    [projectsQuery.data]
  );

  function updateDraft(patch: Partial<ApplyPackageDraft>) {
    setDraft((prev) => {
      return { ...prev, ...patch };
    });
  }

  function updateExperience(experienceId: string, patch: Partial<ApplyPackageExperienceDraft>) {
    setDraft((prev) => {
      return {
        ...prev,
        experiences: prev.experiences.map((exp) =>
          exp.experienceId === experienceId ? { ...exp, ...patch } : exp
        )
      };
    });
  }

  function updateProject(projectId: string, patch: Partial<ApplyPackageProjectDraft>) {
    setDraft((prev) => {
      return {
        ...prev,
        projects: prev.projects.map((project) =>
          project.projectId === projectId ? { ...project, ...patch } : project
        )
      };
    });
  }

  function updateStack(stackId: string, patch: Partial<ApplyPackageStackDraft>) {
    setDraft((prev) => {
      return {
        ...prev,
        stacks: prev.stacks.map((stack) =>
          stack.stackId === stackId ? { ...stack, ...patch } : stack
        )
      };
    });
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Review apply package</SheetTitle>
        <SheetDescription className="truncate">
          {application.companyName} · {application.title}
        </SheetDescription>
      </SheetHeader>

      <SheetPanel className="min-h-0 flex-1 space-y-6">
        <section className="space-y-2" aria-labelledby="apply-job-context-heading">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="apply-job-context-heading" className="text-sm font-semibold">
              Job used for this package
            </h3>
            {draft.jobContext.listingFetched ? (
              <Badge variant="secondary" size="sm">
                Listing page included
              </Badge>
            ) : null}
          </div>
          <p className="text-sm font-medium text-foreground">
            {draft.jobContext.companyName} · {draft.jobContext.title}
          </p>
          {draft.jobContext.listingUrl ? (
            <p className="text-xs text-muted-foreground">
              <a
                href={draft.jobContext.listingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Open listing URL
              </a>
            </p>
          ) : null}
          {draft.jobContext.descriptionUsed.trim().length > 0 ? (
            <details className="group rounded-md border border-border/60 bg-muted/20">
              <summary
                className={cn(
                  "cursor-pointer list-none px-3 py-2 text-sm font-medium text-muted-foreground",
                  "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  "[&::-webkit-details-marker]:hidden"
                )}
              >
                Description used for generation
                <span className="ms-1.5 font-normal text-muted-foreground/80 group-open:hidden">
                  (show)
                </span>
                <span className="ms-1.5 hidden font-normal text-muted-foreground/80 group-open:inline">
                  (hide)
                </span>
              </summary>
              <div className="max-h-56 overflow-auto border-t border-border/50 px-3 py-2">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {draft.jobContext.descriptionUsed}
                </p>
              </div>
            </details>
          ) : (
            <p className="text-sm text-muted-foreground">
              No job description was available when this package was generated.
            </p>
          )}
        </section>

        {draft.notes != null ? (
          <section className="space-y-2" aria-labelledby="apply-ai-notes-heading">
            <div className="space-y-0.5">
              <h3 id="apply-ai-notes-heading" className="text-sm font-semibold">
                AI notes
              </h3>
              <p className="text-xs text-muted-foreground">
                Reviewer commentary from the model — not the job posting.
              </p>
            </div>
            <Field>
              <FieldLabel htmlFor="apply-ai-notes" className="sr-only">
                AI notes
              </FieldLabel>
              <Textarea
                id="apply-ai-notes"
                value={draft.notes}
                disabled={busy}
                rows={4}
                className="min-h-20 text-sm"
                onChange={(e) => updateDraft({ notes: e.target.value })}
              />
            </Field>
          </section>
        ) : null}

        <Field>
          <FieldLabel htmlFor="apply-recruiter-email">Recruiter email</FieldLabel>
          <Input
            id="apply-recruiter-email"
            type="email"
            autoComplete="email"
            placeholder="recruiter@company.com"
            value={draft.proposedRecruiterEmail ?? ""}
            disabled={busy}
            onChange={(e) =>
              updateDraft({
                proposedRecruiterEmail: e.target.value || null
              })
            }
          />
        </Field>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Resume</h3>
          <Field>
            <FieldLabel htmlFor="apply-headline">Headline</FieldLabel>
            <Input
              id="apply-headline"
              value={draft.headline ?? ""}
              disabled={busy}
              placeholder="Target role line (optional)"
              onChange={(e) => updateDraft({ headline: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="apply-summary">Professional summary</FieldLabel>
            <Textarea
              id="apply-summary"
              rows={4}
              value={draft.professionalSummary ?? ""}
              disabled={busy}
              onChange={(e) =>
                updateDraft({
                  professionalSummary: e.target.value || null
                })
              }
            />
          </Field>

          {draft.experiences.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Experience
              </p>
              {draft.experiences.map((exp) => {
                const switchId = `exp-include-${exp.experienceId}`;
                return (
                  <div
                    key={exp.experienceId}
                    className={cn(
                      "space-y-2 rounded-lg border p-3",
                      exp.include
                        ? "border-border bg-card"
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
                          aria-labelledby={`${switchId}-label`}
                          onCheckedChange={(checked) =>
                            updateExperience(exp.experienceId, { include: checked })
                          }
                        />
                      </div>
                    </div>
                    {(() => {
                      const live = experienceById.get(exp.experienceId);
                      if (!live) return null;
                      return (
                        <SnapshotDiff
                          file={`${exp.title}.md`}
                          master={experienceMasterMarkdown({
                            title: live.title,
                            organization: live.organization,
                            description: live.description
                          })}
                          snapshot={experienceSnapshotMarkdown({
                            // Same identity as master so only rewritten bullets show as edits.
                            title: live.title,
                            companyName: live.organization,
                            rewrittenBullets: exp.rewrittenBullets
                          })}
                        />
                      );
                    })()}
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
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Projects
              </p>
              {draft.projects.map((project) => {
                const switchId = `project-include-${project.projectId}`;
                return (
                  <div
                    key={project.projectId}
                    className={cn(
                      "space-y-2 rounded-lg border p-3",
                      project.include
                        ? "border-border bg-card"
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
                          aria-labelledby={`${switchId}-label`}
                          onCheckedChange={(checked) =>
                            updateProject(project.projectId, { include: checked })
                          }
                        />
                      </div>
                    </div>
                    {(() => {
                      const live = projectById.get(project.projectId);
                      if (!live) return null;
                      return (
                        <SnapshotDiff
                          file={`${project.name}.md`}
                          master={projectMasterMarkdown({
                            title: live.title,
                            summary: live.summary,
                            description: live.description
                          })}
                          snapshot={projectSnapshotMarkdown({
                            // Same identity as master so only rewritten body shows as edits.
                            name: live.title,
                            rewrittenSummary: project.rewrittenSummary,
                            rewrittenBullets: project.rewrittenBullets
                          })}
                        />
                      );
                    })()}
                    <Textarea
                      rows={3}
                      value={project.rewrittenSummary}
                      disabled={busy || !project.include}
                      placeholder="Project summary"
                      aria-label={`Summary for ${project.name}`}
                      onChange={(e) =>
                        updateProject(project.projectId, {
                          rewrittenSummary: e.target.value
                        })
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
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
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
                          ? "border-border bg-card"
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
        </section>

        <Field>
          <FieldLabel htmlFor="apply-cover">
            Cover letter
            <span className="ms-1 font-normal text-muted-foreground">
              (PDF generated on Accept)
            </span>
          </FieldLabel>
          <Textarea
            id="apply-cover"
            rows={8}
            value={draft.coverLetterBody}
            disabled={busy}
            onChange={(e) => updateDraft({ coverLetterBody: e.target.value })}
          />
        </Field>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Recruiter outreach</h3>
          <Field>
            <FieldLabel htmlFor="apply-outreach-subject">Subject</FieldLabel>
            <Input
              id="apply-outreach-subject"
              value={draft.outreachSubject}
              disabled={busy}
              onChange={(e) => updateDraft({ outreachSubject: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="apply-outreach-body">Body</FieldLabel>
            <Textarea
              id="apply-outreach-body"
              rows={6}
              value={draft.outreachBody}
              disabled={busy}
              onChange={(e) => updateDraft({ outreachBody: e.target.value })}
            />
          </Field>
        </section>
      </SheetPanel>

      <SheetFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => setRegenerateOpen(true)}
        >
          Regenerate
        </Button>
        <div className="flex gap-2 sm:justify-end">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy}
            loading={acceptPending}
            onClick={() => onAccept(draft)}
          >
            Accept package
          </Button>
        </div>
      </SheetFooter>

      <AlertDialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate apply package?</AlertDialogTitle>
            <AlertDialogDescription>
              This runs AI again and overwrites the current draft. Your accepted resume and cover
              letter stay until you Accept a new package. Uses your BYO model quota.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={generatePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              loading={generatePending}
              onClick={() => {
                onRegenerate();
                setRegenerateOpen(false);
              }}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ApplyPackageSheet({ open, application, onOpenChange }: ApplyPackageSheetProps) {
  const acceptMutation = useAcceptApplyPackageMutation();
  const generateMutation = useGenerateApplyPackageMutation();
  const { markApplyPackageInFlight } = useApplicationStore();

  const serverDraft = useMemo(
    () => (application ? parseApplyPackageDraft(application.applyPackageDraft) : null),
    [application]
  );

  const busy = acceptMutation.isPending || generateMutation.isPending;
  const draftKey =
    serverDraft != null ? `${serverDraft.applicationId}:${serverDraft.generatedAt}` : "none";

  function handleAccept(draft: ApplyPackageDraft) {
    if (!application) return;
    const applicationId = application.id;
    markApplyPackageInFlight(applicationId, true);
    acceptMutation.mutate(
      {
        applicationId,
        draft: {
          ...draft,
          proposedRecruiterEmail: draft.proposedRecruiterEmail?.trim()
            ? draft.proposedRecruiterEmail.trim()
            : null
        }
      },
      {
        onSuccess: () => onOpenChange(false),
        onSettled: () => markApplyPackageInFlight(applicationId, false)
      }
    );
  }

  function handleRegenerate() {
    if (!application) return;
    const applicationId = application.id;
    markApplyPackageInFlight(applicationId, true);
    generateMutation.mutate(
      { applicationId },
      {
        onSettled: () => markApplyPackageInFlight(applicationId, false)
      }
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
    >
      <SheetPopup className="w-full max-w-xl sm:max-w-xl" side="right" showCloseButton>
        {application && serverDraft ? (
          <ApplyPackageSheetForm
            key={draftKey}
            application={application}
            initialDraft={serverDraft}
            onClose={() => onOpenChange(false)}
            busy={busy}
            acceptPending={acceptMutation.isPending}
            generatePending={generateMutation.isPending}
            onAccept={handleAccept}
            onRegenerate={handleRegenerate}
          />
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>Review apply package</SheetTitle>
              <SheetDescription>
                {application
                  ? `${application.companyName} · ${application.title}`
                  : "Apply package"}
              </SheetDescription>
            </SheetHeader>
            <SheetPanel className="min-h-0 flex-1">
              <p className="text-sm text-muted-foreground">
                No draft available. Prepare an application package first.
              </p>
            </SheetPanel>
            <SheetFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetPopup>
    </Sheet>
  );
}
