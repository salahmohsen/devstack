"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  contactTypeSchema,
  type ResumeImportDraft,
  type ResumeImportExperienceDraft,
  type ResumeImportProjectDraft,
  type ResumeImportStackDraft
} from "@tsu-stack/core";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger
} from "@tsu-stack/ui/components/accordion";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel
} from "@tsu-stack/ui/components/card";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@tsu-stack/ui/components/empty";
import { Field, FieldLabel } from "@tsu-stack/ui/components/field";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { Input } from "@tsu-stack/ui/components/input";
import {
  Select,
  SelectItem,
  SelectList,
  SelectPopup,
  SelectTrigger,
  SelectValue
} from "@tsu-stack/ui/components/select";
import { Separator } from "@tsu-stack/ui/components/separator";
import { Switch } from "@tsu-stack/ui/components/switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@tsu-stack/ui/components/tabs";
import { Textarea } from "@tsu-stack/ui/components/textarea";
import { cn } from "@tsu-stack/ui/lib/utils";

import { ContactIcon } from "@/shared/lib/contact-icon";
import { AiErrorBanner } from "@/shared/ui/ai-error-banner";

import { useApplyOnboardingMutation, useDiscardSourceMutation } from "@/features/onboarding";

import { DraftExperienceFields } from "@/pages/dashboard/onboarding/ui/draft-experience-fields";
import { DraftProjectFields } from "@/pages/dashboard/onboarding/ui/draft-project-fields";

const CONTACT_TYPES = contactTypeSchema.options;

const STACK_TYPE_ITEMS = [
  { value: "framework", label: "Framework" },
  { value: "language", label: "Language" },
  { value: "database", label: "Database" },
  { value: "ui", label: "UI" },
  { value: "auth", label: "Auth" },
  { value: "deployment", label: "Deployment" },
  { value: "testing", label: "Testing" },
  { value: "ai", label: "AI" },
  { value: "tooling", label: "Tooling" },
  { value: "storage", label: "Storage" },
  { value: "state management", label: "State Management" },
  { value: "other", label: "Other" }
] as const;

export type ReviewStepProps = {
  draft: ResumeImportDraft;
  objectKey: string | null;
  onDraftChange: (draft: ResumeImportDraft) => void;
  onBack: () => void;
  onApplied: (summary: { experiences: number; projects: number; stacks: number }) => void;
  onDiscarded: () => void;
};

function TabCount({ selected, total }: { selected: number; total: number }) {
  return (
    <Badge
      variant="outline"
      className="ms-1 h-5 min-w-5 justify-center px-1.5 text-[10px] font-medium tabular-nums not-in-data-active:text-muted-foreground"
      title={`${selected} selected of ${total}`}
    >
      {selected}/{total}
    </Badge>
  );
}

function BulkSelectGroup({
  selected,
  total,
  label,
  onSelectAll,
  onSelectNone
}: {
  selected: number;
  total: number;
  label: string;
  onSelectAll: () => void;
  onSelectNone: () => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground tabular-nums">
        {selected}/{total} {label}
      </p>
      <Group aria-label={`Select ${label}`}>
        <Button type="button" size="xs" variant="outline" onClick={onSelectAll}>
          All
        </Button>
        <GroupSeparator />
        <Button type="button" size="xs" variant="outline" onClick={onSelectNone}>
          None
        </Button>
      </Group>
    </div>
  );
}

function PortfolioSwitch({
  id,
  checked,
  disabled,
  onCheckedChange
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 text-xs font-normal text-muted-foreground",
        disabled && "opacity-50"
      )}
    >
      <Switch
        // Remount after deselect→reselect so UI always reflects draft (not sticky off).
        key={`${id}-${disabled ? "off" : "on"}-${checked ? "1" : "0"}`}
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="[--thumb-size:--spacing(3.5)]"
        aria-label="Show on portfolio"
      />
      <span className="hidden sm:inline" aria-hidden>
        Portfolio
      </span>
    </span>
  );
}

