"use client";

import { Link } from "@tanstack/react-router";
import { CheckCircle2Icon, LayersIcon, BriefcaseIcon, FolderKanbanIcon } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";

export function DoneStep() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center py-10">
      <Empty className="w-full rounded-2xl border bg-card px-6 py-12 shadow-xs/5">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCircle2Icon className="size-5 text-success" />
          </EmptyMedia>
          <EmptyTitle>You&apos;re all set</EmptyTitle>
          <EmptyDescription>
            Your portfolio data is ready. Review experiences, projects, and stacks anytime from the
            dashboard.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center gap-2">
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
          <Button render={<Link to="/dashboard" />} size="sm">
            Back to dashboard
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
