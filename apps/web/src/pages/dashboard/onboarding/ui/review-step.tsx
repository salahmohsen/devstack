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
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@tsu-stack/ui/components/card";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
import { Field, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";
import { Label } from "@tsu-stack/ui/components/label";
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

import { useApplyOnboardingMutation, useDiscardSourceMutation } from "@/features/onboarding";

const CONTACT_TYPES = contactTypeSchema.options;

export type ReviewStepProps = {
  draft: ResumeImportDraft;
  objectKey: string | null;
  onDraftChange: (draft: ResumeImportDraft) => void;
  onBack: () => void;
  onApplied: () => void;
  onDiscarded: () => void;
};

function PortfolioToggle({
  checked,
  disabled,
  onCheckedChange
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <Label className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
      Show on portfolio
    </Label>
  );
}

function SelectionRow({
  selected,
  onSelectedChange,
  title,
  subtitle,
  children,
  includedInPortfolio,
  onPortfolioChange
}: {
  selected: boolean;
  onSelectedChange: (next: boolean) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  includedInPortfolio: boolean;
  onPortfolioChange: (next: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        selected ? "border-border bg-background" : "border-border/60 bg-muted/20 opacity-80"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Label className="flex min-w-0 flex-1 items-start gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={(value) => onSelectedChange(!!value)}
            className="mt-0.5"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">{title}</span>
            {subtitle ? (
              <span className="block text-xs text-muted-foreground">{subtitle}</span>
            ) : null}
          </span>
        </Label>
        <PortfolioToggle
          checked={includedInPortfolio}
          disabled={!selected}
          onCheckedChange={onPortfolioChange}
        />
      </div>
      {selected ? children : null}
    </div>
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

  const counts = useMemo(() => {
    return {
      experiences: draft.experiences.filter((e) => e.selected).length,
      projects: draft.projects.filter((p) => p.selected).length,
      stacks: draft.stacks.filter((s) => s.selected).length
    };
  }, [draft]);

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

  const updateExperience = (clientId: string, patch: Partial<ResumeImportExperienceDraft>) => {
    onDraftChange({
      ...draft,
      experiences: draft.experiences.map((exp) =>
        exp.clientId === clientId
          ? {
              ...exp,
              ...patch,
              ...(patch.selected === false ? { includedInPortfolio: false } : {})
            }
          : exp
      )
    });
  };

  const updateProject = (clientId: string, patch: Partial<ResumeImportProjectDraft>) => {
    onDraftChange({
      ...draft,
      projects: draft.projects.map((project) =>
        project.clientId === clientId
          ? {
              ...project,
              ...patch,
              ...(patch.selected === false ? { includedInPortfolio: false } : {})
            }
          : project
      )
    });
  };

  const updateStack = (index: number, patch: Partial<ResumeImportStackDraft>) => {
    onDraftChange({
      ...draft,
      stacks: draft.stacks.map((stack, i) =>
        i === index
          ? {
              ...stack,
              ...patch,
              ...(patch.selected === false ? { includedInPortfolio: false } : {})
            }
          : stack
      )
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

  const handleApply = async () => {
    setError(null);
    try {
      await applyMutation.mutateAsync({
        ...draft,
        objectKey: objectKey ?? undefined
      });
      toast.success("Resume import applied");
      onApplied();
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-28">
      <Card>
        <CardHeader>
          <CardTitle>Review import</CardTitle>
          <CardDescription>
            Edit extracted data, choose what to import, and decide what appears on your portfolio.
            {draft.meta?.sourceFilename ? (
              <>
                {" "}
                Source:{" "}
                <span className="font-medium text-foreground">{draft.meta.sourceFilename}</span>
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {warnings.length > 0 ? (
            <Alert variant="warning">
              <AlertTitle>Notes from extract</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 ps-4">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="error">
              <AlertTitle>Apply failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList variant="underline" className="w-full justify-start overflow-x-auto">
              <TabsTab value="profile">Profile</TabsTab>
              <TabsTab value="experiences">
                Experiences
                <span className="text-muted-foreground">({counts.experiences})</span>
              </TabsTab>
              <TabsTab value="projects">
                Projects
                <span className="text-muted-foreground">({counts.projects})</span>
              </TabsTab>
              <TabsTab value="stacks">
                Stacks
                <span className="text-muted-foreground">({counts.stacks})</span>
              </TabsTab>
            </TabsList>

            <TabsPanel value="profile" className="mt-4 flex flex-col gap-4">
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
                    placeholder="Leave empty to keep current email"
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
                <Button type="button" size="sm" variant="outline" onClick={addContact}>
                  Add contact
                </Button>
              </div>

              {(draft.profile.contacts ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No contacts in draft. Empty contacts leave your existing ones unchanged.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(draft.profile.contacts ?? []).map((contact, index) => (
                    <div
                      key={`${contact.type}-${index}`}
                      className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[10rem_1fr_auto]"
                    >
                      <Select
                        value={contact.type}
                        onValueChange={(val) => {
                          if (val) updateContact(index, { type: val as typeof contact.type });
                        }}
                      >
                        <SelectTrigger>
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
                        value={contact.value}
                        onChange={(e) => updateContact(index, { value: e.target.value })}
                        placeholder="Value"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsPanel>

            <TabsPanel value="experiences" className="mt-4 flex flex-col gap-3">
              {draft.experiences.length === 0 ? (
                <p className="text-sm text-muted-foreground">No experiences extracted.</p>
              ) : (
                draft.experiences.map((exp) => (
                  <SelectionRow
                    key={exp.clientId}
                    selected={exp.selected}
                    onSelectedChange={(selected) => updateExperience(exp.clientId, { selected })}
                    includedInPortfolio={exp.includedInPortfolio}
                    onPortfolioChange={(includedInPortfolio) =>
                      updateExperience(exp.clientId, { includedInPortfolio })
                    }
                    title={exp.title || "Untitled role"}
                    subtitle={exp.organization}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel>Title</FieldLabel>
                        <Input
                          value={exp.title}
                          onChange={(e) =>
                            updateExperience(exp.clientId, { title: e.target.value })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Organization</FieldLabel>
                        <Input
                          value={exp.organization}
                          onChange={(e) =>
                            updateExperience(exp.clientId, { organization: e.target.value })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel>From</FieldLabel>
                        <Input
                          value={exp.fromDate ?? ""}
                          onChange={(e) =>
                            updateExperience(exp.clientId, {
                              fromDate: e.target.value || null
                            })
                          }
                          placeholder="YYYY-MM or YYYY-MM-DD"
                        />
                      </Field>
                      <Field>
                        <FieldLabel>To</FieldLabel>
                        <Input
                          value={exp.toDate ?? ""}
                          disabled={exp.isPresent}
                          onChange={(e) =>
                            updateExperience(exp.clientId, {
                              toDate: e.target.value || null
                            })
                          }
                          placeholder="YYYY-MM or YYYY-MM-DD"
                        />
                      </Field>
                    </div>
                    <Label className="flex items-center gap-2 text-sm font-normal">
                      <Checkbox
                        checked={!!exp.isPresent}
                        onCheckedChange={(value) =>
                          updateExperience(exp.clientId, {
                            isPresent: !!value,
                            ...(value ? { toDate: null } : {})
                          })
                        }
                      />
                      Present role
                    </Label>
                    <Field>
                      <FieldLabel>Description</FieldLabel>
                      <Textarea
                        value={exp.description}
                        onChange={(e) =>
                          updateExperience(exp.clientId, { description: e.target.value })
                        }
                        rows={3}
                      />
                    </Field>
                  </SelectionRow>
                ))
              )}
            </TabsPanel>

            <TabsPanel value="projects" className="mt-4 flex flex-col gap-3">
              {draft.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects extracted.</p>
              ) : (
                draft.projects.map((project) => (
                  <SelectionRow
                    key={project.clientId}
                    selected={project.selected}
                    onSelectedChange={(selected) => updateProject(project.clientId, { selected })}
                    includedInPortfolio={project.includedInPortfolio}
                    onPortfolioChange={(includedInPortfolio) =>
                      updateProject(project.clientId, { includedInPortfolio })
                    }
                    title={project.title || "Untitled project"}
                    subtitle={String(project.year)}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel>Title</FieldLabel>
                        <Input
                          value={project.title}
                          onChange={(e) =>
                            updateProject(project.clientId, { title: e.target.value })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Year</FieldLabel>
                        <Input
                          type="number"
                          value={project.year}
                          onChange={(e) =>
                            updateProject(project.clientId, {
                              year: Number(e.target.value) || new Date().getFullYear()
                            })
                          }
                        />
                      </Field>
                      <Field className="sm:col-span-2">
                        <FieldLabel>Parent experience</FieldLabel>
                        <Select
                          value={project.experienceClientId ?? ""}
                          onValueChange={(val) =>
                            updateProject(project.clientId, {
                              experienceClientId: val && val.length > 0 ? val : null
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectPopup>
                            <SelectList>
                              <SelectItem value="">None</SelectItem>
                              {experienceOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectList>
                          </SelectPopup>
                        </Select>
                      </Field>
                      <Field className="sm:col-span-2">
                        <FieldLabel>Stacks (comma-separated)</FieldLabel>
                        <Input
                          value={project.stackNames.join(", ")}
                          onChange={(e) =>
                            updateProject(project.clientId, {
                              stackNames: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean)
                            })
                          }
                          placeholder="React, TypeScript"
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel>Summary</FieldLabel>
                      <Input
                        value={project.summary}
                        onChange={(e) =>
                          updateProject(project.clientId, { summary: e.target.value })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Description</FieldLabel>
                      <Textarea
                        value={project.description}
                        onChange={(e) =>
                          updateProject(project.clientId, { description: e.target.value })
                        }
                        rows={3}
                      />
                    </Field>
                  </SelectionRow>
                ))
              )}
            </TabsPanel>

            <TabsPanel value="stacks" className="mt-4 flex flex-col gap-3">
              {draft.stacks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stacks extracted.</p>
              ) : (
                draft.stacks.map((stack, index) => (
                  <SelectionRow
                    key={`${stack.name}-${index}`}
                    selected={stack.selected}
                    onSelectedChange={(selected) => updateStack(index, { selected })}
                    includedInPortfolio={stack.includedInPortfolio}
                    onPortfolioChange={(includedInPortfolio) =>
                      updateStack(index, { includedInPortfolio })
                    }
                    title={stack.name || "Untitled stack"}
                    subtitle={stack.type ?? undefined}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel>Name</FieldLabel>
                        <Input
                          value={stack.name}
                          onChange={(e) => updateStack(index, { name: e.target.value })}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Type</FieldLabel>
                        <Input
                          value={stack.type ?? ""}
                          onChange={(e) => updateStack(index, { type: e.target.value || null })}
                          placeholder="framework, language, …"
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel>Description</FieldLabel>
                      <Textarea
                        value={stack.description ?? ""}
                        onChange={(e) =>
                          updateStack(index, { description: e.target.value || null })
                        }
                        rows={2}
                      />
                    </Field>
                  </SelectionRow>
                ))
              )}
            </TabsPanel>
          </Tabs>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="text-xs text-muted-foreground sm:text-sm">
            Importing {counts.experiences} exp · {counts.projects} projects · {counts.stacks} stacks
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              disabled={applyMutation.isPending || discardMutation.isPending}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="outline"
              loading={discardMutation.isPending}
              disabled={applyMutation.isPending}
              onClick={() => void handleDiscard()}
            >
              Discard
            </Button>
            <Button
              type="button"
              loading={applyMutation.isPending}
              disabled={discardMutation.isPending}
              onClick={() => void handleApply()}
            >
              Apply import
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
