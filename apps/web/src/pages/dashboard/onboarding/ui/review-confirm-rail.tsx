"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import {
  type ResumeImportCertificationDraft,
  type ResumeImportDraft,
  type ResumeImportEducationDraft,
  type ResumeImportExperienceDraft,
  type ResumeImportProjectDraft,
  contactTypeSchema
} from "@tsu-stack/core";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger
} from "@tsu-stack/ui/components/accordion";
import { Button } from "@tsu-stack/ui/components/button";
import { CalendarDropdown } from "@tsu-stack/ui/components/calendar-dropdown";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
import { Field, FieldLabel } from "@tsu-stack/ui/components/field";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { Input } from "@tsu-stack/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@tsu-stack/ui/components/popover";
import {
  Select,
  SelectItem,
  SelectList,
  SelectPopup,
  SelectTrigger
} from "@tsu-stack/ui/components/select";
import { Switch } from "@tsu-stack/ui/components/switch";
import { cn } from "@tsu-stack/ui/lib/utils";

import { ContactIcon } from "@/shared/lib/contact-icon";
import { entryDateRange } from "@/shared/resume-doc-preview/doc-preview-model";

const CONTACT_TYPES = contactTypeSchema.options;

export type ReviewConfirmRailProps = {
  draft: ResumeImportDraft;
  onProfileChange: (patch: Partial<ResumeImportDraft["profile"]>) => void;
  onExperienceChange: (clientId: string, patch: Partial<ResumeImportExperienceDraft>) => void;
  onEducationChange: (clientId: string, patch: Partial<ResumeImportEducationDraft>) => void;
  onCertificationChange: (clientId: string, patch: Partial<ResumeImportCertificationDraft>) => void;
  onProjectChange: (clientId: string, patch: Partial<ResumeImportProjectDraft>) => void;
  onManageSkills: () => void;
  skillsSelected: number;
  skillsTotal: number;
};

/** ISO date string → yyyy-mm-dd for the picker. */
function dateValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

/** Local-safe yyyy-mm-dd (toISOString shifts across timezones). */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function RailSectionHeader({ label, count }: { label: string; count: string | number }) {
  return (
    <h3 className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
      {label}
      <span className="ms-1.5 text-[10px] tabular-nums">{count}</span>
    </h3>
  );
}

/** Collapsed presence rows; expansion holds meta fields only (grill Q4 lock). */
function RailRow({
  id,
  selected,
  onSelectedChange,
  title,
  meta,
  portfolio,
  onPortfolioChange,
  children
}: {
  id: string;
  selected: boolean;
  onSelectedChange: (next: boolean) => void;
  title: string;
  meta?: string | null;
  portfolio?: boolean;
  onPortfolioChange?: (next: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem
      value={id}
      className={cn(
        "rounded-lg border px-2.5 transition-[border-color,opacity,background-color] duration-150",
        selected ? "border-border/80 bg-card" : "border-border/40 bg-muted/10 opacity-70"
      )}
    >
      {/* Row controls cluster at the trailing edge. The AccordionTrigger
          wraps its own <h3> header, which is content-sized by default — flex
          the first child so the title takes the space and the chevron lands
          beside the controls. */}
      <div className="flex items-center gap-2 [&>*:first-child]:min-w-0 [&>*:first-child]:flex-1">
        <AccordionTrigger className="min-w-0 py-2 hover:no-underline">
          <span className="min-w-0 flex-1 text-start">
            <span className="block truncate text-xs font-medium text-foreground">{title}</span>
            {meta ? (
              <span className="mt-0.5 block text-[10px] text-muted-foreground tabular-nums">
                {meta}
              </span>
            ) : null}
          </span>
        </AccordionTrigger>
        {/* Row controls cluster at the trailing edge, alongside the chevron. */}
        <Checkbox
          checked={selected}
          aria-label={`Include ${title}`}
          onCheckedChange={(v) => onSelectedChange(!!v)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        />
        {onPortfolioChange ? (
          <Switch
            checked={selected && portfolio}
            disabled={!selected}
            onCheckedChange={onPortfolioChange}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Show on portfolio"
            className="me-0.5 shrink-0 [--thumb-size:--spacing(3.5)]"
          />
        ) : null}
      </div>
      {selected ? (
        <AccordionPanel className="pb-3">
          <div className="grid gap-2 pt-1">{children}</div>
        </AccordionPanel>
      ) : null}
    </AccordionItem>
  );
}

function RailDateField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <Field>
      {/* `!` required: FieldLabel's sm:text-sm variant beats a plain override. */}
      <FieldLabel className="text-[11px]! font-normal! text-muted-foreground!">{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-8 w-full justify-start px-2 text-xs font-normal tabular-nums",
                !value && "text-muted-foreground/60"
              )}
            />
          }
        >
          {selected
            ? selected.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })
            : "Pick a date"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarDropdown
            mode="single"
            selected={selected}
            onSelect={(date) => {
              onChange(date ? toIsoDate(date) : null);
              setOpen(false);
            }}
            startMonth={new Date(1950, 0)}
            endMonth={new Date(2035, 11)}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function RailTextField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <Field>
      {/* `!` required: FieldLabel's sm:text-sm variant beats a plain override. */}
      <FieldLabel className="text-[11px]! font-normal! text-muted-foreground!">{label}</FieldLabel>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring/50"
      />
    </Field>
  );
}

