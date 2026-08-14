"use client";

import { useStore } from "@tanstack/react-form";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  FilterIcon,
  Gift,
  Inbox,
  Mail,
  Sparkles,
  Trash2Icon,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  CreateMailSmartRuleInputSchema,
  type MailCategoryIcon,
  type MailSmartRule
} from "@tsu-stack/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { Switch } from "@tsu-stack/ui/components/switch";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";

import {
  useCreateMailSmartRuleMutation,
  useDeleteMailSmartRuleMutation,
  useListMailSmartRulesQuery,
  useUpdateMailSmartRuleMutation
} from "@/features/mail-smart-rules";

import { useSettingsDirtyGuard } from "./settings-dirty-guard";
import { SettingsFrame } from "./settings-frame";
import { SettingsSaveBar } from "./settings-save-bar";
import { SettingsSection } from "./settings-section";

const ICONS: Record<MailCategoryIcon, typeof Sparkles> = {
  briefcase: BriefcaseBusiness,
  users: Users,
  calendar: CalendarDays,
  gift: Gift,
  inbox: Inbox,
  mail: Mail,
  sparkles: Sparkles,
  bell: Bell
};

const RULE_ICON_CHOICES: MailCategoryIcon[] = [
  "sparkles",
  "inbox",
  "mail",
  "briefcase",
  "users",
  "calendar",
  "gift"
];

const RULE_ICON_OPTIONS = RULE_ICON_CHOICES.map((value) => {
  return {
    value,
    label: value,
    icon: ICONS[value]
  };
});

const EMPTY_RULE = {
  title: "",
  description: "",
  keywords: [] as string[],
  icon: "sparkles" as MailCategoryIcon
};

const RULES_DESCRIPTION = (
  <>
    Custom Career Inbox categories. The AI classifier applies them as{" "}
    <code className="text-xs">rule:…</code> during classify and show in the mail sidebar.
  </>
);

function hintsFromRules(rules: MailSmartRule[]): Record<string, string[]> {
  return Object.fromEntries(rules.map((rule) => [rule.id, [...rule.keywords]]));
}

function sameKeywords(left: string[] | undefined, right: string[]): boolean {
  const a = left ?? [];
  if (a.length !== right.length) return false;
  return a.every((value, index) => value === right[index]);
}

export function SmartRulesSettings() {
  const list = useListMailSmartRulesQuery();

  if (list.isLoading) {
    return (
      <SettingsFrame
        title="Smart rules"
        icon={<FilterIcon className="size-4 opacity-80" aria-hidden />}
        description={RULES_DESCRIPTION}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading rules…
        </div>
      </SettingsFrame>
    );
  }

  if (list.isError) {
    return (
      <SettingsFrame
        title="Smart rules"
        icon={<FilterIcon className="size-4 opacity-80" aria-hidden />}
        description="Couldn’t load your rules."
      >
        <Button type="button" size="sm" variant="outline" onClick={() => void list.refetch()}>
          Retry
        </Button>
      </SettingsFrame>
    );
  }

  return <SmartRulesLoaded rules={list.data ?? []} />;
}

