"use client";

import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2Icon,
  FilterIcon,
  Gift,
  Inbox,
  Mail,
  PencilIcon,
  PlusIcon,
  Sparkles,
  Trash2Icon,
  Users
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

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
import { Card } from "@tsu-stack/ui/components/card";
import {
  Dialog,
  DialogAction,
  DialogCancel,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { Switch } from "@tsu-stack/ui/components/switch";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { useFormDirtyGuard } from "@/shared/ui/form-dirty-guard";

import {
  useCreateMailSmartRuleMutation,
  useDeleteMailSmartRuleMutation,
  useListMailSmartRulesQuery,
  useUpdateMailSmartRuleMutation
} from "@/features/mail-smart-rules";

import { ItemsEmpty } from "@/widgets/items-page";

import { SettingsFrame } from "./settings-frame";

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

function valuesFromRule(rule: MailSmartRule | null) {
  if (!rule) return EMPTY_RULE;
  return {
    title: rule.title,
    description: rule.description,
    keywords: [...rule.keywords],
    icon: rule.icon
  };
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
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MailSmartRule | null>(null);

  const busy = update.isPending || del.isPending;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(rule: MailSmartRule) {
    setEditing(rule);
    setFormOpen(true);
  }

  return (
    <>
      <SettingsFrame
        title="Smart rules"
        icon={<FilterIcon className="size-4 opacity-80" aria-hidden />}
        description={RULES_DESCRIPTION}
        actions={
          <Button type="button" size="sm" variant="outline" onClick={openCreate}>
            <PlusIcon className="size-3.5" aria-hidden />
            Create rule
          </Button>
        }
      >
        {rules.length === 0 ? (
          <ItemsEmpty
            title="No rules yet"
            description="Create a filter the AI can apply when classifying Career Inbox mail."
            icon={<FilterIcon />}
            action={
              <Button type="button" size="sm" variant="outline" onClick={openCreate}>
                <PlusIcon className="size-3.5" aria-hidden />
                Create rule
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rules.map((rule) => (
              <li key={rule.id} className="min-h-0">
                <RuleCard
                  rule={rule}
                  busy={busy}
                  isDeleting={del.isPending && del.variables?.id === rule.id}
                  onToggle={(enabled) => {
                    update.mutate({ id: rule.id, enabled });
                  }}
                  onEdit={() => openEdit(rule)}
                  onDelete={() => {
                    del.mutate({ id: rule.id });
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </SettingsFrame>

      <RuleFormDialog
        open={formOpen}
        rule={editing}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
    </>
  );
}

function RuleMark({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg bg-background",
        "shadow-[0_0_0_1px_oklch(0_0_0/0.1)] dark:shadow-[0_0_0_1px_oklch(1_0_0/0.1)]"
      )}
    >
      {children}
    </div>
  );
}

function RuleStatusBadge({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <Badge variant="success" size="sm" className="gap-1">
        <CheckCircle2Icon className="size-3" aria-hidden />
        On
      </Badge>
    );
  }
  return (
    <Badge variant="outline" size="sm">
      Off
    </Badge>
  );
}

function RuleMeta({ rows }: { rows: Array<{ label: string; value: string } | null | undefined> }) {
  const visible = rows.filter((row): row is { label: string; value: string } =>
    Boolean(row?.value.trim())
  );
  if (visible.length === 0) return null;

  return (
    <dl className="space-y-1">
      {visible.map((row) => (
        <div key={row.label} className="flex min-w-0 items-baseline gap-1.5 text-xs">
          <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
          <span className="shrink-0 text-muted-foreground/70" aria-hidden>
            ·
          </span>
          <dd className="min-w-0 truncate text-foreground" title={row.value}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function RuleCard({
  rule,
  busy,
  isDeleting,
  onToggle,
  onEdit,
  onDelete
}: {
  rule: MailSmartRule;
  busy: boolean;
  isDeleting: boolean;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = ICONS[rule.icon] ?? Sparkles;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const hintCount = rule.keywords.length;
  const description =
    rule.description.trim() || "Used by the AI classifier as a Career Inbox filter.";

  return (
    <>
      <Card className="flex h-full min-h-0 flex-col gap-0 overflow-hidden p-0">
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <RuleMark>
              <Icon className="size-5 opacity-80" aria-hidden />
            </RuleMark>
            <RuleStatusBadge enabled={rule.enabled} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold tracking-tight text-pretty">{rule.title}</h3>
            <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
              {description}
            </p>
          </div>
          <RuleMeta
            rows={[
              { label: "Filter", value: `rule:${rule.slug}` },
              hintCount > 0
                ? {
                    label: "Hints",
                    value: hintCount === 1 ? (rule.keywords[0] ?? "1 hint") : `${hintCount} hints`
                  }
                : null
            ]}
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
          <div className="flex min-h-7 min-w-10 items-center">
            <Switch
              checked={rule.enabled}
              disabled={busy}
              onCheckedChange={onToggle}
              aria-label={rule.enabled ? `Turn off ${rule.title}` : `Turn on ${rule.title}`}
              title={rule.enabled ? "On — used during classify" : "Off — skipped during classify"}
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onEdit}>
              <PencilIcon className="size-3.5" aria-hidden />
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive-outline"
              loading={isDeleting}
              disabled={busy && !isDeleting}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon className="size-3.5" aria-hidden />
              Delete
            </Button>
          </div>
        </div>
      </Card>

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
              loading={isDeleting}
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
    </>
  );
}

function RuleFormDialog({
  open,
  rule,
  onOpenChange
}: {
  open: boolean;
  rule: MailSmartRule | null;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = rule != null;
  const create = useCreateMailSmartRuleMutation();
  const update = useUpdateMailSmartRuleMutation();
  const pending = create.isPending || update.isPending;

  const form = useAppForm({
    defaultValues: valuesFromRule(rule),
    validators: {
      onChange: createZodFormValidator(CreateMailSmartRuleInputSchema)
    },
    onSubmit: async ({ value }) => {
      try {
        if (isEdit) {
          await update.mutateAsync({
            id: rule.id,
            title: value.title.trim(),
            description: value.description.trim(),
            keywords: value.keywords,
            icon: value.icon
          });
        } else {
          await create.mutateAsync({
            title: value.title.trim(),
            description: value.description.trim(),
            keywords: value.keywords,
            icon: value.icon
          });
        }
        form.reset(EMPTY_RULE);
        onOpenChange(false);
      } catch {
        // Mutation hook already toasts.
      }
    }
  });

  useEffect(() => {
    if (!open) return;
    form.reset(valuesFromRule(rule));
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- seed fields when the dialog opens
  }, [open, rule?.id, rule?.updatedAt]);

  const close = () => onOpenChange(false);
  const { alertDialog, handleCloseAttempt } = useFormDirtyGuard(form, close);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) {
            onOpenChange(true);
            return;
          }
          handleCloseAttempt();
        }}
      >
        <DialogPopup showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit rule" : "New rule"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Changes apply to new mail. Existing labels on messages stay put."
                : "Title is required. Description and hints teach the AI when to apply this filter."}
            </DialogDescription>
          </DialogHeader>
          <Form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (pending) return;
              void form.handleSubmit();
            }}
          >
            <DialogPanel>
              <FieldGroup className="gap-3">
                <form.AppField name="title">
                  {(field) => (
                    <field.InputField label="Title" placeholder="e.g. Visa / immigration" />
                  )}
                </form.AppField>
                <form.AppField name="description">
                  {(field) => (
                    <field.InputField
                      label="Description"
                      placeholder="Shown on the mail category nav"
                    />
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
            </DialogPanel>
            <DialogFooter>
              <DialogCancel disabled={pending}>Cancel</DialogCancel>
              <DialogAction
                loading={pending}
                onClick={() => {
                  if (pending) return;
                  void form.handleSubmit();
                }}
              >
                {isEdit ? "Save rule" : "Create rule"}
              </DialogAction>
            </DialogFooter>
          </Form>
        </DialogPopup>
      </Dialog>
      {alertDialog}
    </>
  );
}