/**
 * A3 inline confirm rail (grill Q3/Q4 lock): confirmed rows only, meta fields
 * expand inline per row; text editing stays on the paper; skills open one
 * batch drawer.
 */
export function ReviewConfirmRail({
  draft,
  onProfileChange,
  onExperienceChange,
  onEducationChange,
  onCertificationChange,
  onProjectChange,
  onManageSkills,
  skillsSelected,
  skillsTotal
}: ReviewConfirmRailProps) {
  // All rows stay in the rail — deselected ones dim (opacity-70) so a
  // misclick is re-includable. Only the paper drops deselected rows (Q3 lock).
  const experiences = draft.experiences;
  const educations = draft.educations;
  const certifications = draft.certifications;
  const projects = draft.projects;
  const contacts = draft.profile.contacts ?? [];

  return (
    <div className="flex flex-col gap-5 text-sm" data-slot="review-confirm-rail">
      {/* Profile meta — email + contacts (name/summary live on the paper). */}
      <section className="flex flex-col gap-2">
        <RailSectionHeader label="Profile" count={contacts.length} />
        <RailTextField
          label="Email (optional)"
          value={draft.profile.email ?? ""}
          placeholder="Keep current if empty"
          onChange={(email) => onProfileChange({ email: email || null })}
        />
        {contacts.map((contact, index) => (
          // Same Group-of-inputs pattern as the profile settings page, but the
          // type select collapses to its icon — the glyph already says the
          // type, so the value input gets the space.
          <Group
            key={`${contact.type}-${index}`}
            aria-label="Contact entry"
            className="w-full min-w-0 items-stretch"
          >
            <Select
              value={contact.type}
              onValueChange={(val) => {
                if (!val) return;
                const next = [...contacts];
                next[index] = { ...contact, type: val as typeof contact.type };
                onProfileChange({ contacts: next });
              }}
              items={CONTACT_TYPES.map((type) => {
                return { value: type, label: type };
              })}
            >
              <SelectTrigger
                size="sm"
                aria-label={`Contact type: ${contact.type}`}
                title={contact.type}
                /* min-w-0 beats the trigger variant's min-w-36 — the glyph
                   already says the type, so the value input gets the width. */
                className="w-9 min-w-0 shrink-0 justify-center rounded-lg px-0 [&_[data-slot=select-icon]]:hidden"
              >
                <ContactIcon type={contact.type} className="size-4" />
              </SelectTrigger>
              <SelectPopup>
                <SelectList>
                  {CONTACT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      <ContactIcon type={type} className="size-3.5" />
                      {type}
                    </SelectItem>
                  ))}
                </SelectList>
              </SelectPopup>
            </Select>
            <GroupSeparator />
            <Input
              size="sm"
              value={contact.value}
              placeholder="Value"
              aria-label="Contact value"
              onChange={(e) => {
                const next = [...contacts];
                next[index] = { ...contact, value: e.target.value };
                onProfileChange({ contacts: next });
              }}
              className="min-w-0 flex-1"
            />
            <GroupSeparator />
            {/* Outline (not ghost) so the button joins the Group's shared
                border chain — the row reads as one control strip. */}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={`Remove ${contact.type} contact`}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onProfileChange({ contacts: contacts.filter((_, i) => i !== index) })}
            >
              ×
            </Button>
          </Group>
        ))}
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="self-start"
          onClick={() =>
            onProfileChange({ contacts: [...contacts, { type: "website", value: "" }] })
          }
        >
          Add contact
        </Button>
      </section>

      {/* Experience rows — dates + presence expand inline. */}
      <section className="flex flex-col gap-2">
        <RailSectionHeader
          label="Experience"
          count={`${experiences.filter((e) => e.selected).length}/${experiences.length}`}
        />
        <Accordion multiple className="flex flex-col gap-1.5">
          {experiences.map((exp) => (
            <RailRow
              key={exp.clientId}
              id={exp.clientId}
              selected={exp.selected}
              onSelectedChange={(selected) =>
                onExperienceChange(exp.clientId, { selected, includedInPortfolio: selected })
              }
              title={exp.title || "Untitled role"}
              meta={[exp.organization, entryDateRange(exp.fromDate, exp.toDate)]
                .filter(Boolean)
                .join(" · ")}
              portfolio={exp.includedInPortfolio}
              onPortfolioChange={(includedInPortfolio) =>
                onExperienceChange(exp.clientId, { includedInPortfolio })
              }
            >
              <RailDateField
                label="From"
                value={dateValue(exp.fromDate)}
                onChange={(fromDate) => onExperienceChange(exp.clientId, { fromDate })}
              />
              <RailDateField
                label="To"
                value={dateValue(exp.toDate)}
                onChange={(toDate) => onExperienceChange(exp.clientId, { toDate })}
              />
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                Present role
                <Switch
                  checked={exp.isPresent}
                  onCheckedChange={(isPresent) => onExperienceChange(exp.clientId, { isPresent })}
                  aria-label="Present role"
                  className="[--thumb-size:--spacing(3.5)]"
                />
              </div>
            </RailRow>
          ))}
        </Accordion>
        {experiences.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70 italic">None confirmed</p>
        ) : null}
      </section>

      {/* Education rows — field/location/dates/gpa expand inline. */}
      <section className="flex flex-col gap-2">
        <RailSectionHeader
          label="Education"
          count={`${educations.filter((e) => e.selected).length}/${educations.length}`}
        />
        <Accordion multiple className="flex flex-col gap-1.5">
          {educations.map((edu) => (
            <RailRow
              key={edu.clientId}
              id={edu.clientId}
              selected={edu.selected}
              onSelectedChange={(selected) => onEducationChange(edu.clientId, { selected })}
              title={edu.school || "Untitled school"}
              meta={entryDateRange(edu.fromDate, edu.toDate)}
            >
              <RailTextField
                label="Field of study"
                value={edu.field ?? ""}
                placeholder="e.g. Computer Science"
                onChange={(field) => onEducationChange(edu.clientId, { field: field || null })}
              />
              <RailTextField
                label="Location"
                value={edu.location ?? ""}
                placeholder="City, Country"
                onChange={(location) =>
                  onEducationChange(edu.clientId, { location: location || null })
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <RailDateField
                  label="From"
                  value={dateValue(edu.fromDate)}
                  onChange={(fromDate) => onEducationChange(edu.clientId, { fromDate })}
                />
                <RailDateField
                  label="To"
                  value={dateValue(edu.toDate)}
                  onChange={(toDate) => onEducationChange(edu.clientId, { toDate })}
                />
              </div>
              <RailTextField
                label="GPA (optional)"
                value={edu.gpa ?? ""}
                placeholder="e.g. 3.8"
                onChange={(gpa) => onEducationChange(edu.clientId, { gpa: gpa || null })}
              />
            </RailRow>
          ))}
        </Accordion>
        {educations.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70 italic">None confirmed</p>
        ) : null}
      </section>

      {/* Certification rows — issuer/issued/expiry/credential expand inline. */}
      <section className="flex flex-col gap-2">
        <RailSectionHeader
          label="Certifications"
          count={`${certifications.filter((c) => c.selected).length}/${certifications.length}`}
        />
        <Accordion multiple className="flex flex-col gap-1.5">
          {certifications.map((cert) => (
            <RailRow
              key={cert.clientId}
              id={cert.clientId}
              selected={cert.selected}
              onSelectedChange={(selected) => onCertificationChange(cert.clientId, { selected })}
              title={cert.name || "Untitled certification"}
              meta={entryDateRange(cert.issuedAt, cert.expiresAt)}
            >
              <RailTextField
                label="Issuer"
                value={cert.issuer ?? ""}
                placeholder="Issuing org"
                onChange={(issuer) => onCertificationChange(cert.clientId, { issuer })}
              />
              <div className="grid grid-cols-2 gap-2">
                <RailDateField
                  label="Issued"
                  value={dateValue(cert.issuedAt)}
                  onChange={(issuedAt) => onCertificationChange(cert.clientId, { issuedAt })}
                />
                <RailDateField
                  label="Expires"
                  value={dateValue(cert.expiresAt)}
                  onChange={(expiresAt) => onCertificationChange(cert.clientId, { expiresAt })}
                />
              </div>
              <RailTextField
                label="Credential URL (optional)"
                value={cert.credentialUrl ?? ""}
                placeholder="https://…"
                onChange={(credentialUrl) =>
                  onCertificationChange(cert.clientId, { credentialUrl: credentialUrl || null })
                }
              />
            </RailRow>
          ))}
        </Accordion>
        {certifications.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70 italic">None confirmed</p>
        ) : null}
      </section>

      {/* Project rows — year expands inline. */}
      <section className="flex flex-col gap-2">
        <RailSectionHeader
          label="Projects"
          count={`${projects.filter((p) => p.selected).length}/${projects.length}`}
        />
        <Accordion multiple className="flex flex-col gap-1.5">
          {projects.map((project) => (
            <RailRow
              key={project.clientId}
              id={project.clientId}
              selected={project.selected}
              onSelectedChange={(selected) =>
                onProjectChange(project.clientId, { selected, includedInPortfolio: selected })
              }
              title={project.title || "Untitled project"}
              portfolio={project.includedInPortfolio}
              onPortfolioChange={(includedInPortfolio) =>
                onProjectChange(project.clientId, { includedInPortfolio })
              }
            >
              <RailTextField
                label="Year"
                value={String(project.year ?? "")}
                placeholder="e.g. 2025"
                onChange={(year) => {
                  const parsed = Number.parseInt(year, 10);
                  if (Number.isFinite(parsed)) {
                    onProjectChange(project.clientId, { year: parsed });
                  }
                }}
              />
            </RailRow>
          ))}
        </Accordion>
        {projects.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70 italic">None confirmed</p>
        ) : null}
      </section>

      {/* Skills → one batch drawer (grill Q4 lock). */}
      <section className="flex flex-col gap-2">
        <RailSectionHeader label="Skills" count={skillsSelected} />
        <Button type="button" size="sm" variant="outline" onClick={onManageSkills}>
          Manage skills
          <ChevronDownIcon className="size-3.5" aria-hidden />
        </Button>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {skillsSelected}/{skillsTotal} confirmed
        </p>
      </section>
    </div>
  );
}
