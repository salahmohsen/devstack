"use client";

import { Link } from "@tanstack/react-router";
import { BriefcaseIcon, ChevronDownIcon, DownloadIcon, EyeIcon, Trash2Icon } from "lucide-react";

import { resumeListTitle, type ResumeOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import {
  Menu,
  MenuItem,
  MenuLinkItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger
} from "@tsu-stack/ui/components/menu";
import { cn } from "@tsu-stack/ui/lib/utils";

function primaryJob(resume: ResumeOutput) {
  return resume.jobs?.[0] ?? null;
}

export type ResumeActionGroupProps = {
  resume: ResumeOutput;
  className?: string;
  onDelete: () => void;
  isDeleting?: boolean;
};

/**
 * Inspect-panel action cluster matching tracked jobs: primary Open job,
 * Download, then overflow (View PDF / Delete).
 */
export function ResumeActionGroup({
  resume,
  className,
  onDelete,
  isDeleting
}: ResumeActionGroupProps) {
  const job = primaryJob(resume);
  const title = resumeListTitle({ author: resume.author, jobs: resume.jobs ?? [] });
  const viewHref = `/api/resume/download/?id=${resume.id}&view=1`;
  const downloadHref = `/api/resume/download/?id=${resume.id}`;

  return (
    <Group
      aria-label="Resume actions"
      className={cn("items-stretch", className)}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {job ? (
        <>
          <Button
            type="button"
            size="default"
            variant="default"
            className="min-w-0 flex-1 active:scale-[0.96]"
            render={<Link to="/dashboard/tracked-jobs" search={{ applicationId: job.id }} />}
          >
            <BriefcaseIcon strokeWidth={1.75} aria-hidden />
            Open job
          </Button>
          <GroupSeparator className="bg-primary/72" />
        </>
      ) : null}
      <Button
        type="button"
        size="default"
        variant="outline"
        className="shrink-0 active:scale-[0.96]"
        render={<a href={downloadHref} download aria-label={`Download ${title}`} />}
      >
        <DownloadIcon strokeWidth={1.75} aria-hidden />
        Download
      </Button>
      <GroupSeparator />
      <Menu>
        <MenuTrigger
          render={
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="More actions"
              className="shrink-0 active:scale-[0.96]"
            />
          }
        >
          <ChevronDownIcon className="size-4" strokeWidth={1.75} aria-hidden />
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-44">
          <MenuLinkItem
            render={<a href={viewHref} target="_blank" rel="noreferrer" aria-label="View PDF" />}
          >
            <EyeIcon aria-hidden />
            View PDF
          </MenuLinkItem>
          <MenuSeparator />
          <MenuItem variant="destructive" disabled={isDeleting} onClick={onDelete}>
            <Trash2Icon aria-hidden />
            Delete
          </MenuItem>
        </MenuPopup>
      </Menu>
    </Group>
  );
}
