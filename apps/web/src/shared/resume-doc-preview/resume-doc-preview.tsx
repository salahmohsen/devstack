"use client";

import { CheckCircle2Icon, CircleDashedIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverPopup, PopoverTrigger } from "@tsu-stack/ui/components/popover";
import { Switch } from "@tsu-stack/ui/components/switch";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  buildDocPreviewModel,
  entryDateRange,
  type DocPreviewModel,
  type DocPreviewSection
} from "@/shared/resume-doc-preview/doc-preview-model";
import { EditablePaperField } from "@/shared/resume-doc-preview/editable-paper-field";

const SECTION_APPEAR = "transition-[opacity,color] duration-150 motion-reduce:transition-none";

const ICON_EASE = "duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none";

/** Apply package: entry dimmed while excluded from the resume (include switch). */
const ENTRY_EXCLUDED = "opacity-60 transition-[opacity] duration-150 motion-reduce:transition-none";

/** Paper edit callbacks (grill Q1/Q2/Q6 lock) — text lives on the paper. */
export type ResumeDocEditHandlers = {
  onProfileChange: (patch: { name?: string }) => void;
  onSummaryChange: (text: string) => void;
  onExperienceChange: (clientId: string, patch: { title?: string; organization?: string }) => void;
  onEducationChange: (clientId: string, patch: { school?: string }) => void;
  onProjectChange: (clientId: string, patch: { title?: string }) => void;
  /** Flat rewrite: one line per bullet, empty line removes a bullet. */
  onBulletsChange: (clientId: string, lines: string[]) => void;
  /** Apply package: project rewritten-summary edit. */
  onProjectSummaryChange?: (clientId: string, text: string) => void;
  /** Apply package: headline edit — paper line under the name. */
  onHeadlineChange?: (text: string) => void;
};

function SectionTick({ present }: { present: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center",
        present ? "text-success" : "text-muted-foreground/50"
      )}
      aria-hidden
    >
      <CircleDashedIcon
        className={cn(
          "absolute size-4 transition-[opacity,transform,filter]",
          ICON_EASE,
          present ? "scale-[0.25] opacity-0 blur-xs" : "opacity-100"
        )}
      />
      <CheckCircle2Icon
        className={cn(
          "absolute size-4 transition-[opacity,transform,filter]",
          ICON_EASE,
          present ? "opacity-100" : "scale-[0.25] opacity-0 blur-xs"
        )}
      />
    </span>
  );
}

/**
 * Original-text affordance (apply spec #4): a small search icon on the entry
 * header line that reveals the pre-tailoring text on hover AND click/tap.
 * Rendered only when evidence exists — never on the onboarding paper.
 */
