"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { skillsOverlap, type JobSkillTag } from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { cn } from "@tsu-stack/ui/lib/utils";

import { ProgressBar } from "@/shared/ui/interior/progress-bar";
import { ItemAvatar } from "@/shared/ui/item-avatar";
import { Markdown } from "@/shared/ui/markdown";
import { NumberTicker } from "@/shared/ui/motion/number-ticker";

export function companyPictogramUrl(
  companyName: string,
  storedLogoUrl?: string | null
): string | null {
  const stored = storedLogoUrl?.trim();
  if (stored) return stored;
  const name = companyName.trim();
  if (!name) return null;
  return `https://logo.freehire.me/${encodeURIComponent(name)}`;
}

export function CompanyLogoPictogram({
  companyName,
  logoUrl,
  size = 16
}: {
  companyName: string;
  logoUrl?: string | null;
  size?: number;
}) {
  const src = companyPictogramUrl(companyName, logoUrl);
  const [hidden, setHidden] = useState(false);
  if (!src || hidden) return null;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="rounded-sm bg-background object-contain ring-1 ring-border"
      onError={() => setHidden(true)}
    />
  );
}

/** Company logo as the face when it loads; blobatar if missing or the image fails. */
export function JobIdentityMark({
  companyName,
  logoUrl,
  size = 40,
  selected = false,
  className
}: {
  companyName: string;
  logoUrl?: string | null;
  size?: number;
  selected?: boolean;
  className?: string;
}) {
  return (
    <ItemAvatar
      name={companyName}
      imageSrc={companyPictogramUrl(companyName, logoUrl)}
      size={size}
      selected={selected}
      className={className}
      aria-label={companyName}
    />
  );
}

export function JobYearsBadge({ years }: { years: number | null | undefined }) {
  if (years == null || !Number.isFinite(years)) return null;
  return (
    <Badge variant="outline" className="font-normal">
      Asks {years} years
    </Badge>
  );
}

export function listingSkillNames(
  required: readonly JobSkillTag[] | undefined,
  preferred: readonly JobSkillTag[] | undefined
): string[] {
  return [...(required ?? []), ...(preferred ?? [])]
    .map((skill) => skill.name.trim())
    .filter(Boolean);
}

/** Listing skill names vs those already tagged to a tenant stack. */
export function skillBarInputs(
  required: readonly JobSkillTag[] | undefined,
  preferred: readonly JobSkillTag[] | undefined
): { jobSkills: string[]; stackNames: string[] } {
  const tags = [...(required ?? []), ...(preferred ?? [])];
  return {
    jobSkills: tags.map((skill) => skill.name.trim()).filter(Boolean),
    stackNames: tags
      .filter((skill) => skill.stackId)
      .map((skill) => skill.name.trim())
      .filter(Boolean)
  };
}

export function JobSkillsBar({
  jobSkills,
  stackNames
}: {
  jobSkills: readonly string[];
  stackNames: readonly string[];
}) {
  const overlap = skillsOverlap({ jobSkills, stackNames });
  if (!overlap.available || overlap.percent == null) return null;
  return (
    <div className="flex min-w-0 flex-col gap-1" title={`${overlap.percent}% of listed skills`}>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary"
          style={{ width: `${Math.min(100, Math.max(0, overlap.percent))}%` }}
        />
      </div>
      <p className="truncate text-[11px] text-muted-foreground">
        {overlap.percent}% skills
        {overlap.matched.length > 0 ? ` · ${overlap.matched.slice(0, 4).join(", ")}` : ""}
      </p>
    </div>
  );
}

export function yearsRequirementNote(input: {
  listingMinYears?: number | null;
  seekerYears?: number | null;
}): string | null {
  const listing = input.listingMinYears;
  const seeker = input.seekerYears;
  if (listing == null || !Number.isFinite(listing) || listing <= 0) return null;
  if (seeker == null || !Number.isFinite(seeker)) return null;
  if (listing <= seeker) return null;
  return `Requires ${listing}+ years; you have ${seeker}.`;
}

function SkillChipGroup({
  label,
  tone,
  skills
}: {
  label: string;
  tone: "have" | "missing";
  skills: readonly string[];
}) {
  if (skills.length === 0) return null;
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <li key={`${tone}-${skill}`}>
            <span
              title={skill}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] leading-5",
                tone === "have"
                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                  : "bg-red-500/10 text-red-800 dark:text-red-300"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  tone === "have" ? "bg-emerald-500" : "bg-red-500"
                )}
              />
              <span className="truncate lowercase">{skill}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Inspect-panel skills match: percent, you-have / missing chips, years gap. */
export function JobSkillsMatch({
  jobSkills,
  stackNames,
  listingMinYears,
  seekerYears
}: {
  jobSkills: readonly string[];
  stackNames: readonly string[];
  listingMinYears?: number | null;
  seekerYears?: number | null;
}) {
  const overlap = skillsOverlap({ jobSkills, stackNames });
  const yearsNote = yearsRequirementNote({ listingMinYears, seekerYears });
  if (!overlap.available && !yearsNote) return null;

  const total = overlap.matched.length + overlap.missing.length;

  return (
    <div className="space-y-3 text-foreground">
      {overlap.available && overlap.percent != null ? (
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <NumberTicker
              value={overlap.percent}
              suffix="%"
              className="text-2xl font-semibold tracking-tight"
            />
            <p className="text-xs text-muted-foreground">
              {overlap.matched.length} of {total} skills
            </p>
          </div>
          <ProgressBar
            className="mt-1.5"
            value={overlap.percent}
            max={100}
            hideHeader
            label={`${overlap.percent}% of listed skills, ${overlap.matched.length} of ${total}`}
          />
        </div>
      ) : null}
      <SkillChipGroup label="You have" tone="have" skills={overlap.matched} />
      <SkillChipGroup label="Missing" tone="missing" skills={overlap.missing} />
      {yearsNote ? (
        <div>
          <p className="text-xs font-medium text-foreground">Requirements</p>
          <p className="mt-1.5 flex items-start gap-1.5 text-sm text-amber-800 dark:text-amber-300">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{yearsNote}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function AgentTakeMarkdown({ text }: { text: string }) {
  return (
    <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
      {text}
    </Markdown>
  );
}
