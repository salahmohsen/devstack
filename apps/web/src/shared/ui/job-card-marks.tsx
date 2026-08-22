"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import {
  classifyJobSkills,
  normalizeJobSkillName,
  skillsOverlap,
  type HeldSkill,
  type JobSkillTag
} from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@tsu-stack/ui/components/menu";
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

type SkillChipItem = {
  token: string;
  label: string;
};

export type JobSkillChipHaveItKind = "close" | "missing";

const SKILL_CHIP_CLASS =
  "inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] leading-5";

function skillChipToneClass(tone: "have" | "close" | "missing"): string {
  if (tone === "have") return "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  if (tone === "close") return "bg-amber-500/10 text-amber-800 dark:text-amber-300";
  return "bg-red-500/10 text-red-800 dark:text-red-300";
}

function SkillChipMark({ tone }: { tone: "have" | "close" | "missing" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        tone === "have" && "bg-emerald-500",
        tone === "close" && "bg-amber-500",
        tone === "missing" && "bg-red-500"
      )}
    />
  );
}

function isExcludedToken(token: string, excludedKeywords: readonly string[] | undefined): boolean {
  const tokenKey = normalizeJobSkillName(token);
  if (!tokenKey) return false;
  return (excludedKeywords ?? []).some((keyword) => normalizeJobSkillName(keyword) === tokenKey);
}

function SkillChip({
  tone,
  item,
  onHaveIt,
  onAvoid,
  canAvoid,
  excludedKeywords
}: {
  tone: "have" | "close" | "missing";
  item: SkillChipItem;
  onHaveIt?: (input: { token: string; kind: JobSkillChipHaveItKind }) => void;
  onAvoid?: (token: string) => void;
  hasAliasCatalog?: boolean;
  canAvoid?: boolean;
  excludedKeywords?: readonly string[];
}) {
  const excluded = isExcludedToken(item.token, excludedKeywords);
  const chipClass = cn(SKILL_CHIP_CLASS, skillChipToneClass(tone));
  const inner = (
    <>
      <SkillChipMark tone={tone} />
      <span className={cn("truncate lowercase", excluded && "line-through opacity-70")}>
        {item.label}
      </span>
    </>
  );

  const interactive = tone !== "have" && (onHaveIt != null || onAvoid != null);
  if (!interactive) {
    return (
      <span title={item.label} className={chipClass}>
        {inner}
      </span>
    );
  }

  const kind: JobSkillChipHaveItKind = tone;

  return (
    <Menu>
      <MenuTrigger
        type="button"
        title={item.label}
        aria-label={excluded ? `${item.token}, avoided` : `${item.token} actions`}
        className={cn(
          chipClass,
          "cursor-pointer border-0 shadow-none outline-none",
          "transition-[transform,background-color] hover:brightness-[0.97] active:scale-[0.96]",
          "focus-visible:ring-2 focus-visible:ring-ring/50"
        )}
      >
        {inner}
      </MenuTrigger>
      <MenuPopup align="start">
        {onHaveIt ? (
          <MenuItem
            onClick={() => {
              onHaveIt({ token: item.token, kind });
            }}
          >
            I have it
          </MenuItem>
        ) : null}
        {onAvoid ? (
          <MenuItem
            disabled={excluded || canAvoid === false}
            onClick={() => {
              onAvoid(item.token);
            }}
          >
            Avoid
          </MenuItem>
        ) : null}
      </MenuPopup>
    </Menu>
  );
}

function SkillChipGroup({
  label,
  tone,
  skills,
  onHaveIt,
  onAvoid,
  hasAliasCatalog,
  canAvoid,
  excludedKeywords
}: {
  label: string;
  tone: "have" | "close" | "missing";
  skills: readonly SkillChipItem[];
  onHaveIt?: (input: { token: string; kind: JobSkillChipHaveItKind }) => void;
  onAvoid?: (token: string) => void;
  hasAliasCatalog?: boolean;
  canAvoid?: boolean;
  excludedKeywords?: readonly string[];
}) {
  if (skills.length === 0) return null;
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {skills.map((item, index) => (
          <li key={`${tone}-${item.token}-${index}`}>
            <SkillChip
              tone={tone}
              item={item}
              onHaveIt={onHaveIt}
              onAvoid={onAvoid}
              hasAliasCatalog={hasAliasCatalog}
              canAvoid={canAvoid}
              excludedKeywords={excludedKeywords}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Inspect-panel skills match: percent, you-have / close / missing chips, years gap. */
export function JobSkillsMatch({
  jobSkills,
  stackNames,
  held,
  listingMinYears,
  seekerYears,
  onHaveIt,
  onAvoid,
  hasAliasCatalog,
  canAvoid,
  excludedKeywords
}: {
  jobSkills: readonly string[];
  stackNames?: readonly string[];
  held?: readonly HeldSkill[];
  listingMinYears?: number | null;
  seekerYears?: number | null;
  onHaveIt?: (input: { token: string; kind: JobSkillChipHaveItKind }) => void;
  onAvoid?: (token: string) => void;
  hasAliasCatalog?: boolean;
  canAvoid?: boolean;
  excludedKeywords?: readonly string[];
}) {
  const classified = classifyJobSkills({
    jobSkills,
    held:
      held ??
      (stackNames ?? []).map((name) => {
        return { name };
      })
  });
  const yearsNote = yearsRequirementNote({ listingMinYears, seekerYears });
  if (!classified.available && !yearsNote) return null;

  const total = classified.have.length + classified.close.length + classified.missing.length;

  return (
    <div className="space-y-3 text-foreground">
      {classified.available && classified.percent != null ? (
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <NumberTicker
              value={classified.percent}
              suffix="%"
              className="text-2xl font-semibold tracking-tight"
            />
            <p className="text-xs text-muted-foreground">
              {classified.have.length} of {total} skills
              {classified.close.length > 0 ? ` · ${classified.close.length} close` : ""}
            </p>
          </div>
          <ProgressBar
            className="mt-1.5"
            value={classified.percent}
            max={100}
            hideHeader
            label={`${classified.percent}% of listed skills, ${classified.have.length} of ${total}`}
          />
        </div>
      ) : null}
      <SkillChipGroup
        label="You have"
        tone="have"
        skills={classified.have.map((name) => {
          return { token: name, label: name };
        })}
        excludedKeywords={excludedKeywords}
      />
      <SkillChipGroup
        label="Close — you have a related skill"
        tone="close"
        skills={classified.close.map((row) => {
          return { token: row.name, label: `${row.name} · you have ${row.via}` };
        })}
        onHaveIt={onHaveIt}
        onAvoid={onAvoid}
        hasAliasCatalog={hasAliasCatalog}
        canAvoid={canAvoid}
        excludedKeywords={excludedKeywords}
      />
      <SkillChipGroup
        label="Missing"
        tone="missing"
        skills={classified.missing.map((name) => {
          return { token: name, label: name };
        })}
        onHaveIt={onHaveIt}
        onAvoid={onAvoid}
        hasAliasCatalog={hasAliasCatalog}
        canAvoid={canAvoid}
        excludedKeywords={excludedKeywords}
      />
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