function EntryEvidence({ text, source }: { text: string; source: "experience" | "project" }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Original text from your ${source}`}
        className={cn(
          "mx-1 inline-flex size-4.25 shrink-0 items-center justify-center rounded-md border border-stone-300 bg-white align-[-2px] text-stone-400 outline-none",
          "transition-colors duration-100 hover:border-stone-400 hover:text-stone-600 focus-visible:ring-2 focus-visible:ring-brand/40"
        )}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(event) => event.stopPropagation()}
      >
        <SearchIcon className="size-2.5" aria-hidden />
      </PopoverTrigger>
      <PopoverPopup className="w-64">
        <div className="space-y-1.5">
          <p className="text-[9.5px] font-semibold tracking-wider text-muted-foreground uppercase">
            Original · from your {source}
          </p>
          <p className="text-[11px] leading-normal whitespace-pre-wrap text-muted-foreground">
            {text}
          </p>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

/** Apply spec #3: tiny include switch in the entry header (PortfolioSwitch pattern). */
function EntryIncludeToggle({
  clientId,
  include,
  onChange
}: {
  clientId: string;
  include: boolean;
  onChange?: (clientId: string, include: boolean) => void;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 font-sans text-[11px] text-stone-400">
      <Switch
        checked={include}
        onCheckedChange={(next) => onChange?.(clientId, next)}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        className="[--thumb-size:--spacing(2.5)]"
        aria-label="Include on the resume"
      />
      <span>{include ? "Included" : "Excluded"}</span>
    </span>
  );
}

/** Per-entry affordances threaded from `ResumeDocPreview` (apply package only). */
type EntryAffordances = {
  evidenceByClientId?: Record<string, string>;
  includeByClientId?: Record<string, boolean>;
  onIncludeChange?: (clientId: string, include: boolean) => void;
};

/**
 * One RenderCV section. The title row mirrors the PDF (bold 12pt over a full
 * hairline); the presence tick + count sit at the trailing edge so the title
 * stays exactly where the PDF puts it.
 */
function SectionBlock({
  section,
  edit,
  evidenceByClientId,
  includeByClientId,
  onIncludeChange
}: {
  section: DocPreviewSection;
  edit?: ResumeDocEditHandlers;
} & EntryAffordances) {
  const affordances: EntryAffordances = {
    evidenceByClientId,
    includeByClientId,
    onIncludeChange
  };
  return (
    <section className="cv-section" data-slot="doc-section" data-present={section.present}>
      <div className="cv-section-title flex items-center justify-between gap-2">
        <h3 className="min-w-0">{section.label}</h3>
        <span className="flex shrink-0 items-center gap-1.5">
          {section.present ? (
            <span className="font-sans text-[10px] font-normal text-stone-400 tabular-nums">
              {section.count}
            </span>
          ) : null}
          <SectionTick present={section.present} />
        </span>
      </div>

      {section.present ? (
        <div className={cn("cv-section-body", SECTION_APPEAR)}>
          {section.id === "summary" && section.summary ? (
            <div className="cv-text-entries">
              {edit ? (
                <EditablePaperField
                  multiline
                  ariaLabel="Summary"
                  value={section.summary}
                  onCommit={(next) => edit.onSummaryChange(next)}
                />
              ) : (
                <p className="text-start">{section.summary}</p>
              )}
            </div>
          ) : null}

          {section.id === "experience" && section.experience
            ? section.experience.map((entry, index) => (
                <DocExperienceEntry
                  key={entry.clientId ?? `exp-${index}`}
                  entry={entry}
                  edit={edit}
                  {...affordances}
                />
              ))
            : null}

          {section.id === "education" && section.education
            ? section.education.map((entry, index) => (
                <DocEducationEntry
                  key={entry.clientId ?? `edu-${index}`}
                  entry={entry}
                  edit={edit}
                />
              ))
            : null}

          {section.id === "projects" && section.projects
            ? section.projects.map((entry, index) => (
                <DocProjectEntry
                  key={entry.clientId ?? `proj-${index}`}
                  entry={entry}
                  edit={edit}
                  {...affordances}
                />
              ))
            : null}

          {section.id === "skills" && section.skills ? (
            <div className="cv-text-entries">
              {section.skills.map((entry, index) => (
                <p key={`skill-${index}`} className="text-start">
                  <strong>{entry.label}:</strong> {entry.details}
                </p>
              ))}
            </div>
          ) : null}

          {section.id === "certifications" && section.certifications ? (
            <div className="cv-text-entries">
              {section.certifications.map((entry, index) => (
                <p key={`cert-${index}`} className="text-start">
                  {entry.linkUrl ? <span className="cv-text-link">{entry.text}</span> : entry.text}
                  {entry.rest}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 font-sans text-xs text-stone-400 italic">
          Not on this resume — add anytime from the dashboard
        </p>
      )}
    </section>
  );
}

function DocExperienceEntry({
  entry,
  edit,
  evidenceByClientId,
  includeByClientId,
  onIncludeChange
}: {
  entry: DocPreviewSection["experience"] extends (infer T)[] | undefined ? T : never;
  edit?: ResumeDocEditHandlers;
} & EntryAffordances) {
  const evidence = evidenceByClientId?.[entry.clientId];
  const include = includeByClientId?.[entry.clientId];
  return (
    <article className={cn("cv-entry", include === false && ENTRY_EXCLUDED)}>
      <div className="min-w-0">
        <p className="text-start">
          <strong>
            {edit ? (
              <EditablePaperField
                ariaLabel="Job title"
                value={entry.position ?? ""}
                placeholder="Role"
                onCommit={(title) => edit.onExperienceChange(entry.clientId, { title })}
              />
            ) : (
              (entry.position ?? "Role")
            )}
          </strong>
          {entry.company ? (
            <>
              {", "}
              {edit ? (
                <EditablePaperField
                  ariaLabel="Company"
                  value={entry.company}
                  placeholder="Company"
                  onCommit={(organization) =>
                    edit.onExperienceChange(entry.clientId, { organization })
                  }
                />
              ) : (
                entry.company
              )}
            </>
          ) : null}
          {evidence ? <EntryEvidence text={evidence} source="experience" /> : null}
        </p>
        <DocBullets highlights={entry.highlights ?? []} edit={edit} clientId={entry.clientId} />
      </div>
      <span
        className={cn(
          "cv-entry-dates",
          include != null && "inline-flex items-center justify-end gap-2"
        )}
      >
        {entryDateRange(entry.start_date, entry.end_date)}
        {include != null ? (
          <EntryIncludeToggle
            clientId={entry.clientId}
            include={include}
            onChange={onIncludeChange}
          />
        ) : null}
      </span>
    </article>
  );
}

function DocEducationEntry({
  entry,
  edit
}: {
  entry: DocPreviewSection["education"] extends (infer T)[] | undefined ? T : never;
  edit?: ResumeDocEditHandlers;
}) {
  return (
    <article className="cv-entry">
      <div className="min-w-0">
        <p className="text-start">
          <strong>
            {edit ? (
              <EditablePaperField
                ariaLabel="School"
                value={entry.institution ?? ""}
                placeholder="School"
                onCommit={(school) => edit.onEducationChange(entry.clientId, { school })}
              />
            ) : (
              (entry.institution ?? "School")
            )}
          </strong>
          {entry.studyType ? (
            <>
              {", "}
              {entry.studyType}
              {entry.area ? ` in ${entry.area}` : ""}
            </>
          ) : null}
          {entry.location ? <> — {entry.location}</> : null}
        </p>
        <DocBullets highlights={entry.highlights ?? []} edit={edit} clientId={entry.clientId} />
      </div>
      <span className="cv-entry-dates">{entryDateRange(entry.start_date, entry.end_date)}</span>
    </article>
  );
}

function DocProjectEntry({
  entry,
  edit,
  evidenceByClientId,
  includeByClientId,
  onIncludeChange
}: {
  entry: DocPreviewSection["projects"] extends (infer T)[] | undefined ? T : never;
  edit?: ResumeDocEditHandlers;
} & EntryAffordances) {
  const evidence = evidenceByClientId?.[entry.clientId];
  const include = includeByClientId?.[entry.clientId];
  return (
    <article className={cn("cv-entry", include === false && ENTRY_EXCLUDED)}>
      <div className="min-w-0">
        <p className="text-start">
          <strong>
            {edit ? (
              <EditablePaperField
                ariaLabel="Project name"
                value={entry.name ?? ""}
                placeholder="Project"
                onCommit={(title) => edit.onProjectChange(entry.clientId, { title })}
              />
            ) : (
              (entry.name ?? "Project")
            )}
          </strong>
          {evidence ? <EntryEvidence text={evidence} source="project" /> : null}
        </p>
        {edit?.onProjectSummaryChange && entry.summary ? (
          <div className="mt-[0.08cm]">
            <EditablePaperField
              multiline
              allowEmpty
              ariaLabel="Project summary"
              value={entry.summary}
              placeholder="Summary"
              onCommit={(next) => edit.onProjectSummaryChange?.(entry.clientId, next)}
            />
          </div>
        ) : null}
        <DocBullets highlights={entry.highlights ?? []} edit={edit} clientId={entry.clientId} />
      </div>
      <span
        className={cn(
          "cv-entry-dates",
          include != null && "inline-flex items-center justify-end gap-2"
        )}
      >
        {include != null ? (
          <EntryIncludeToggle
            clientId={entry.clientId}
            include={include}
            onChange={onIncludeChange}
          />
        ) : null}
      </span>
    </article>
  );
}

/**
 * Bullet lines (grill Q6 lock). At rest they render exactly like the PDF's
 * highlight list (• at 13pt, 0.08cm gaps). With `edit`, each line is its own
 * click-to-edit field; committing rewrites the row description flat.
 */
function DocBullets({
  highlights,
  edit,
  clientId
}: {
  highlights: string[];
  edit?: ResumeDocEditHandlers;
  clientId: string;
}) {
  if (highlights.length === 0 && !edit) return null;

  if (!edit) {
    if (highlights.length === 0) return null;
    return (
      <ul className="cv-bullets">
        {highlights.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
    );
  }

  return (
    <div className="group/bullets">
      {highlights.length > 0 ? (
        <ul className="cv-bullets">
          {highlights.map((line, index) => (
            <li key={index}>
              <EditablePaperField
                multiline
                allowEmpty
                ariaLabel={`Bullet line ${index + 1}`}
                value={line}
                placeholder="Bullet"
                onCommit={(next) => {
                  // Q6 lock: a new line inside the editor adds a bullet, an
                  // emptied line removes one — split before the flat rewrite.
                  const parts = next
                    .split(/\r?\n/)
                    .map((part) => part.trim())
                    .filter(Boolean);
                  const lines = [
                    ...highlights.slice(0, index),
                    ...parts,
                    ...highlights.slice(index + 1)
                  ];
                  edit.onBulletsChange(clientId, lines);
                }}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        className={cn(
          "mt-0.5 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-sans text-[10px] text-stone-400/0",
          "transition-colors duration-100 outline-none hover:text-brand focus-visible:text-brand",
          highlights.length === 0 && "text-stone-400 hover:text-brand"
        )}
        onClick={() => edit.onBulletsChange(clientId, [...highlights, "New bullet"])}
      >
        <PlusIcon className="size-3" aria-hidden />
        Add bullet
      </button>
    </div>
  );
}

function SkeletonSection({ label }: { label: string }) {
  return (
    <section className="cv-section" data-slot="doc-section" data-skeleton aria-hidden>
      <div className="cv-section-title flex items-center justify-between gap-2">
        <h3 className="min-w-0 font-sans text-stone-400">{label}</h3>
        <CircleDashedIcon className="size-4 shrink-0 text-stone-300" aria-hidden />
      </div>
      <div className="cv-section-body font-sans">
        <div className="h-2.5 w-3/4 animate-pulse rounded-xs bg-stone-200/80" />
        <div className="mt-1.5 h-2.5 w-1/2 animate-pulse rounded-xs bg-stone-200/60" />
      </div>
    </section>
  );
}

export type ResumeDocPreviewProps = {
  /** Confirmed draft to mirror. Omit for the extracting skeleton state. */
  draft?: Parameters<typeof buildDocPreviewModel>[0] | null;
  /** Precomputed model (skip the rebuild when the caller already has it). */
  model?: DocPreviewModel;
  /** Skeleton: sections appear with "extracting…" placeholders (analyzing step). */
  skeleton?: boolean;
  /** Paper editing (review step). Omit for read-only rendering. */
  edit?: ResumeDocEditHandlers;
  className?: string;
  /** Original text per entry id → renders the evidence icon + hover card (spec #4). */
  evidenceByClientId?: Record<string, string>;
  /** Include state per entry id → renders the mini include switch (spec #3). */
  includeByClientId?: Record<string, boolean>;
  onIncludeChange?: (clientId: string, include: boolean) => void;
};

/**
 * RenderCV-mirroring live resume document. Consumes the same section mapping
 * as the PDF pipeline (`@tsu-stack/pdf/doc`) and the exact `engineeringresumes`
 * theme typography, so what you see is what the renderer emits.
 */
export function ResumeDocPreview({
  draft,
  model,
  skeleton = false,
  edit,
  className,
  evidenceByClientId,
  includeByClientId,
  onIncludeChange
}: ResumeDocPreviewProps) {
  if (skeleton || (!model && !draft)) {
    return (
      <ResumeDocPane className={className} aria-busy="true">
        <DocPaneHeader name="Your resume" headline={null} contactLine={[]} skeleton />
        <div>
          {["Summary", "Experience", "Projects", "Skills"].map((label) => (
            <SkeletonSection key={label} label={label} />
          ))}
        </div>
      </ResumeDocPane>
    );
  }

  const resolved: DocPreviewModel = model ?? buildDocPreviewModel(draft!);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ResumeDocPane>
        <DocPaneHeader
          name={resolved.name}
          headline={resolved.headline}
          contactLine={resolved.contactLine}
          edit={edit}
        />
        <div>
          {resolved.sections.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              edit={edit}
              evidenceByClientId={evidenceByClientId}
              includeByClientId={includeByClientId}
              onIncludeChange={onIncludeChange}
            />
          ))}
        </div>
      </ResumeDocPane>
      {edit ? (
        <p className="text-center font-sans text-[10px] text-muted-foreground/70">
          ✎ Click any text on the paper to edit it — dates and toggles live in the panel beside
        </p>
      ) : null}
    </div>
  );
}

function DocPaneHeader({
  name,
  headline,
  contactLine,
  skeleton = false,
  edit
}: {
  name: string;
  headline: string | null;
  contactLine: DocPreviewModel["contactLine"];
  skeleton?: boolean;
  edit?: ResumeDocEditHandlers;
}) {
  const onHeadlineChange = edit?.onHeadlineChange;
  return (
    <header data-slot="doc-header">
      <div className="cv-name">
        {edit && !skeleton ? (
          <EditablePaperField
            ariaLabel="Resume name"
            value={name}
            onCommit={(next) => edit.onProfileChange({ name: next })}
          />
        ) : (
          name
        )}
      </div>
      {/* Headline: derived (latest included role) — editable only via the apply-package paper. */}
      {onHeadlineChange ? (
        headline ? (
          <p className="cv-headline">
            <EditablePaperField
              ariaLabel="Headline"
              value={headline}
              allowEmpty
              placeholder="Target role line — optional"
              onCommit={onHeadlineChange}
            />
          </p>
        ) : (
          <p className="cv-headline font-sans text-[12.5px] text-stone-400 italic">
            <EditablePaperField
              ariaLabel="Headline"
              value=""
              allowEmpty
              placeholder="Add a target role line"
              onCommit={onHeadlineChange}
            />
          </p>
        )
      ) : headline ? (
        <p className="cv-headline">{headline}</p>
      ) : null}
      {contactLine.length > 0 ? (
        <p className="cv-connections">
          {contactLine.map((contact, index) => (
            <span key={`${contact.text}-${index}`}>
              {index > 0 ? <span aria-hidden> | </span> : null}
              <span className={contact.link ? "cv-link" : undefined}>{contact.text}</span>
            </span>
          ))}
        </p>
      ) : null}
    </header>
  );
}

/**
 * The paper itself: white sheet, XCharter, print-true spacing. Elevation via
 * layered shadow, structure via a single border.
 */
function ResumeDocPane({ children, className, ...rest }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="resume-doc-pane"
      className={cn(
        "rendercv-paper rounded-2xl border border-stone-200 px-7 py-6",
        "shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