/**
 * Experiences / projects: flex multi-column wrap (not CSS grid).
 * Open accordion items still use data-open:basis-full for full-width edit.
 */
const ITEM_FLEX =
  "flex w-full flex-col flex-wrap gap-2 sm:flex-row sm:items-start [&>*]:w-full sm:[&>*]:w-[calc(50%-0.25rem)] xl:[&>*]:w-[calc(33.333%-0.375rem)] 2xl:[&>*]:w-[calc(25%-0.375rem)]";

/**
 * Collapsible review tile (coss accordion + checkbox).
 * Collapsed tiles pack into columns; open tiles span full width for editing.
 */
function ReviewAccordionItem({
  value,
  selected,
  onSelectedChange,
  title,
  subtitle,
  includedInPortfolio,
  onPortfolioChange,
  children
}: {
  value: string;
  selected: boolean;
  onSelectedChange: (next: boolean) => void;
  title: string;
  subtitle?: string;
  includedInPortfolio: boolean;
  onPortfolioChange: (next: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem
      value={value}
      className={cn(
        "min-w-0 rounded-xl border px-3 transition-[border-color,opacity,background-color] duration-150",
        // Open editor uses full row so rich fields have room.
        "data-open:w-full! data-open:max-w-none! data-open:basis-full!",
        selected ? "border-border/80 bg-card" : "border-border/40 bg-muted/10 opacity-70"
      )}
    >
      <div className="flex items-start gap-2 py-1">
        <Checkbox
          checked={selected}
          aria-label={`Import ${title}`}
          className="mt-3.5"
          onCheckedChange={(v) => onSelectedChange(!!v)}
          onClick={(e) => e.stopPropagation()}
        />
        <AccordionTrigger className="min-w-0 flex-1 py-3 hover:no-underline">
          <span className="min-w-0 flex-1 text-start">
            <span className="block truncate text-sm font-medium text-foreground">{title}</span>
            {subtitle ? (
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {subtitle}
              </span>
            ) : null}
          </span>
        </AccordionTrigger>
        <div className="mt-2.5 shrink-0">
          <PortfolioSwitch
            id={`portfolio-${value}`}
            checked={selected && includedInPortfolio}
            disabled={!selected}
            onCheckedChange={onPortfolioChange}
          />
        </div>
      </div>
      {selected ? (
        <AccordionPanel className="pb-4 text-foreground">
          <div className="max-w-3xl border-t border-border/60 pt-4">{children}</div>
        </AccordionPanel>
      ) : null}
    </AccordionItem>
  );
}

export function ReviewStep({
  draft,
  objectKey,
  onDraftChange,
  onBack,
  onApplied,
  onDiscarded
}: ReviewStepProps) {
  const applyMutation = useApplyOnboardingMutation();
  const discardMutation = useDiscardSourceMutation();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("profile");
  const [discardOpen, setDiscardOpen] = useState(false);

  const counts = useMemo(() => {
    return {
      experiences: draft.experiences.filter((e) => e.selected).length,
      projects: draft.projects.filter((p) => p.selected).length,
      stacks: draft.stacks.filter((s) => s.selected).length
    };
  }, [draft]);

  const totals = useMemo(() => {
    return {
      experiences: draft.experiences.length,
      projects: draft.projects.length,
      stacks: draft.stacks.length
    };
  }, [draft]);

  const totalSelected = counts.experiences + counts.projects + counts.stacks;
  const hasProfileContent =
    (draft.profile.name?.trim().length ?? 0) > 0 ||
    (draft.profile.summary?.trim().length ?? 0) > 0 ||
    (draft.profile.email?.trim().length ?? 0) > 0 ||
    (draft.profile.contacts?.length ?? 0) > 0;
  /** Match server: need selected rows or a non-empty profile payload. */
  const canApply = totalSelected > 0 || hasProfileContent;

  const experienceOptions = useMemo(
    () =>
      draft.experiences.map((exp) => {
        return {
          value: exp.clientId,
          label: `${exp.title} · ${exp.organization}`
        };
      }),
    [draft.experiences]
  );

  const updateProfile = <K extends keyof ResumeImportDraft["profile"]>(
    key: K,
    value: ResumeImportDraft["profile"][K]
  ) => {
    onDraftChange({
      ...draft,
      profile: { ...draft.profile, [key]: value }
    });
  };

  /**
   * Import selection drives portfolio:
   * - deselect → portfolio off
   * - reselect → portfolio on
   * Field-only patches leave portfolio alone.
   */
  const mergeItem = <T extends { selected: boolean; includedInPortfolio: boolean }>(
    item: T,
    patch: Partial<T>
  ): T => {
    if (typeof patch.selected === "boolean") {
      return {
        ...item,
        ...patch,
        selected: patch.selected,
        includedInPortfolio: patch.selected
      };
    }
    return { ...item, ...patch };
  };

  const updateExperience = (clientId: string, patch: Partial<ResumeImportExperienceDraft>) => {
    onDraftChange({
      ...draft,
      experiences: draft.experiences.map((exp) =>
        exp.clientId === clientId ? mergeItem(exp, patch) : exp
      )
    });
  };

  const updateProject = (clientId: string, patch: Partial<ResumeImportProjectDraft>) => {
    onDraftChange({
      ...draft,
      projects: draft.projects.map((project) =>
        project.clientId === clientId ? mergeItem(project, patch) : project
      )
    });
  };

  const updateStack = (index: number, patch: Partial<ResumeImportStackDraft>) => {
    onDraftChange({
      ...draft,
      stacks: draft.stacks.map((stack, i) => (i === index ? mergeItem(stack, patch) : stack))
    });
  };

  const updateContact = (
    index: number,
    patch: Partial<ResumeImportDraft["profile"]["contacts"][number]>
  ) => {
    const contacts = [...(draft.profile.contacts ?? [])];
    contacts[index] = { ...contacts[index], ...patch };
    updateProfile("contacts", contacts);
  };

  const addContact = () => {
    updateProfile("contacts", [...(draft.profile.contacts ?? []), { type: "website", value: "" }]);
  };

  const removeContact = (index: number) => {
    updateProfile(
      "contacts",
      (draft.profile.contacts ?? []).filter((_, i) => i !== index)
    );
  };

  const setAllSelected = (kind: "experiences" | "projects" | "stacks", selected: boolean) => {
    if (kind === "experiences") {
      onDraftChange({
        ...draft,
        experiences: draft.experiences.map((e) => mergeItem(e, { selected }))
      });
      return;
    }
    if (kind === "projects") {
      onDraftChange({
        ...draft,
        projects: draft.projects.map((p) => mergeItem(p, { selected }))
      });
      return;
    }
    onDraftChange({
      ...draft,
      stacks: draft.stacks.map((s) => mergeItem(s, { selected }))
    });
  };

  const setAllStacksPortfolio = (includedInPortfolio: boolean) => {
    onDraftChange({
      ...draft,
      stacks: draft.stacks.map((s) => (s.selected ? { ...s, includedInPortfolio } : s))
    });
  };

  const handleApply = async () => {
    setError(null);
    try {
      const result = await applyMutation.mutateAsync({
        ...draft,
        objectKey: objectKey ?? undefined
      });
      toast.success("Resume import applied");
      onApplied({
        experiences: result.experiencesCreated,
        projects: result.projectsCreated,
        stacks: result.stacksUpserted
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to apply import";
      setError(message);
      toast.error(message);
    }
  };

  const handleDiscard = async () => {
    setError(null);
    try {
      if (objectKey) {
        await discardMutation.mutateAsync({ objectKey });
      }
      onDiscarded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard source");
    }
  };

  const warnings = draft.meta?.warnings ?? [];

  return (
    <div className="flex w-full flex-col gap-4 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5.5rem))]">
      {warnings.length > 0 ? (
        <AiErrorBanner notes={warnings} feature="resume" severity="partial" density="compact" />
      ) : null}

      {error ? (
        <Alert variant="error">
          <AlertTitle>Unable to apply draft</AlertTitle>
          <AlertDescription>
            {error.trim().length > 0 && error.length < 160
              ? error
              : "Check the fields below and try again."}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* coss CardFrame shell — one surface, no nested “edit” card chrome */}
      <CardFrame className="w-full">
        {draft.meta?.sourceFilename ? (
          <CardFrameHeader className="py-3">
            <CardFrameTitle className="sr-only">Review extracted data</CardFrameTitle>
            <CardFrameDescription className="truncate text-xs">
              Source · {draft.meta.sourceFilename}
            </CardFrameDescription>
          </CardFrameHeader>
        ) : null}

        <Card>
          <CardPanel className="flex flex-col gap-4 p-4 sm:p-5">
            <Tabs value={tab} onValueChange={setTab}>
              {/* p-tabs-10: underline tabs + count badges */}
              <TabsList variant="underline" className="w-full justify-start overflow-x-auto">
                <TabsTab value="profile">Profile</TabsTab>
                <TabsTab value="experiences">
                  Experiences
                  <TabCount selected={counts.experiences} total={totals.experiences} />
                </TabsTab>
                <TabsTab value="projects">
                  Projects
                  <TabCount selected={counts.projects} total={totals.projects} />
                </TabsTab>
                <TabsTab value="stacks">
                  Stacks
                  <TabCount selected={counts.stacks} total={totals.stacks} />
                </TabsTab>
              </TabsList>

              {/* —— Profile —— */}
              <TabsPanel value="profile" className="mt-5 flex max-w-3xl flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Name</FieldLabel>
                    <Input
                      value={draft.profile.name}
                      onChange={(e) => updateProfile("name", e.target.value)}
                      placeholder="Full name"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Email (optional)</FieldLabel>
                    <Input
                      type="email"
                      value={draft.profile.email ?? ""}
                      onChange={(e) => updateProfile("email", e.target.value || null)}
                      placeholder="Keep current if empty"
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Summary</FieldLabel>
                  <Textarea
                    value={draft.profile.summary ?? ""}
                    onChange={(e) => updateProfile("summary", e.target.value || null)}
                    rows={4}
                    placeholder="Professional summary"
                  />
                </Field>

                <Separator />

                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">Contacts</h3>
                  <Button type="button" size="xs" variant="outline" onClick={addContact}>
                    Add
                  </Button>
                </div>

                {(draft.profile.contacts ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    None extracted. Existing contacts stay as-is.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {(draft.profile.contacts ?? []).map((contact, index) => (
                      <div
                        key={`${contact.type}-${index}`}
                        className="grid gap-2 sm:grid-cols-[auto_8.5rem_1fr_auto] sm:items-center"
                      >
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground"
                          aria-hidden
                          title={contact.type}
                        >
                          <ContactIcon type={contact.type} className="size-3.5" />
                        </span>
                        <Select
                          value={contact.type}
                          onValueChange={(val) => {
                            if (val) updateContact(index, { type: val as typeof contact.type });
                          }}
                        >
                          <SelectTrigger size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectPopup>
                            <SelectList>
                              {CONTACT_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectList>
                          </SelectPopup>
                        </Select>
                        <Input
                          size="sm"
                          value={contact.value}
                          onChange={(e) => updateContact(index, { value: e.target.value })}
                          placeholder="Value"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => removeContact(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsPanel>

              {/* —— Experiences: accordion (p-accordion-3 multiple) —— */}
              <TabsPanel value="experiences" className="mt-5 flex flex-col gap-3">
                <BulkSelectGroup
                  label="experiences"
                  total={draft.experiences.length}
                  selected={counts.experiences}
                  onSelectAll={() => setAllSelected("experiences", true)}
                  onSelectNone={() => setAllSelected("experiences", false)}
                />
                {draft.experiences.length === 0 ? (
                  <Empty className="rounded-xl border border-dashed py-8">
                    <EmptyHeader>
                      <EmptyTitle>No experiences extracted</EmptyTitle>
                      <EmptyDescription>
                        Add them later from Experiences, or continue with projects and stacks.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <Accordion multiple className={ITEM_FLEX}>
                    {draft.experiences.map((exp) => (
                      <ReviewAccordionItem
                        key={exp.clientId}
                        value={exp.clientId}
                        selected={exp.selected}
                        onSelectedChange={(selected) =>
                          updateExperience(exp.clientId, { selected })
                        }
                        includedInPortfolio={exp.includedInPortfolio}
                        onPortfolioChange={(includedInPortfolio) =>
                          updateExperience(exp.clientId, { includedInPortfolio })
                        }
                        title={exp.title || "Untitled role"}
                        subtitle={exp.organization}
                      >
                        <DraftExperienceFields
                          value={exp}
                          onChange={(patch) => updateExperience(exp.clientId, patch)}
                        />
                      </ReviewAccordionItem>
                    ))}
                  </Accordion>
                )}
              </TabsPanel>

              {/* —— Projects —— */}
              <TabsPanel value="projects" className="mt-5 flex flex-col gap-3">
                <BulkSelectGroup
                  label="projects"
                  total={draft.projects.length}
                  selected={counts.projects}
                  onSelectAll={() => setAllSelected("projects", true)}
                  onSelectNone={() => setAllSelected("projects", false)}
                />
                {draft.projects.length === 0 ? (
                  <Empty className="rounded-xl border border-dashed py-8">
                    <EmptyHeader>
                      <EmptyTitle>No projects extracted</EmptyTitle>
                      <EmptyDescription>
                        You can add projects later from the Projects page.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <Accordion multiple className={ITEM_FLEX}>
                    {draft.projects.map((project) => (
                      <ReviewAccordionItem
                        key={project.clientId}
                        value={project.clientId}
                        selected={project.selected}
                        onSelectedChange={(selected) =>
                          updateProject(project.clientId, { selected })
                        }
                        includedInPortfolio={project.includedInPortfolio}
                        onPortfolioChange={(includedInPortfolio) =>
                          updateProject(project.clientId, { includedInPortfolio })
                        }
                        title={project.title || "Untitled project"}
                        subtitle={String(project.year)}
                      >
                        <DraftProjectFields
                          value={project}
                          experienceOptions={experienceOptions}
                          stackNameOptions={draft.stacks.map((s) => s.name).filter(Boolean)}
                          onChange={(patch) => updateProject(project.clientId, patch)}
                        />
                      </ReviewAccordionItem>
                    ))}
                  </Accordion>
                )}
              </TabsPanel>

              {/* —— Stacks: dense table (p-table card style), not 44 full forms —— */}
              <TabsPanel value="stacks" className="mt-5 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <BulkSelectGroup
                    label="stacks"
                    total={draft.stacks.length}
                    selected={counts.stacks}
                    onSelectAll={() => setAllSelected("stacks", true)}
                    onSelectNone={() => setAllSelected("stacks", false)}
                  />
                  {counts.stacks > 0 ? (
                    <Group aria-label="Portfolio for selected stacks">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => setAllStacksPortfolio(true)}
                      >
                        Show on portfolio
                      </Button>
                      <GroupSeparator />
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => setAllStacksPortfolio(false)}
                      >
                        Hide from portfolio
                      </Button>
                    </Group>
                  ) : null}
                </div>

                {draft.stacks.length === 0 ? (
                  <Empty className="rounded-xl border border-dashed py-8">
                    <EmptyHeader>
                      <EmptyTitle>No stacks extracted</EmptyTitle>
                      <EmptyDescription>
                        Skills can be added or detected from GitHub later.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div
                    className={cn(
                      "grid w-full gap-2",
                      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                    )}
                  >
                    {draft.stacks.map((stack, index) => (
                      <div
                        key={`${stack.name}-${index}`}
                        className={cn(
                          "flex min-w-0 flex-col gap-2 rounded-xl border p-3 transition-[border-color,opacity,background-color] duration-150",
                          stack.selected
                            ? "border-border/80 bg-card"
                            : "border-border/40 bg-muted/10 opacity-70"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <Checkbox
                            aria-label={`Import ${stack.name || "stack"}`}
                            checked={stack.selected}
                            className="mt-1"
                            onCheckedChange={(v) => updateStack(index, { selected: !!v })}
                          />
                          <Input
                            size="sm"
                            value={stack.name}
                            disabled={!stack.selected}
                            onChange={(e) => updateStack(index, { name: e.target.value })}
                            aria-label="Stack name"
                            className="min-w-0 flex-1 font-medium"
                          />
                          <Switch
                            key={`stack-pf-${index}-${stack.selected ? "s" : "u"}-${stack.includedInPortfolio ? "1" : "0"}`}
                            checked={stack.selected && stack.includedInPortfolio}
                            disabled={!stack.selected}
                            onCheckedChange={(v) => updateStack(index, { includedInPortfolio: v })}
                            aria-label={`${stack.name} on portfolio`}
                            className="mt-0.5 shrink-0 [--thumb-size:--spacing(3.5)]"
                          />
                        </div>
                        <Select
                          value={stack.type ?? ""}
                          disabled={!stack.selected}
                          onValueChange={(val) => {
                            updateStack(index, {
                              type: typeof val === "string" && val.length > 0 ? val : null
                            });
                          }}
                          items={[
                            { value: "", label: "Type…" },
                            ...STACK_TYPE_ITEMS.map((t) => {
                              return {
                                value: t.value,
                                label: t.label
                              };
                            })
                          ]}
                        >
                          <SelectTrigger size="sm" className="w-full min-w-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectPopup>
                            <SelectList>
                              <SelectItem value="">Type…</SelectItem>
                              {STACK_TYPE_ITEMS.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectList>
                          </SelectPopup>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Descriptions can be added later from Stacks. Import is name + type.
                </p>
              </TabsPanel>
            </Tabs>
          </CardPanel>
        </Card>
      </CardFrame>

      {/* Sticky within main scroll — not viewport-fixed (avoids covering app chrome) */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border/70 bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-backdrop-filter:bg-background/90 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-xs text-muted-foreground tabular-nums sm:text-sm">
            <span className="font-medium text-foreground">{totalSelected}</span>
            {" selected · "}
            {counts.experiences}/{totals.experiences} exp · {counts.projects}/{totals.projects}{" "}
            projects · {counts.stacks}/{totals.stacks} stacks
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              disabled={applyMutation.isPending || discardMutation.isPending}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={discardMutation.isPending}
              disabled={applyMutation.isPending}
              onClick={() => setDiscardOpen(true)}
            >
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              loading={applyMutation.isPending}
              disabled={discardMutation.isPending || !canApply}
              title={
                !canApply
                  ? "Select at least one item or fill in profile fields to import"
                  : undefined
              }
              onClick={() => void handleApply()}
            >
              Apply import
            </Button>
          </div>
        </div>
        {!canApply ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Select experiences, projects, or stacks — or edit the profile — before applying.
          </p>
        ) : null}
      </div>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this import?</AlertDialogTitle>
            <AlertDialogDescription>
              The review draft and uploaded resume will be removed. You can start over from upload.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Keep editing</AlertDialogClose>
            <Button
              type="button"
              variant="destructive"
              loading={discardMutation.isPending}
              onClick={() => {
                void handleDiscard().then(() => setDiscardOpen(false));
              }}
            >
              Discard draft
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}
