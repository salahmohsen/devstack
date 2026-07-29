"use client";

import {
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
import { useState } from "react";

import { type MailCategoryIcon, type MailSmartRule } from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";
import { Input } from "@tsu-stack/ui/components/input";
import { Label } from "@tsu-stack/ui/components/label";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { Switch } from "@tsu-stack/ui/components/switch";
import { Textarea } from "@tsu-stack/ui/components/textarea";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  useCreateMailSmartRuleMutation,
  useDeleteMailSmartRuleMutation,
  useListMailSmartRulesQuery,
  useUpdateMailSmartRuleMutation
} from "@/features/mail-smart-rules";

import { SettingsSection } from "./settings-section";

const ICONS: Record<MailCategoryIcon, typeof Sparkles> = {
  briefcase: BriefcaseBusiness,
  users: Users,
  calendar: CalendarDays,
  gift: Gift,
  inbox: Inbox,
  mail: Mail,
  sparkles: Sparkles
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

export function SmartRulesSettings() {
  const list = useListMailSmartRulesQuery();
  const create = useCreateMailSmartRuleMutation();
  const update = useUpdateMailSmartRuleMutation();
  const del = useDeleteMailSmartRuleMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [icon, setIcon] = useState<MailCategoryIcon>("sparkles");

  const rules = list.data ?? [];

  async function handleCreate() {
    const keywords = keywordsText
      .split(/[,;\n]/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      keywords,
      icon
    });
    setTitle("");
    setDescription("");
    setKeywordsText("");
    setIcon("sparkles");
  }

  if (list.isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Loading rules…
      </div>
    );
  }

  return (
    <Frame>
      <FrameHeader>
        <FrameTitle className="flex items-center gap-2">
          <FilterIcon className="size-4 opacity-80" aria-hidden />
          Smart rules
        </FrameTitle>
        <FrameDescription>
          Custom Career Inbox categories. Keywords auto-label mail as{" "}
          <code className="text-xs">rule:…</code> during classify and show in the mail sidebar.
        </FrameDescription>
      </FrameHeader>

      <FramePanel className="space-y-8">
        <SettingsSection title="Your rules" description="Toggle, edit keywords, or remove a rule.">
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules yet. Create one below.</p>
          ) : (
            <ul className="space-y-3">
              {rules.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  busy={update.isPending || del.isPending}
                  onToggle={(enabled) => {
                    update.mutate({ id: rule.id, enabled });
                  }}
                  onSaveKeywords={(keywords) => {
                    update.mutate({ id: rule.id, keywords });
                  }}
                  onDelete={() => {
                    del.mutate({ id: rule.id });
                  }}
                />
              ))}
            </ul>
          )}
        </SettingsSection>

        <SettingsSection
          title="New rule"
          description="Title is required. Keywords are optional but recommended."
        >
          <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="rule-title">Title</Label>
              <Input
                id="rule-title"
                value={title}
                placeholder="e.g. Visa / immigration"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-desc">Description</Label>
              <Input
                id="rule-desc"
                value={description}
                placeholder="Shown on the mail category nav"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-kw">Keywords</Label>
              <Textarea
                id="rule-kw"
                rows={3}
                value={keywordsText}
                placeholder="Comma-separated: visa, H1B, immigration"
                onChange={(e) => setKeywordsText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Any keyword match (case-insensitive) labels the message with this rule.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-1.5">
                {RULE_ICON_CHOICES.map((key) => {
                  const Icon = ICONS[key];
                  const active = icon === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIcon(key)}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg border transition-colors",
                        active
                          ? "border-foreground bg-background shadow-xs"
                          : "border-border/80 text-muted-foreground hover:bg-background/60"
                      )}
                      aria-label={key}
                      aria-pressed={active}
                    >
                      <Icon className="size-4" aria-hidden />
                    </button>
                  );
                })}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!title.trim() || create.isPending}
              onClick={() => {
                void handleCreate();
              }}
            >
              {create.isPending ? "Creating…" : "Create rule"}
            </Button>
          </div>
        </SettingsSection>
      </FramePanel>
    </Frame>
  );
}

function RuleRow({
  rule,
  busy,
  onToggle,
  onSaveKeywords,
  onDelete
}: {
  rule: MailSmartRule;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
  onSaveKeywords: (keywords: string[]) => void;
  onDelete: () => void;
}) {
  const Icon = ICONS[rule.icon] ?? Sparkles;
  const [kw, setKw] = useState(rule.keywords.join(", "));
  const dirty = kw !== rule.keywords.join(", ");

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
            onClick={onDelete}
            aria-label={`Delete ${rule.title}`}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <Label className="text-xs" htmlFor={`kw-${rule.id}`}>
            Keywords
          </Label>
          <Input
            id={`kw-${rule.id}`}
            value={kw}
            disabled={busy}
            onChange={(e) => setKw(e.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!dirty || busy}
          onClick={() => {
            const keywords = kw
              .split(/[,;\n]/)
              .map((k) => k.trim())
              .filter(Boolean);
            onSaveKeywords(keywords);
          }}
        >
          Save keywords
        </Button>
      </div>
    </li>
  );
}
