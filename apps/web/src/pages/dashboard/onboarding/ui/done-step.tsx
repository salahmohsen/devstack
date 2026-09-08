"use client";

import { Link } from "@tanstack/react-router";
import {
  BriefcaseIcon,
  CheckCircle2Icon,
  FolderKanbanIcon,
  LayersIcon,
  LayoutDashboardIcon,
  FileUpIcon,
  SparklesIcon
} from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";

import { ConnectAiCard, useGetAiSettingsQuery } from "@/features/ai-settings";
import { useSkipOnboardingMutation, type OnboardingApplySummary } from "@/features/onboarding";

export type DoneStepProps = {
  summary?: OnboardingApplySummary | null;
  skipped?: boolean;
  /** False when the user skipped Connect AI — shows the cross-sell card. */
  aiConfigured: boolean;
  onAiConfigured: () => void;
  onImportAnother?: () => void;
};

export function DoneStep({
  summary,
  skipped,
  aiConfigured,
  onAiConfigured,
  onImportAnother
}: DoneStepProps) {
  const skipMutation = useSkipOnboardingMutation();
  const settingsQuery = useGetAiSettingsQuery();
  const marked = useRef(false);

  useEffect(() => {
    if (!skipped || marked.current) return;
    marked.current = true;
    void skipMutation.mutateAsync({}).catch(() => {
      marked.current = false;
    });
  }, [skipped, skipMutation]);

  const hasImports =
    summary &&
    (summary.experiences > 0 ||
      summary.projects > 0 ||
      summary.stacks > 0 ||
      summary.educations > 0 ||
      summary.certifications > 0);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 py-4">
      <Empty className="w-full rounded-xl border border-border/80 bg-card px-6 py-12 shadow-xs/5">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-success/10 text-success">
            <CheckCircle2Icon className="size-5" aria-hidden />
          </EmptyMedia>
          <EmptyTitle>You’re ready</EmptyTitle>
          <EmptyDescription>
            {hasImports
              ? `Imported ${summary.experiences} experience${summary.experiences === 1 ? "" : "s"}, ${summary.projects} project${summary.projects === 1 ? "" : "s"}, ${summary.stacks} stack${summary.stacks === 1 ? "" : "s"}, ${summary.educations} education ${summary.educations === 1 ? "entry" : "entries"}, and ${summary.certifications} certification${summary.certifications === 1 ? "" : "s"}. Job filters and connections can be changed anytime in Settings.`
              : skipped
                ? "You can import a resume later from the sidebar. Job filters and connections are in Settings."
                : "Your portfolio is ready. Refine experiences, projects, and stacks from the dashboard."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center gap-2">
          {hasImports ? (
            <>
              <Button render={<Link to="/dashboard/experiences" />} variant="outline" size="sm">
                <BriefcaseIcon />
                Experiences
              </Button>
              <Button render={<Link to="/dashboard/projects" />} variant="outline" size="sm">
                <FolderKanbanIcon />
                Projects
              </Button>
              <Button render={<Link to="/dashboard/skills" />} variant="outline" size="sm">
                <LayersIcon />
                Skills
              </Button>
            </>
          ) : null}
          {onImportAnother ? (
            <Button type="button" variant="outline" size="sm" onClick={onImportAnother}>
              <FileUpIcon />
              Import a resume
            </Button>
          ) : null}
          <Button render={<Link to="/dashboard/agent" />} size="sm">
            <LayoutDashboardIcon />
            Open dashboard
          </Button>
        </EmptyContent>
      </Empty>

      {/* Cross-sell only when Connect AI was skipped — same card as step 1. */}
      {!aiConfigured ? (
        <section
          aria-label="Connect an AI provider"
          className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]"
        >
          <div className="space-y-0.5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
              <SparklesIcon className="size-4 text-primary" aria-hidden />
              Connect an AI provider
            </h3>
            <p className="text-xs text-muted-foreground">
              Powers the hub assistant, mail classification, and apply packages.
            </p>
          </div>
          <ConnectAiCard
            providers={settingsQuery.data?.providers ?? []}
            continueLabel="Connect provider"
            onConfigured={onAiConfigured}
            className="max-w-none border-0 bg-transparent p-0 shadow-none"
          />
        </section>
      ) : null}
    </div>
  );
}
