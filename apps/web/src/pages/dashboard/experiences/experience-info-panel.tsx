"use client";

import { format } from "date-fns";
import { AlignLeftIcon, BriefcaseIcon, Building2Icon } from "lucide-react";

import { type ExperienceOutput } from "@tsu-stack/core";

import { Markdown } from "@/shared/ui/markdown";

import {
  ItemInfoPanel,
  ItemInfoRow,
  ItemInfoSection,
  ItemInfoSections,
  PanelEditButton
} from "@/widgets/items-page";

function formatRangeFull(fromDate: string | null, toDate: string | null): string {
  if (!fromDate) return "Ongoing";
  const start = safeFormat(fromDate, "dd MMMM yyyy");
  if (!toDate) return `${start} — Present`;
  const end = safeFormat(toDate, "dd MMMM yyyy");
  return `${start} — ${end}`;
}

function safeFormat(value: string, pattern: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, pattern);
}

export function ExperienceInfoPanel({
  experience,
  onEdit
}: {
  experience: ExperienceOutput;
  onEdit?: () => void;
}) {
  return (
    <ItemInfoPanel
      eyebrow={<BriefcaseIcon strokeWidth={1.75} />}
      title={experience.title}
      description={
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{experience.organization}</span>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span>{formatRangeFull(experience.fromDate, experience.toDate)}</span>
        </p>
      }
      actions={onEdit ? <PanelEditButton onClick={onEdit} /> : null}
      updatedAt={experience.updatedAt}
      createdAt={experience.createdAt}
    >
      <ItemInfoSections>
        <ItemInfoSection title="Summary" icon={<AlignLeftIcon />}>
          {experience.description ? (
            <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
              {experience.description}
            </Markdown>
          ) : (
            <p>No description.</p>
          )}
        </ItemInfoSection>
        {experience.projects.length > 0 ? (
          <ItemInfoSection title="Projects" icon={<Building2Icon />}>
            <ul className="space-y-2.5">
              {experience.projects.map((project) => (
                <ItemInfoRow key={project.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-foreground">{project.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {project.year}
                    </span>
                  </div>
                </ItemInfoRow>
              ))}
            </ul>
          </ItemInfoSection>
        ) : null}
      </ItemInfoSections>
    </ItemInfoPanel>
  );
}
