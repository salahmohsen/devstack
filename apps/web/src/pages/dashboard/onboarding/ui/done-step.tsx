"use client";

import { Link } from "@tanstack/react-router";
import {
  BriefcaseIcon,
  CheckCircle2Icon,
  FolderKanbanIcon,
  LayersIcon,
  LayoutDashboardIcon,
  FileUpIcon
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

import { useSkipOnboardingMutation } from "@/features/onboarding";

export type DoneStepProps = {
  summary?: { experiences: number; projects: number; stacks: number } | null;
  skipped?: boolean;
  onImportAnother?: () => void;
};

export function DoneStep({ summary, skipped, onImportAnother }: DoneStepProps) {
  const skipMutation = useSkipOnboardingMutation();
  const marked = useRef(false);

  useEffect(() => {
    if (!skipped || marked.current) return;
    marked.current = true;
    void skipMutation.mutateAsync({}).catch(() => {
      marked.current = false;
    });
  }, [skipped, skipMutation]);

  const hasImports =
    summary && (summary.experiences > 0 || summary.projects > 0 || summary.stacks > 0);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center py-4">
      <Empty className="w-full rounded-xl border border-border/80 bg-card px-6 py-12 shadow-xs/5">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-success/10 text-success">
            <CheckCircle2Icon className="size-5" aria-hidden />
          </EmptyMedia>
          <EmptyTitle>You’re ready</EmptyTitle>
          <EmptyDescription>
            {hasImports
              ? `Imported ${summary.experiences} experience${summary.experiences === 1 ? "" : "s"}, ${summary.projects} project${summary.projects === 1 ? "" : "s"}, and ${summary.stacks} stack${summary.stacks === 1 ? "" : "s"}. Job filters and connections can be changed anytime in Settings.`
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
              <Button render={<Link to="/dashboard/stacks" />} variant="outline" size="sm">
                <LayersIcon />
                Stacks
              </Button>
            </>
          ) : null}
          {onImportAnother ? (
            <Button type="button" variant="outline" size="sm" onClick={onImportAnother}>
              <FileUpIcon />
              Import a resume
            </Button>
          ) : null}
          <Button render={<Link to="/dashboard" />} size="sm">
            <LayoutDashboardIcon />
            Open dashboard
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