function SmartRulesLoaded({ rules }: { rules: MailSmartRule[] }) {
  const update = useUpdateMailSmartRuleMutation();
  const del = useDeleteMailSmartRuleMutation();

  const form = useAppForm({
    defaultValues: { keywordsById: hintsFromRules(rules) },
    onSubmit: async ({ value }) => {
      const dirty = rules.filter(
        (rule) => !sameKeywords(value.keywordsById[rule.id], rule.keywords)
      );
      if (dirty.length === 0) return;
      try {
        await Promise.all(
          dirty.map((rule) =>
            update.mutateAsync({
              id: rule.id,
              keywords: value.keywordsById[rule.id] ?? []
            })
          )
        );
        form.reset({
          keywordsById: hintsFromRules(
            rules.map((rule) => {
              const next = value.keywordsById[rule.id];
              return next ? { ...rule, keywords: next } : rule;
            })
          )
        });
        toast.success("Hints saved");
      } catch {
        toast.error("Could not save hints");
      }
    }
  });

  const serverKey = useMemo(
    () => rules.map((rule) => `${rule.id}:${rule.keywords.join("\u0001")}`).join("|"),
    [rules]
  );

  useEffect(() => {
    const current = form.getFieldValue("keywordsById") ?? {};
    const dirty = rules.some((rule) => !sameKeywords(current[rule.id], rule.keywords));
    if (!dirty) {
      form.reset({ keywordsById: hintsFromRules(rules) });
      return;
    }
    const missing = rules.filter((rule) => !(rule.id in current));
    if (missing.length === 0) return;
    const next = { ...current };
    for (const rule of missing) {
      next[rule.id] = [...rule.keywords];
    }
    form.setFieldValue("keywordsById", next);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- sync when the server list changes
  }, [serverKey]);

  const isDirty = useStore(form.store, (state) =>
    rules.some((rule) => !sameKeywords(state.values.keywordsById[rule.id], rule.keywords))
  );
  const valuesKey = useStore(form.store, (state) =>
    rules
      .map((rule) => `${rule.id}:${(state.values.keywordsById[rule.id] ?? []).join("\u0001")}`)
      .join("|")
  );

  const discard = () => {
    form.reset({ keywordsById: hintsFromRules(rules) });
  };

  const leaveGuard = useSettingsDirtyGuard(isDirty, { onDiscard: discard });
  const busy = update.isPending || del.isPending;

  return (
    <>
      {leaveGuard.alertDialog}
      <SettingsFrame
        title="Smart rules"
        icon={<FilterIcon className="size-4 opacity-80" aria-hidden />}
        description={RULES_DESCRIPTION}
        actions={
          <SettingsSaveBar
            dirty={isDirty}
            saving={update.isPending}
            statusKey={valuesKey}
            onSave={() => void form.handleSubmit()}
            onDiscard={discard}
            saveLabel="Save"
          />
        }
      >
        <Form
          className="space-y-8"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <SettingsSection
            title="Your rules"
            description="Toggle, edit AI hints, or remove a filter. Classification is semantic — not exact keyword match."
          >
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rules yet. Create one below.</p>
            ) : (
              <ul className="space-y-3">
                {rules.map((rule) => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    busy={busy}
                    hintsField={
                      <form.AppField name={`keywordsById.${rule.id}`}>
                        {(field) => (
                          <field.TagsField
                            label="AI hints"
                            placeholder="Add a semantic hint"
                            disabled={busy}
                            hint={null}
                            maxItems={40}
                            maxItemLength={80}
                          />
                        )}
                      </form.AppField>
                    }
                    onToggle={(enabled) => {
                      update.mutate({ id: rule.id, enabled });
                    }}
                    onDelete={() => {
                      del.mutate({ id: rule.id });
                    }}
                  />
                ))}
              </ul>
            )}
          </SettingsSection>
        </Form>

        <SettingsSection
          title="New rule"
          description="Title is required. Description and hints teach the AI when to apply this filter."
        >
          <NewRuleForm />
        </SettingsSection>
      </SettingsFrame>
    </>
  );
}

function NewRuleForm() {
  const create = useCreateMailSmartRuleMutation();

  const form = useAppForm({
    defaultValues: EMPTY_RULE,
    validators: {
      onChange: createZodFormValidator(CreateMailSmartRuleInputSchema)
    },
    onSubmit: async ({ value }) => {
      try {
        await create.mutateAsync({
          title: value.title.trim(),
          description: value.description.trim(),
          keywords: value.keywords,
          icon: value.icon
        });
        form.reset(EMPTY_RULE);
        toast.success("Rule created");
      } catch {
        toast.error("Could not create rule");
      }
    }
  });

  return (
    <Form
      className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <FieldGroup className="gap-3">
        <form.AppField name="title">
          {(field) => <field.InputField label="Title" placeholder="e.g. Visa / immigration" />}
        </form.AppField>
        <form.AppField name="description">
          {(field) => (
            <field.InputField label="Description" placeholder="Shown on the mail category nav" />
          )}
        </form.AppField>
        <form.AppField name="keywords">
          {(field) => (
            <field.TagsField
              label="AI hints (optional)"
              placeholder="e.g. visa, H1B, immigration"
              description="Hints for the AI classifier — not exact string matching. Title and description matter most."
              maxItems={40}
              maxItemLength={80}
              hint={null}
            />
          )}
        </form.AppField>
        <form.AppField name="icon">
          {(field) => <field.IconChoiceField label="Icon" options={RULE_ICON_OPTIONS} />}
        </form.AppField>
      </FieldGroup>
      <form.AppForm>
        <form.SubmitButton isLoading={create.isPending} size="sm">
          Create rule
        </form.SubmitButton>
      </form.AppForm>
    </Form>
  );
}

function RuleRow({
  rule,
  busy,
  hintsField,
  onToggle,
  onDelete
}: {
  rule: MailSmartRule;
  busy: boolean;
  hintsField: ReactNode;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  const Icon = ICONS[rule.icon] ?? Sparkles;
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <li className="space-y-3 rounded-xl border border-border/80 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-3.5 opacity-80" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{rule.title}</p>
              <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                rule:{rule.slug}
              </Badge>
              {!rule.enabled ? (
                <Badge variant="secondary" size="sm">
                  Off
                </Badge>
              ) : null}
            </div>
            {rule.description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{rule.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={rule.enabled}
            disabled={busy}
            onCheckedChange={onToggle}
            aria-label={`Enable ${rule.title}`}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground"
            disabled={busy}
            onClick={() => setDeleteOpen(true)}
            aria-label={`Delete ${rule.title}`}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>
      {hintsField}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{rule.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              New mail will no longer be offered the{" "}
              <code className="text-xs">rule:{rule.slug}</code> filter to the AI classifier.
              Existing labels on messages are not removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={busy}
              onClick={() => {
                onDelete();
                setDeleteOpen(false);
              }}
            >
              Delete rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </li>
  );
}
