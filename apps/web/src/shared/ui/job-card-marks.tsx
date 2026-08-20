"use client";

import { useState } from "react";

import { skillsOverlap, type JobSkillTag } from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";

import { ItemAvatar } from "@/shared/ui/item-avatar";
import { Markdown } from "@/shared/ui/markdown";

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

/** Blobatar identity plus a small logo pictogram that never replaces the face. */
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
    <span className="relative inline-flex shrink-0">
      <ItemAvatar
        name={companyName}
        size={size}
        selected={selected}
        className={className}
        aria-label={companyName}
      />
      <span className="absolute -right-0.5 -bottom-0.5">
        <CompanyLogoPictogram companyName={companyName} logoUrl={logoUrl} size={14} />
      </span>
    </span>
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

export function AgentTakeMarkdown({ text }: { text: string }) {
  return (
    <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
      {text}
    </Markdown>
  );
}
