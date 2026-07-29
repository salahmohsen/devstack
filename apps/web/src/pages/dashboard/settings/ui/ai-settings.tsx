"use client";

import { Link } from "@tanstack/react-router";
import { ChevronDownIcon, PlusIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AI_FEATURE_LABELS,
  AI_FEATURES,
  AI_PROVIDER_FEATURED,
  aiProviderLabel,
  defaultAiModels,
  getMastraProvider,
  MAIL_REPLY_AUTONOMY,
  MAIL_REPLY_AUTONOMY_LABELS,
  MASTRA_PROVIDER_CATALOG,
  toMastraModelId,
  type AiFeature,
  type AiModelsMap,
  type AiProviderKind,
  type AiProviderPublic,
  type MailReplyAutonomy
} from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger
} from "@tsu-stack/ui/components/collapsible";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from "@tsu-stack/ui/components/combobox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";
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
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useGetAiSettingsQuery, useUpdateAiSettingsMutation } from "@/features/ai-settings";

import { useSettingsDirtyGuard } from "./settings-dirty-guard";
import { SettingsSaveBar } from "./settings-save-bar";
import { SettingsSection } from "./settings-section";

type ProviderOption = { value: string; label: string };

type DraftProvider = {
  id?: string;
  kind: AiProviderKind;
  label: string;
  apiKey: string;
  hasApiKey: boolean;
  apiKeyLast4: string | null;
};

type FormState = {
  sourceKey: number;
  providers: DraftProvider[];
  models: AiModelsMap;
  autonomy: MailReplyAutonomy;
};

const FEATURED_SET = new Set<string>(AI_PROVIDER_FEATURED);

const PROVIDER_OPTIONS: ProviderOption[] = (() => {
  const featured = AI_PROVIDER_FEATURED.map((id) => {
    return {
      value: id,
      label: `${aiProviderLabel(id)} (${id})`
    };
  });
  const rest = MASTRA_PROVIDER_CATALOG.filter((p) => !FEATURED_SET.has(p.id)).map((p) => {
    return {
      value: p.id,
      label: `${p.name} (${p.id})`
    };
  });
  return [...featured, ...rest];
})();

function toDraftProviders(providers: AiProviderPublic[]): DraftProvider[] {
  return providers.map((p) => {
    return {
      id: p.id,
      kind: p.kind,
      label: p.label,
      apiKey: "",
      hasApiKey: p.hasApiKey,
      apiKeyLast4: p.apiKeyLast4
    };
  });
}

function formFromQuery(
  data: {
    providers: AiProviderPublic[];
    models: AiModelsMap;
    mailReplyAutonomy: MailReplyAutonomy;
  },
  sourceKey: number
): FormState {
  return {
    sourceKey,
    providers: toDraftProviders(data.providers),
    models: data.models,
    autonomy: data.mailReplyAutonomy
  };
}

function modelsForProviderKinds(kinds: string[]): ProviderOption[] {
  const seen = new Set<string>();
  const items: ProviderOption[] = [];
  for (const kind of kinds) {
    if (kind === "custom") continue;
    const entry = getMastraProvider(kind);
    if (!entry) continue;
    for (const model of entry.models) {
      const id = toMastraModelId(kind, model);
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({ value: id, label: id });
    }
  }
  return items;
}

function modelsEqual(a: AiModelsMap, b: AiModelsMap): boolean {
  return AI_FEATURES.every((f) => a[f] === b[f]);
}

function providersDirty(draft: DraftProvider[], server: AiProviderPublic[]): boolean {
  if (draft.length !== server.length) return true;
  return draft.some((p, i) => {
    const s = server[i];
    if (!s) return true;
    if (p.apiKey.trim()) return true;
    return p.id !== s.id || p.kind !== s.kind || p.label !== s.label;
  });
}

const FEATURE_GROUPS: { title: string; features: AiFeature[] }[] = [
  { title: "Mail", features: ["classify", "reply"] },
  { title: "Portfolio", features: ["resumeImport", "stacks"] },
  { title: "Assistant", features: ["hubChat", "scorer"] }
];

function ModelCombobox({
  value,
  options,
  onChange,
  id
}: {
  value: string;
  options: ProviderOption[];
  onChange: (next: string) => void;
  id?: string;
}) {
  return (
    <Combobox
      value={value || null}
      onValueChange={(val) => {
        if (val == null) return;
        onChange(val);
      }}
      items={options}
    >
      <ComboboxInput
        id={id}
        placeholder="provider/model"
        showClear={false}
        onChange={(e) => onChange(e.target.value)}
      />
      <ComboboxContent>
        <ComboboxEmpty>Type a full provider/model id.</ComboboxEmpty>
        <ComboboxList>
          {(item: ProviderOption) => (
            <ComboboxItem key={item.value} value={item.value}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function AiSettings() {
  const query = useGetAiSettingsQuery();
  const update = useUpdateAiSettingsMutation();
  const [draft, setDraft] = useState<FormState | null>(null);
  const [customizeModels, setCustomizeModels] = useState(false);

  const form = useMemo(() => {
    if (!query.data) return null;
    if (draft && draft.sourceKey === query.dataUpdatedAt) return draft;
    return formFromQuery(query.data, query.dataUpdatedAt);
  }, [query.data, query.dataUpdatedAt, draft]);

  const serverSnapshot = useMemo(() => {
    if (!query.data) return null;
    return formFromQuery(query.data, query.dataUpdatedAt);
  }, [query.data, query.dataUpdatedAt]);

  const dirty = useMemo(() => {
    if (!form || !serverSnapshot || !query.data) return false;
    if (form.autonomy !== serverSnapshot.autonomy) return true;
    if (!modelsEqual(form.models, serverSnapshot.models)) return true;
    return providersDirty(form.providers, query.data.providers);
  }, [form, serverSnapshot, query.data]);

  function ensureDraft(): FormState | null {
    if (!query.data) return null;
    if (draft && draft.sourceKey === query.dataUpdatedAt) return draft;
    const next = formFromQuery(query.data, query.dataUpdatedAt);
    setDraft(next);
    return next;
  }

  function patch(mutator: (current: FormState) => FormState) {
    const base = ensureDraft();
    if (!base) return;
    setDraft(mutator(base));
  }

  function discard() {
    setDraft(null);
  }

  const leaveGuard = useSettingsDirtyGuard(dirty, { onDiscard: discard });

  const modelOptions = useMemo(() => {
    const kinds = form?.providers.map((p) => p.kind).filter(Boolean) ?? [];
    return modelsForProviderKinds(
      kinds.length > 0 ? kinds : ["deepseek", "openai", "anthropic", "xai", "openrouter"]
    );
  }, [form?.providers]);

  const defaultModel = form?.models.reply ?? defaultAiModels().reply;
  const modelsUniform =
    form != null && AI_FEATURES.every((f) => form.models[f] === form.models.reply);

  async function handleSave() {
    const current = form;
    if (!current) return;
    try {
      await update.mutateAsync({
        replaceProviders: true,
        providers: current.providers.map((p) => {
          return {
            id: p.id,
            kind: p.kind,
            label: p.label.trim() || aiProviderLabel(p.kind),
            apiKey: p.apiKey.trim() || undefined
          };
        }),
        models: current.models,
        mailReplyAutonomy: current.autonomy
      });
      toast.success("AI settings saved");
      setDraft(null);
    } catch {
      toast.error("Could not save AI settings");
    }
  }

  function addProvider() {
    patch((current) => {
      return {
        ...current,
        providers: [
          ...current.providers,
          {
            kind: "deepseek",
            label: aiProviderLabel("deepseek"),
            apiKey: "",
            hasApiKey: false,
            apiKeyLast4: null
          }
        ]
      };
    });
  }

  function setDefaultModel(modelId: string) {
    patch((current) => {
      const models = { ...current.models };
      for (const f of AI_FEATURES) models[f] = modelId;
      return { ...current, models };
    });
  }

  if (query.isError) {
    return (
      <Frame>
        <FrameHeader>
          <FrameTitle>AI</FrameTitle>
          <FrameDescription>Could not load AI settings.</FrameDescription>
        </FrameHeader>
        <FramePanel>
          <Alert variant="error">
            <AlertTitle>Failed to load</AlertTitle>
            <AlertDescription>Refresh the page or try again later.</AlertDescription>
          </Alert>
        </FramePanel>
      </Frame>
    );
  }

  const isBusy = query.isLoading || !form;

  return (
    <>
      <Frame>
        <FrameHeader>
          <FrameTitle>AI</FrameTitle>
          <FrameDescription>
            Connect providers and control how AI acts on mail. Auto-send lives here, not under
            Notifications.
          </FrameDescription>
        </FrameHeader>

        <FramePanel className="space-y-8">
          {isBusy || !form ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading…
            </div>
          ) : (
            <>
              <SettingsSection
                title="Mail reply autonomy"
                description="Assist always generates a draft and waits for confirm in Review. Full auto-sends after generation when job context is present."
              >
                <Select
                  value={form.autonomy}
                  onValueChange={(value) => {
                    if (!value) return;
                    patch((current) => {
                      return {
                        ...current,
                        autonomy: value as MailReplyAutonomy
                      };
                    });
                  }}
                  itemToStringLabel={(value) =>
                    MAIL_REPLY_AUTONOMY_LABELS[value as MailReplyAutonomy] ?? String(value)
                  }
                >
                  <SelectTrigger className="max-w-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectList>
                      {MAIL_REPLY_AUTONOMY.map((value) => (
                        <SelectItem key={value} value={value}>
                          {MAIL_REPLY_AUTONOMY_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectList>
                  </SelectPopup>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Where alerts go:{" "}
                  <Link
                    to="/dashboard/settings/notifications"
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    Notifications
                  </Link>
                </p>
              </SettingsSection>

              <SettingsSection
                title="Providers"
                description="API keys for models you run. Saved keys are stored encrypted; only the last four characters are shown."
                action={
                  form.providers.length > 0 ? (
                    <Button type="button" size="sm" variant="outline" onClick={addProvider}>
                      <PlusIcon className="size-3.5" />
                      Add provider
                    </Button>
                  ) : null
                }
              >
                {form.providers.length === 0 ? (
                  <Empty className="rounded-xl border border-dashed py-10 md:py-12">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SparklesIcon />
                      </EmptyMedia>
                      <EmptyTitle>No providers yet</EmptyTitle>
                      <EmptyDescription>
                        Add a provider (DeepSeek, OpenAI, OpenRouter, …) with an API key to run
                        classify, reply, and other AI features.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button type="button" size="sm" onClick={addProvider}>
                        <PlusIcon className="size-3.5" />
                        Add provider
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <ul className="space-y-3">
                    {form.providers.map((p, index) => {
                      const catalog = getMastraProvider(p.kind);
                      return (
                        <li
                          key={p.id ?? `new-${index}`}
                          className="grid gap-2 rounded-xl border border-border/80 p-3 sm:grid-cols-[minmax(10rem,1fr)_1fr_1fr_auto]"
                        >
                          <div className="space-y-1">
                            <Label className="text-xs">Provider</Label>
                            <Combobox
                              value={p.kind || null}
                              onValueChange={(val) => {
                                if (!val) return;
                                const kind = val as AiProviderKind;
                                patch((current) => {
                                  return {
                                    ...current,
                                    providers: current.providers.map((row, i) =>
                                      i === index
                                        ? { ...row, kind, label: aiProviderLabel(kind) }
                                        : row
                                    )
                                  };
                                });
                              }}
                              items={PROVIDER_OPTIONS}
                            >
                              <ComboboxInput placeholder="Search providers…" showClear={false} />
                              <ComboboxContent>
                                <ComboboxEmpty>No provider found.</ComboboxEmpty>
                                <ComboboxList>
                                  {(item: ProviderOption) => (
                                    <ComboboxItem key={item.value} value={item.value}>
                                      {item.label}
                                    </ComboboxItem>
                                  )}
                                </ComboboxList>
                              </ComboboxContent>
                            </Combobox>
                            {catalog ? (
                              <p className="text-xs text-muted-foreground">
                                {catalog.models.length} models in catalog
                              </p>
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Label</Label>
                            <Input
                              value={p.label}
                              onChange={(e) =>
                                patch((current) => {
                                  return {
                                    ...current,
                                    providers: current.providers.map((row, i) =>
                                      i === index ? { ...row, label: e.target.value } : row
                                    )
                                  };
                                })
                              }
                              placeholder="Display name"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              API key
                              {p.hasApiKey && p.apiKeyLast4 ? ` (saved ···${p.apiKeyLast4})` : ""}
                            </Label>
                            <Input
                              type="password"
                              autoComplete="off"
                              value={p.apiKey}
                              onChange={(e) =>
                                patch((current) => {
                                  return {
                                    ...current,
                                    providers: current.providers.map((row, i) =>
                                      i === index ? { ...row, apiKey: e.target.value } : row
                                    )
                                  };
                                })
                              }
                              placeholder={p.hasApiKey ? "Leave blank to keep" : "API key"}
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Remove provider"
                              onClick={() =>
                                patch((current) => {
                                  return {
                                    ...current,
                                    providers: current.providers.filter((_, i) => i !== index)
                                  };
                                })
                              }
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SettingsSection>

              <SettingsSection
                title="Models"
                description="Default model applies to all features. Customize per feature only when you need different quality or cost tradeoffs."
              >
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="ai-default-model">
                    Default model
                  </Label>
                  <ModelCombobox
                    id="ai-default-model"
                    value={defaultModel}
                    options={modelOptions}
                    onChange={setDefaultModel}
                  />
                  {!modelsUniform ? (
                    <p className="text-xs text-muted-foreground">
                      Some features use different models. Open customize to review.
                    </p>
                  ) : null}
                </div>

                <Collapsible open={customizeModels} onOpenChange={setCustomizeModels}>
                  <CollapsibleTrigger
                    className={cn(
                      "flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    )}
                  >
                    <ChevronDownIcon
                      className={cn(
                        "size-3.5 transition-transform",
                        customizeModels && "rotate-180"
                      )}
                    />
                    Customize per feature
                  </CollapsibleTrigger>
                  <CollapsiblePanel className="mt-3 space-y-6">
                    {FEATURE_GROUPS.map((group) => (
                      <div key={group.title} className="space-y-3">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          {group.title}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {group.features.map((feature) => (
                            <div key={feature} className="space-y-1">
                              <Label className="text-xs">{AI_FEATURE_LABELS[feature]}</Label>
                              <ModelCombobox
                                value={form.models[feature]}
                                options={modelOptions}
                                onChange={(next) =>
                                  patch((current) => {
                                    return {
                                      ...current,
                                      models: { ...current.models, [feature]: next }
                                    };
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CollapsiblePanel>
                </Collapsible>
              </SettingsSection>

              <SettingsSaveBar
                dirty={dirty}
                saving={update.isPending}
                onSave={() => void handleSave()}
                onDiscard={discard}
                saveLabel="Save AI settings"
              />
            </>
          )}
        </FramePanel>
      </Frame>
      {leaveGuard.alertDialog}
    </>
  );
}
